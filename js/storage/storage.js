const STORAGE_KEY = 'flextracker_data';

export const Storage = {
  save: (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  load: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { active: null, data: {} };

      const parsed = JSON.parse(raw);

      // safety fallback
      if (!parsed.data) {
        return { active: null, data: {} };
      }

      return parsed;
    } catch (err) {
      console.error("Storage load error:", err);
      return { active: null, data: {} };
    }
  }
};