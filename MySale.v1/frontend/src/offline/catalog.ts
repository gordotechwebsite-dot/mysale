import type { Product, Family, SubFamily, Location } from '../types';
import { getProducts, getFamilies, getSubFamilies, getLocations } from '../api';
import { getDB } from './db';

const saveProducts = async (locationId: number, items: Product[]): Promise<void> => {
  const db = await getDB();
  await db.put('products', { locationId, items, updatedAt: Date.now() });
};

const readProducts = async (locationId: number): Promise<Product[] | null> => {
  const db = await getDB();
  const record = await db.get('products', locationId);
  return record ? record.items : null;
};

const saveCollection = async (name: string, items: unknown[]): Promise<void> => {
  const db = await getDB();
  await db.put('collections', { name, items, updatedAt: Date.now() });
};

const readCollection = async <T>(name: string): Promise<T[] | null> => {
  const db = await getDB();
  const record = await db.get('collections', name);
  return record ? (record.items as T[]) : null;
};

/**
 * Network-first: fetch products from the API and cache them for offline use.
 * If the network is unavailable, fall back to the last cached catalog.
 */
export const cachedGetProducts = async (locationId?: number): Promise<Product[]> => {
  const cacheKey = locationId ?? -1;
  try {
    const data = await getProducts({ location_id: locationId });
    await saveProducts(cacheKey, data);
    return data;
  } catch (error) {
    const cached = await readProducts(cacheKey);
    if (cached) return cached;
    throw error;
  }
};

export const cachedGetFamilies = async (): Promise<Family[]> => {
  try {
    const data = await getFamilies();
    await saveCollection('families', data);
    return data;
  } catch (error) {
    const cached = await readCollection<Family>('families');
    if (cached) return cached;
    throw error;
  }
};

export const cachedGetSubFamilies = async (): Promise<SubFamily[]> => {
  try {
    const data = await getSubFamilies();
    await saveCollection('subfamilies', data);
    return data;
  } catch (error) {
    const cached = await readCollection<SubFamily>('subfamilies');
    if (cached) return cached;
    throw error;
  }
};

export const cachedGetLocations = async (): Promise<Location[]> => {
  try {
    const data = await getLocations();
    await saveCollection('locations', data);
    return data;
  } catch (error) {
    const cached = await readCollection<Location>('locations');
    if (cached) return cached;
    throw error;
  }
};

export const isCatalogCached = async (locationId: number): Promise<boolean> => {
  const cached = await readProducts(locationId);
  return cached !== null && cached.length > 0;
};
