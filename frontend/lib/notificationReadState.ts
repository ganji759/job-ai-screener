const READ_STORAGE_KEY = "umurava_locally_read_notifications";
const UNREAD_STORAGE_KEY = "umurava_locally_unread_notifications";

const emitReadStateChanged = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("notifications:local-read-updated"));
};

const getStoredSet = (key: string): Set<string> => {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  } catch {
    return new Set<string>();
  }
};

export const getLocalReadIds = (): Set<string> => getStoredSet(READ_STORAGE_KEY);
export const getLocalUnreadIds = (): Set<string> => getStoredSet(UNREAD_STORAGE_KEY);

const saveSet = (key: string, ids: Set<string>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify([...ids]));
  emitReadStateChanged();
};

export const markNotificationReadLocally = (id: string) => {
  const readSet = getLocalReadIds();
  const unreadSet = getLocalUnreadIds();
  readSet.add(id);
  unreadSet.delete(id);
  saveSet(READ_STORAGE_KEY, readSet);
  saveSet(UNREAD_STORAGE_KEY, unreadSet);
};

export const markNotificationUnreadLocally = (id: string) => {
  const readSet = getLocalReadIds();
  const unreadSet = getLocalUnreadIds();
  readSet.delete(id);
  unreadSet.add(id);
  saveSet(READ_STORAGE_KEY, readSet);
  saveSet(UNREAD_STORAGE_KEY, unreadSet);
};

export const removeNotificationLocalState = (id: string) => {
  const readSet = getLocalReadIds();
  const unreadSet = getLocalUnreadIds();
  readSet.delete(id);
  unreadSet.delete(id);
  saveSet(READ_STORAGE_KEY, readSet);
  saveSet(UNREAD_STORAGE_KEY, unreadSet);
};

export const markNotificationsReadLocally = (ids: string[]) => {
  const readSet = getLocalReadIds();
  const unreadSet = getLocalUnreadIds();
  ids.forEach((id) => {
    readSet.add(id);
    unreadSet.delete(id);
  });
  saveSet(READ_STORAGE_KEY, readSet);
  saveSet(UNREAD_STORAGE_KEY, unreadSet);
};

export const isNotificationUnread = (id: string, serverReadAt?: string | null): boolean => {
  const readSet = getLocalReadIds();
  const unreadSet = getLocalUnreadIds();
  if (unreadSet.has(id)) return true;
  if (readSet.has(id)) return false;
  return !serverReadAt;
};

export const clearAllLocalNotificationState = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(READ_STORAGE_KEY);
  window.localStorage.removeItem(UNREAD_STORAGE_KEY);
  emitReadStateChanged();
};

export const subscribeLocalReadUpdates = (handler: () => void): (() => void) => {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === READ_STORAGE_KEY || event.key === UNREAD_STORAGE_KEY) handler();
  };
  const onCustom = () => handler();
  window.addEventListener("storage", onStorage);
  window.addEventListener("notifications:local-read-updated", onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("notifications:local-read-updated", onCustom);
  };
};
