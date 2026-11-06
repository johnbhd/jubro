import { Storage } from '../storage/storage.js';
import { authService } from '../auth/firebaseAuth.js';
import { firebaseTrackerSync } from '../storage/firebaseTrackerSync.js';

const TITLE_SYNC_DELAY_MS = 300;

export function resolveTrackerTarget(state, search = '') {
  const data = state?.data && typeof state.data === 'object'
    ? state.data
    : {};
  let params;

  try {
    params = new URLSearchParams(search || '');
  } catch (error) {
    return {
      status: 'invalid',
      key: null,
    };
  }

  if (params.has('tracker')) {
    const requestedId = params.get('tracker');

    if (!requestedId || !requestedId.trim()) {
      return {
        status: 'invalid',
        key: null,
      };
    }

    if (Object.prototype.hasOwnProperty.call(data, requestedId)) {
      return {
        status: 'valid',
        key: requestedId,
      };
    }

    const matchingKey = Object.keys(data).find((key) => (
      data[key]?.id === requestedId
    ));

    return {
      status: matchingKey ? 'valid' : 'invalid',
      key: matchingKey || null,
    };
  }

  const activeKey = state?.active && (
    Object.prototype.hasOwnProperty.call(data, state.active)
      ? state.active
      : Object.keys(data).find((key) => data[key]?.id === state.active)
  );
  const firstKey = Object.keys(data)[0] || null;

  return {
    status: activeKey || firstKey ? 'missing' : 'empty',
    key: activeKey || firstKey,
  };
}

export const trackerStateMethods = {
generateId() {
    return 'trk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  },

initializeState() {
    let state = Storage.load();

    if (!Storage.exists()) {
      return state;
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

getTrackerTargetFromURL() {
    const search = typeof window === 'undefined'
      ? ''
      : window.location?.search || '';

    return resolveTrackerTarget(this.state, search);
  },

applyTrackerRoute() {
    const route = this.getTrackerTargetFromURL();

    if (route.key) {
      this.state.active = route.key;
    }

    return route;
  },

ensureCanonicalTrackerURL(trackerKey) {
    if (
      !trackerKey
      || typeof window === 'undefined'
      || !window.history?.replaceState
    ) {
      return;
    }

    const params = new URLSearchParams(window.location?.search || '');

    if (params.has('tracker') && params.get('tracker') === trackerKey) {
      return;
    }

    params.set('tracker', trackerKey);
    const query = params.toString();
    const pathname = window.location?.pathname || '';
    const hash = window.location?.hash || '';
    const path = `${pathname}${query ? `?${query}` : ''}${hash}`;

    window.history.replaceState({}, '', path);
  },

redirectToTrackers() {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }

    window.location.href = window.location.pathname.includes('/pages/')
      ? './tracker.html'
      : '/trackers';
  },

reloadStateFromStorage() {
    this.state = this.initializeState();
    const route = this.applyTrackerRoute();

    if (route.status === 'invalid' || !route.key) {
      this.redirectToTrackers();
      return;
    }

    this.ensureCanonicalTrackerURL(route.key);
    this.refresh({ persist: false });
  },

save({ sync = true } = {}) {
    if (!Storage.save(this.state)) {
      return false;
    }

    if (!sync) {
      return true;
    }

    this.cancelScheduledTitleSync();
    return this.syncLocalStateToFirebase();
  },

scheduleTitleSync() {
    if (this.titleSyncTimer) {
      clearTimeout(this.titleSyncTimer);
    }

    this.titleSyncTimer = setTimeout(() => {
      this.titleSyncTimer = null;
      this.syncLocalStateToFirebase();
    }, TITLE_SYNC_DELAY_MS);
  },

cancelScheduledTitleSync() {
    if (!this.titleSyncTimer) return;

    clearTimeout(this.titleSyncTimer);
    this.titleSyncTimer = null;
  },

flushScheduledTitleSync() {
    if (!this.titleSyncTimer) {
      return Promise.resolve();
    }

    this.cancelScheduledTitleSync();
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
