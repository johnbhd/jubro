import { Storage } from '../storage/storage.js';
import { authService } from '../auth/firebaseAuth.js';
import { firebaseTrackerSync } from '../storage/firebaseTrackerSync.js';
import { createDefaultTracker } from '../tracker/defaultTracker.js';

export class TrackerHome {
  constructor() {
    console.log("TrackerHome initialized");

    this.state = this.initializeState();

    this.grid = document.getElementById('trackerGrid');
    this.titleInput = document.getElementById('titleInput');
    this.modal = document.getElementById('modal');
    this.trackerForm = document.getElementById('trackerForm');
    this.btnOpen = document.getElementById('btnOpenModal');
    this.btnCreate = document.getElementById('btnCreate');
    this.btnCancel = document.getElementById('btnCancel');
    this.deleteModal = document.getElementById('deleteModal');
    this.deleteText = document.getElementById('deleteText');
    this.btnDeleteCancel = document.getElementById('btnDeleteCancel');
    this.btnDeleteConfirm = document.getElementById('btnDeleteConfirm');
    this.titleError = document.getElementById('titleError');
    
    this.deleteId = null;

    if (!this.grid) {
      console.error("trackerGrid not found");
      return;
    }

    this.bindEvents();
    this.render();
  }

  initializeState() {
    if (!Storage.exists()) {
      const state = {
        active: null,
        data: {}
      };

      Storage.save(state);
      return state;
    }

    const state = Storage.load();

    return state?.data ? state : { active: null, data: {} };
  }

  reloadFromStorage() {
    const state = Storage.load();

    this.state = state?.data ? state : { active: null, data: {} };
    this.render();
  }

