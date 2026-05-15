import { Storage } from '../storage/storage.js';

export class TrackerHome {
  constructor() {
    console.log("TrackerHome initialized");

    this.state = Storage.load();

    if (!this.state?.data) {
      this.state = { active: null, data: {} };
    }

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
  }

  getNextId() {
    const ids = Object.keys(this.state.data || {});
    if (!ids.length) return "1";
    return String(Math.max(...ids.map(id => Number(id) || 0)) + 1);
  }

  showModal() {
    if (!this.modal) return;
    this.modal.classList.remove('hidden');
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
  
    this.state.data[id] = {
      id,
      title,
       columns: [
          { name: 'Company', type: 'text' },
          { name: 'Position', type: 'text' },
          {
            name: 'Status',
            type: 'select',
            options: [
              { label: 'Applied', color: '#3b82f6' },
              { label: 'Interview', color: '#69df94' },
              { label: 'Rejected', color: '#ef4444' }
            ]
          },
          { name: 'Date', type: 'date' },
          { name: 'Link', type: 'text' }
        ],
        rows: [
          [
            { value: 'Google', type: 'text' },
            { value: 'Frontend Intern', type: 'text' },
            { value: 'Applied', type: 'select' },
            { value: '2026-04-10', type: 'date' },
            { value: 'https://careers.google.com', type: 'text' }
          ],
          [
            { value: 'Microsoft', type: 'text' },
            { value: 'Software Engineer', type: 'text' },
            { value: 'Interview', type: 'select' },
            { value: '2026-04-12', type: 'date' },
            { value: 'https://careers.microsoft.com', type: 'text' }
          ],
          [
            { value: 'Meta', type: 'text' },
            { value: 'Web Developer', type: 'text' },
            { value: 'Rejected', type: 'select' },
            { value: '2026-04-08', type: 'date' },
            { value: 'https://www.metacareers.com', type: 'text' }
          ]
        ]
    };
  
    this.state.active = id;
  
    Storage.save(this.state);
  
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
  
    Storage.save(this.state);
  
    this.hideDeleteModal();
    this.render();
  }
  render() {
    if (!this.grid) return;

    this.grid.innerHTML = '';

    const data = this.state?.data || {};

    const keys = Object.keys(data);

    if (keys.length === 0) {
      this.grid.innerHTML = `
        <p class="text-gray-400 col-span-full text-center">
          No trackers yet
        </p>`;
      return;
    }

    keys.forEach((id) => {
      const t = data[id];

      const card = document.createElement('div');
      card.className =
        "bg-white p-5 rounded-2xl shadow hover:shadow-md cursor-pointer overflow-hidden";

      card.addEventListener('click', () => {
        this.state.active = t.id;
        Storage.save(this.state);
        window.location.href = `../index.html?tracker=${t.id}`;
      });

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <h2 class="text-lg font-semibold truncate">${t.title}</h2>
      
          <button 
            class="btn-delete text-gray-400 hover:text-red-500 transition"
            type="button"
            data-id="${t.id}"
            data-title="${t.title}"
          >
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      
        <p class="text-gray-500 mt-1">${t.rows.length} entries</p>
      
        <button type="button" class="mt-4 text-sm text-blue-500">
          Open
        </button>
      `;
      const deleteBtn = card.querySelector('.btn-delete');
      
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevents opening the card
      
        const id = deleteBtn.dataset.id;
        const title = deleteBtn.dataset.title;
      
        this.showDeleteModal(id, title);
      });
      this.grid.appendChild(card);
    });
  }
}
