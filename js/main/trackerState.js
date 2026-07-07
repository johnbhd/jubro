import { Storage } from '../storage/storage.js';
import { authService } from '../auth/firebaseAuth.js';
import { firebaseTrackerSync } from '../storage/firebaseTrackerSync.js';
import { createDefaultTracker } from '../tracker/defaultTracker.js';

export const trackerStateMethods = {
generateId() {
    return 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  },

initializeState() {
    let state = Storage.load();
  
   if (!Storage.exists()) {
      const defaultId = this.generateId();
    
      return {
        active: defaultId,
        data: {
          [defaultId]: createDefaultTracker(defaultId)
        }
      };
    }
  
    if (state.columns && state.data) {
        const defaultId = this.generateId();
      
        const normalizedRows = state.data.map(row =>
          row.map(cell => ({
            value: cell,
            type: 'text'
          }))
        );
      
        return {
          active: defaultId,
          data: {
            [defaultId]: {
              id: defaultId,
              title: "Untitled",
              columns: state.columns,
              rows: normalizedRows
            }
          }
        };
      }
  
    Object.keys(state.data || {}).forEach(key => {
      if (!state.data[key].id) {
        state.data[key].id = key;
      }
    });

    const urlTracker = this.getTrackerFromURL();

    if (urlTracker && state.data) {
      const trackerKey = state.data[urlTracker]
        ? urlTracker
        : Object.keys(state.data).find(key => state.data[key]?.id === urlTracker);

      if (trackerKey) {
        state.active = trackerKey;
      }
    }
  
    return state;
  },

getTracker() {
    if (!this.state?.data) return null;

    if (this.state.data[this.state.active]) {
      return this.state.data[this.state.active];
    }

    const trackerKey = Object.keys(this.state.data).find(key => (
      this.state.data[key]?.id === this.state.active
    ));

    return trackerKey ? this.state.data[trackerKey] : null;
  },

getActiveTrackerKey() {
    if (!this.state?.data) return null;

    if (this.state.data[this.state.active]) {
      return this.state.active;
    }

    return Object.keys(this.state.data).find(key => (
      this.state.data[key]?.id === this.state.active
    )) || null;
  },

getTrackerFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tracker');
  },

reloadStateFromStorage() {
    this.state = this.initializeState();

    if (!this.getTracker()) {
      return;
    }

    this.refresh({ persist: false });
  },

save() {
    Storage.save(this.state);
    return this.syncLocalStateToFirebase();
  },

syncLocalStateToFirebase() {
    const user = authService.getCurrentUser();

    if (!user) return Promise.resolve();

    return firebaseTrackerSync.syncCurrentLocalState(user).catch((err) => {
      console.error("Tracker Firebase sync error:", err);
    });
  }
};
