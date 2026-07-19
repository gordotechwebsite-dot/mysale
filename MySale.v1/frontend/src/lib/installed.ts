const CLIENT_ID_KEY = 'mysale_client_id';

export const isInstalledApp = (): boolean => {
  const standaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
};

export const getStoredClientId = (): string | null => localStorage.getItem(CLIENT_ID_KEY);

export const storeClientId = (id: string): void => localStorage.setItem(CLIENT_ID_KEY, id);

export const clearClientId = (): void => localStorage.removeItem(CLIENT_ID_KEY);
