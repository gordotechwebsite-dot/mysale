import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Product, Sale } from '../types';

export type OfflineSalePayload = {
  payment_method: 'cash' | 'card' | 'transfer';
  items: { product_id: number; quantity: number; discount?: number; notes?: string }[];
  amount_received?: number;
  notes?: string;
  location_id?: number;
  client_uuid: string;
  client_created_at?: string;
};

export interface PendingSale {
  client_uuid: string;
  payload: OfflineSalePayload;
  receipt: Sale;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

export interface OfflineDB extends DBSchema {
  products: {
    key: number;
    value: { locationId: number; items: Product[]; updatedAt: number };
  };
  collections: {
    key: string;
    value: { name: string; items: unknown[]; updatedAt: number };
  };
  pendingSales: {
    key: string;
    value: PendingSale;
    indexes: { 'by-createdAt': number };
  };
}

const DB_NAME = 'mysale-offline';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export const getDB = (): Promise<IDBPDatabase<OfflineDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'locationId' });
        }
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'name' });
        }
        if (!db.objectStoreNames.contains('pendingSales')) {
          const store = db.createObjectStore('pendingSales', { keyPath: 'client_uuid' });
          store.createIndex('by-createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
};
