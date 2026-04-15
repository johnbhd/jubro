const STORAGE_KEY = 'flextracker_data';

export const Storage = {
  save: (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  load: () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
      console.log(raw);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
};