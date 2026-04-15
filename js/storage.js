const STORAGE_KEY = 'flextracker_data';

export const Storage = {
  save: (columns, data) => {
    const payload = { columns, data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  },

  load: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      console.log(raw)
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};