  bindEvents() {
    this.btnOpen?.addEventListener('click', (e) => {
      e.preventDefault();
      this.showModal();
    });

    this.btnCancel?.addEventListener('click', (e) => {
      e.preventDefault();
      this.hideModal();
    });
    
    this.btnDeleteCancel?.addEventListener('click', () => {
      this.hideDeleteModal();
    });
    
    this.btnDeleteConfirm?.addEventListener('click', () => {
      this.deleteTracker();
    });

    this.trackerForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.createTracker();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.showModal();
      }
    });

    document.addEventListener('tracker:sync-complete', () => {
      this.reloadFromStorage();
    });
  }

  getNextId(state = this.state) {
    const ids = Object.keys(state.data || {});
    if (!ids.length) return "1";
    return String(Math.max(...ids.map(id => Number(id) || 0)) + 1);
  }

  getBoardUrl(trackerId) {
    const query = `tracker=${encodeURIComponent(trackerId)}`;

    if (window.location.pathname.includes('/pages/')) {
      return `./board.html?${query}`;
    }

    return `/board/?${query}`;
  }

  showModal() {
    if (!this.modal) return;
    this.modal.classList.remove('hidden');
    requestAnimationFrame(() => this.titleInput?.focus());
  }

  hideModal() {
    if (!this.modal) return;
    this.modal.classList.add('hidden');
  }

  createTracker() {
    const title = this.titleInput?.value.trim();
  
    const error = this.validateTitle(title);
  
    if (error) {
      this.showError(error);
      return;
    }
  
    const id = this.getNextId();
  
    this.state.data[id] = createDefaultTracker(id, title);
  
    this.state.active = id;
  
    if (!Storage.save(this.state)) {
      this.reloadFromStorage();
      return;
    }

    this.syncLocalStateToFirebase();
  
    this.titleInput.value = "";
    this.clearError();
    this.hideModal();
    this.render();
  }
  
  showError(message) {
    this.titleError.textContent = message;
    this.titleError.classList.remove('hidden');
  
    this.titleInput.classList.add('border-red-500', 'ring-2', 'ring-red-500');
  }
  
  clearError() {
    this.titleError.textContent = "";
    this.titleError.classList.add('hidden');
  
    this.titleInput.classList.remove('border-red-500', 'ring-2', 'ring-red-500');
  }
  validateTitle(title) {
    const data = this.state?.data || {};
  
    // empty check
    if (!title) {
      return "Tracker name is required";
    }
  
    // duplicate check (case insensitive)
    const exists = Object.values(data).some(
      t => t.title.toLowerCase() === title.toLowerCase()
    );
  
    if (exists) {
      return "Tracker already exists";
    }
  
    return null;
  }
  
  showDeleteModal(id, title) {
    this.deleteId = id;
    this.deleteText.textContent = `Delete tracker "${title}"?`;
  
    this.deleteModal.classList.remove('hidden');
  }
  
  hideDeleteModal() {
    this.deleteModal.classList.add('hidden');
    this.deleteId = null;
  }

  deleteTracker() {
    if (!this.deleteId) return;
  
    delete this.state.data[this.deleteId];
  
    if (this.state.active === this.deleteId) {
      this.state.active = null;
    }
  
    if (!Storage.save(this.state)) {
      this.reloadFromStorage();
      return;
    }

    this.syncLocalStateToFirebase();
  
    this.hideDeleteModal();
    this.render();
  }

  syncLocalStateToFirebase() {
    const user = authService.getCurrentUser();

    if (!user) return;

    firebaseTrackerSync.syncCurrentLocalState(user).catch((err) => {
      console.error("Tracker Firebase sync error:", err);
    });
  }
  render() {
    if (!this.grid) return;

    this.grid.innerHTML = '';

    const data = this.state?.data || {};

    const keys = Object.keys(data).sort((a, b) => {
      const aNumber = Number(a);
      const bNumber = Number(b);

      if (a === this.state.active) return -1;
      if (b === this.state.active) return 1;

      if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
        return bNumber - aNumber;
      }

      return String(b).localeCompare(String(a));
    });

    if (keys.length === 0) {
      this.grid.innerHTML = `
        <p class="text-gray-400 col-span-full text-center">
          No trackers yet
        </p>`;
      return;
    }

    keys.forEach((id) => {
      const t = data[id];

      if (!t || typeof t !== 'object') return;

      const trackerId = id;
      const boardUrl = this.getBoardUrl(trackerId);

      if (t.id !== trackerId) {
        t.id = trackerId;
      }

      const card = document.createElement('div');
      card.className =
        "group bg-white p-5 rounded-2xl shadow cursor-pointer overflow-hidden border border-transparent transition duration-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-xl";

      card.addEventListener('click', () => {
        this.state.active = trackerId;
        if (!Storage.save(this.state)) {
          this.reloadFromStorage();
          return;
        }

        window.location.href = boardUrl;
      });

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <h2 class="tracker-card-title text-lg font-semibold truncate"></h2>
          <button class="btn-delete text-gray-400 hover:text-red-500 transition" type="button" aria-label="Delete tracker">
            <i class="fa-solid fa-trash hover:text-red-500"></i>
          </button>
        </div>
        <p class="tracker-card-count text-gray-500 mt-1"></p>
        <a class="tracker-card-link mt-4 inline-block text-sm text-blue-500 transition group-hover:text-blue-600">Open</a>
      `;

      card.querySelector('.tracker-card-title').textContent = t.title || 'Untitled Tracker';
      card.querySelector('.tracker-card-count').textContent = `${Array.isArray(t.rows) ? t.rows.length : 0} entries`;
      card.querySelector('.tracker-card-link').href = boardUrl;

      card.querySelector('a')?.addEventListener('click', (event) => {
        this.state.active = trackerId;
        if (!Storage.save(this.state)) {
          event.preventDefault();
          this.reloadFromStorage();
        }
      });

      const deleteBtn = card.querySelector('.btn-delete');
      
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevents opening the card
      
        this.showDeleteModal(trackerId, t.title || 'Untitled Tracker');
      });
      this.grid.appendChild(card);
    });
  }
}
