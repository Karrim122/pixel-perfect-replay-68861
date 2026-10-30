import type { GameState } from "./system";

const DB_NAME = "sl-system-backup";
const STORE_NAME = "settings";
const HANDLE_KEY = "daily-backup-file";

type BackupWritable = {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
};

type BackupFileHandle = {
  createWritable: () => Promise<BackupWritable>;
  queryPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};

type BackupPickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<BackupFileHandle>;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function openDatabase() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function getFileHandle() {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDatabase();
  return new Promise<BackupFileHandle | null>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY) as IDBRequest<BackupFileHandle | undefined>;
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function saveFileHandle(handle: BackupFileHandle) {
  const db = await openDatabase();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function writeBackup(handle: BackupFileHandle, state: GameState) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify({ format: "solo-leveling-backup", version: 1, savedAt: new Date().toISOString(), state }, null, 2));
  await writable.close();
}

export function hasDailyBackupSupport() {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined" && typeof (window as BackupPickerWindow).showSaveFilePicker === "function";
}

export async function hasDailyBackupFile() {
  try {
    const handle = await getFileHandle();
    return Boolean(handle && await handle.queryPermission({ mode: "readwrite" }) === "granted");
  } catch {
    return false;
  }
}

export async function chooseDailyBackupFile(state: GameState) {
  const existingHandle = await getFileHandle();
  if (existingHandle) {
    let existingPermission = await existingHandle.queryPermission({ mode: "readwrite" });
    if (existingPermission !== "granted") existingPermission = await existingHandle.requestPermission({ mode: "readwrite" });
    if (existingPermission === "granted") {
      await writeBackup(existingHandle, state);
      return;
    }
  }
  const picker = (window as BackupPickerWindow).showSaveFilePicker;
  if (!picker || typeof indexedDB === "undefined") throw new Error("Automatic file backups are not supported in this browser.");
  const handle = await (window as BackupPickerWindow).showSaveFilePicker!({
    suggestedName: "solo-leveling-backup.json",
    types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
  });
  let permission = await handle.queryPermission({ mode: "readwrite" });
  if (permission !== "granted") permission = await handle.requestPermission({ mode: "readwrite" });
  if (permission !== "granted") throw new Error("Permission to update the backup file was not granted.");
  await writeBackup(handle, state);
  await saveFileHandle(handle);
}

export function updateDailyBackup(state: GameState) {
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    try {
      const handle = await getFileHandle();
      if (!handle || await handle.queryPermission({ mode: "readwrite" }) !== "granted") return;
      await writeBackup(handle, state);
    } catch {
      // Local storage remains the primary save if the backup file is unavailable.
    }
  });
  return writeQueue;
}

export function downloadBackup(state: GameState) {
  const contents = JSON.stringify({ format: "solo-leveling-backup", version: 1, savedAt: new Date().toISOString(), state }, null, 2);
  const blobUrl = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `solo-leveling-backup-${state.lastDay}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
