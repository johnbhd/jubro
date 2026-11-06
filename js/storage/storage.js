import { normalizeLegacyWorkspaceState } from '../services/trackerData.js';

export const STORAGE_KEY = 'flextracker_data';
export const ACCOUNT_STORAGE_PREFIX = 'flextracker_data_account_';

const GUEST_OWNER = {
  ownerType: 'guest',
  ownerId: null,
};

let currentOwner = { ...GUEST_OWNER };
let loadedRevision = 0;

function emptyState(owner = currentOwner, revision = 0) {
  return {
    active: null,
    data: {},
    ownerType: owner.ownerType,
    ownerId: owner.ownerId,
    revision,
  };
}

function workspaceKey(owner = currentOwner) {
  if (owner.ownerType === 'guest') return STORAGE_KEY;

  return `${ACCOUNT_STORAGE_PREFIX}${encodeURIComponent(owner.ownerId)}`;
}

function validRevision(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function ownersMatch(state, owner) {
  if (!state.ownerType) return true;

  return state.ownerType === owner.ownerType
    && (state.ownerId ?? null) === owner.ownerId;
}

function normalizeState(state, owner, revision = state?.revision) {
  return {
    ...state,
    active: state?.active || null,
    data: state?.data && typeof state.data === 'object' ? state.data : {},
    ownerType: owner.ownerType,
    ownerId: owner.ownerId,
    revision: validRevision(revision),
  };
}

function readWorkspace(owner = currentOwner) {
  const key = workspaceKey(owner);
  const raw = localStorage.getItem(key);

  if (!raw) {
    return {
      key,
      state: emptyState(owner),
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || !parsed.data || typeof parsed.data !== 'object') {
      return { key, state: null };
    }

    if (!ownersMatch(parsed, owner)) {
      return { key, state: null };
    }

    const normalizedParsed = normalizeLegacyWorkspaceState(parsed);
    const legacyUnowned = owner.ownerType === 'guest'
      && (!normalizedParsed.ownerType || normalizedParsed.legacyUnowned === true);

    return {
      key,
      state: normalizeState({
        ...normalizedParsed,
        ...(legacyUnowned ? { legacyUnowned: true } : {}),
      }, owner),
    };
  } catch (error) {
    console.error('Storage load error:', error);
    return { key, state: null };
  }
}

function createDetailEvent(name, detail) {
  if (typeof CustomEvent === 'function') {
    return new CustomEvent(name, { detail });
  }

  const event = new Event(name);
  Object.defineProperty(event, 'detail', { value: detail });
  return event;
}

function dispatchStorageEvent(name, detail) {
  const target = typeof document !== 'undefined' ? document : window;
  target?.dispatchEvent(createDetailEvent(name, detail));
}

function rejectSave(reason, currentRevision) {
  dispatchStorageEvent('jubro:storage-conflict', {
    reason,
    ownerType: currentOwner.ownerType,
    ownerId: currentOwner.ownerId,
    loadedRevision,
    currentRevision,
  });

  return false;
}

function persist(state, { expectedRevision = state?.revision } = {}) {
  if (!state || typeof state !== 'object' || !state.data || typeof state.data !== 'object') {
    return false;
  }

  if (!ownersMatch(state, currentOwner)) {
    return rejectSave('owner-mismatch', loadedRevision);
  }

  const current = readWorkspace();

  if (!current.state) {
    return rejectSave('invalid-storage', loadedRevision);
  }

  const currentRevision = current.state.revision;
  expectedRevision = validRevision(expectedRevision);

  if (expectedRevision !== currentRevision) {
    return rejectSave('stale-revision', currentRevision);
  }

  const nextRevision = Math.max(currentRevision, expectedRevision) + 1;
  const nextState = normalizeState(state, currentOwner, nextRevision);

  localStorage.setItem(current.key, JSON.stringify(nextState));
  Object.assign(state, {
    ownerType: nextState.ownerType,
    ownerId: nextState.ownerId,
    revision: nextRevision,
  });
  loadedRevision = nextRevision;

  return true;
}

export const Storage = {
  save(state) {
    return persist(state);
  },

  replace(state, expectedRevision = loadedRevision) {
    return persist(state, { expectedRevision });
  },

  exists() {
    return localStorage.getItem(workspaceKey()) !== null;
  },

  load() {
    const { state } = readWorkspace();
    const loadedState = state || emptyState();

    loadedRevision = loadedState.revision;
    return loadedState;
  },

  loadGuest() {
    const { state } = readWorkspace(GUEST_OWNER);
    return state || emptyState(GUEST_OWNER);
  },

  useGuestWorkspace() {
    currentOwner = { ...GUEST_OWNER };
    return this.load();
  },

  useAccountWorkspace(userId) {
    if (!userId) {
      throw new Error('A Firebase UID is required for an account workspace.');
    }

    currentOwner = {
      ownerType: 'account',
      ownerId: userId,
    };

    return this.load();
  },

  getCurrentOwner() {
    return { ...currentOwner };
  },

  clearGuestAfterTransfer(expectedRevision) {
    const current = readWorkspace(GUEST_OWNER);

    if (!current.state || current.state.revision !== expectedRevision) {
      return false;
    }

    const nextState = emptyState(GUEST_OWNER, expectedRevision + 1);
    localStorage.setItem(current.key, JSON.stringify(nextState));
    return true;
  },

  updateCloudRevision(cloudRevision, expectedCloudRevision = 0) {
    const nextCloudRevision = validRevision(cloudRevision);
    const expectedRevision = validRevision(expectedCloudRevision);
    const current = readWorkspace();

    if (!current.state || !ownersMatch(current.state, currentOwner)) {
      return false;
    }

    const currentCloudRevision = validRevision(current.state.cloudRevision);

    if (currentCloudRevision === nextCloudRevision || currentCloudRevision > nextCloudRevision) {
      return true;
    }

    if (currentCloudRevision !== expectedRevision || nextCloudRevision < expectedRevision) {
      return false;
    }

    const nextState = normalizeState({
      ...current.state,
      cloudRevision: nextCloudRevision,
    }, currentOwner, current.state.revision);

    localStorage.setItem(current.key, JSON.stringify(nextState));
    loadedRevision = nextState.revision;
    return true;
  },

  removeAccountWorkspace(userId) {
    if (!userId) return;

    localStorage.removeItem(workspaceKey({
      ownerType: 'account',
      ownerId: userId,
    }));

    if (currentOwner.ownerType === 'account' && currentOwner.ownerId === userId) {
      this.useGuestWorkspace();
    }
  },
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== workspaceKey() || !event.newValue) return;

    let changedState;

    try {
      changedState = JSON.parse(event.newValue);
    } catch (error) {
      return;
    }

    if (!ownersMatch(changedState, currentOwner)) return;

    const currentRevision = validRevision(changedState.revision);

    if (currentRevision === loadedRevision) return;

    dispatchStorageEvent('jubro:external-storage-change', {
      ownerType: currentOwner.ownerType,
      ownerId: currentOwner.ownerId,
      loadedRevision,
      currentRevision,
    });
  });
}
