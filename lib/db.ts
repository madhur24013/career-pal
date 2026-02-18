export interface DBImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

const DB_NAME = 'CareerPal_v1';
const STORE_NAME = 'portfolio_images';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveImage = async (image: DBImage) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Enforce capacity limit (e.g., 20 images)
  const countRequest = store.count();
  countRequest.onsuccess = () => {
    if (countRequest.result >= 20) {
      const cursorRequest = store.openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) store.delete(cursor.key);
      };
    }
  };

  store.put(image);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve(true);
  });
};

export const getImages = async (): Promise<DBImage[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => {
      const results = request.result || [];
      resolve(results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
    };
  });
};

export const deleteImage = async (id: string) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
};

export const clearImages = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
};

export const nukeDatabase = async () => {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve(true);
    request.onerror = () => resolve(false);
  });
};