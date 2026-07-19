import type { AxiosError } from 'axios';
import type { CartItem, Sale } from '../types';
import { createSale } from '../api';
import { getDB, type OfflineSalePayload, type PendingSale } from './db';

export interface SubmitSaleInput {
  payment_method: 'cash' | 'card' | 'transfer';
  lines: CartItem[];
  amount_received?: number;
  notes?: string;
  location_id: number;
  location_name?: string;
}

export interface SubmitSaleResult {
  sale: Sale;
  offline: boolean;
}

const genUuid = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `off-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Official Colombia wall-clock time as a naive datetime string
 * (YYYY-MM-DDTHH:mm:ss), independent of the device timezone. Matches the
 * backend's now_colombia() convention so offline sales keep the right hour.
 */
const nowColombiaNaive = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
};

const buildPayload = (input: SubmitSaleInput, clientUuid: string): OfflineSalePayload => ({
  payment_method: input.payment_method,
  items: input.lines.map((line) => ({
    product_id: line.product.id,
    quantity: line.quantity,
    discount: line.discount,
    notes: line.notes || undefined,
  })),
  amount_received: input.amount_received,
  notes: input.notes,
  location_id: input.location_id,
  client_uuid: clientUuid,
});

/**
 * Build a synthetic Sale so the receipt can be shown immediately for an offline
 * sale. Totals are computed from cached product prices; the server recomputes
 * authoritatively when the sale syncs.
 */
const buildReceipt = (input: SubmitSaleInput, clientUuid: string, createdAt: string): Sale => {
  let subtotal = 0;
  let discount = 0;
  const items = input.lines.map((line) => {
    const lineSubtotal = line.product.sale_price * line.quantity;
    subtotal += lineSubtotal;
    discount += line.discount;
    return {
      product_id: line.product.id,
      product_name: line.product.name,
      product_code: line.product.code,
      quantity: line.quantity,
      unit_price: line.product.sale_price,
      discount: line.discount,
      subtotal: lineSubtotal - line.discount,
      notes: line.notes || null,
    };
  });
  const total = subtotal - discount;
  const changeGiven =
    input.payment_method === 'cash' && input.amount_received != null
      ? input.amount_received - total
      : null;

  return {
    id: -1,
    folio: `OFFLINE-${clientUuid.slice(0, 6).toUpperCase()}`,
    client_uuid: clientUuid,
    location_id: input.location_id,
    location_name: input.location_name,
    shift_id: -1,
    cashier_id: -1,
    subtotal,
    tax: 0,
    discount,
    total,
    payment_method: input.payment_method,
    amount_received: input.amount_received ?? null,
    change_given: changeGiven,
    notes: input.notes ?? null,
    created_at: createdAt,
    items,
  };
};

const isNetworkError = (error: unknown): boolean => {
  const axiosError = error as AxiosError;
  // No response means the request never reached the server (offline / timeout).
  return !!axiosError && axiosError.isAxiosError === true && !axiosError.response;
};

export const PENDING_CHANGED_EVENT = 'mysale-pending-sales-changed';

const notifyPendingChanged = (): void => {
  window.dispatchEvent(new Event(PENDING_CHANGED_EVENT));
};

const savePending = async (pending: PendingSale): Promise<void> => {
  const db = await getDB();
  await db.put('pendingSales', pending);
  notifyPendingChanged();
};

export const getPendingCount = async (): Promise<number> => {
  const db = await getDB();
  return db.count('pendingSales');
};

export const getPendingSales = async (): Promise<PendingSale[]> => {
  const db = await getDB();
  return db.getAllFromIndex('pendingSales', 'by-createdAt');
};

/**
 * Register a sale. If online, send it to the server directly (still carrying a
 * client_uuid so retries are idempotent). If the network is unavailable, store
 * it locally and return a synthetic receipt; it will sync later.
 */
export const submitSale = async (input: SubmitSaleInput): Promise<SubmitSaleResult> => {
  const clientUuid = genUuid();
  const payload = buildPayload(input, clientUuid);

  if (navigator.onLine) {
    try {
      // Online sales let the server stamp the time (now_colombia).
      const sale = await createSale(payload);
      return { sale, offline: false };
    } catch (error) {
      if (!isNetworkError(error)) {
        throw error;
      }
      // Fell offline mid-request: fall through to local storage.
    }
  }

  // Offline: preserve the real Colombia time of the sale so it stays correct
  // once it syncs.
  const createdAt = nowColombiaNaive();
  const offlinePayload: OfflineSalePayload = { ...payload, client_created_at: createdAt };
  const receipt = buildReceipt(input, clientUuid, createdAt);
  await savePending({ client_uuid: clientUuid, payload: offlinePayload, receipt, createdAt: Date.now(), attempts: 0 });
  return { sale: receipt, offline: true };
};

let syncing = false;

/**
 * Drain the pending-sales queue. Each sale is posted with its client_uuid so
 * the server deduplicates. A sale is only removed after the server confirms;
 * on a network error we stop and keep everything for the next attempt.
 */
export const syncPendingSales = async (): Promise<number> => {
  if (syncing || !navigator.onLine) return 0;
  syncing = true;
  let synced = 0;
  try {
    const pending = await getPendingSales();
    for (const item of pending) {
      try {
        await createSale(item.payload);
        const db = await getDB();
        await db.delete('pendingSales', item.client_uuid);
        synced += 1;
        notifyPendingChanged();
      } catch (error) {
        if (isNetworkError(error)) {
          break;
        }
        const axiosError = error as AxiosError<{ detail?: string }>;
        item.attempts += 1;
        item.lastError = axiosError.response?.data?.detail || 'Error al sincronizar';
        await savePending(item);
      }
    }
  } finally {
    syncing = false;
  }
  return synced;
};
