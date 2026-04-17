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
    this.btnOpen = document.getElementById('btnOpenModal');
    this.btnCreate = document.getElementById('btnCreate');
    this.btnCancel = document.getElementById('btnCancel');

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

    this.btnCreate?.addEventListener('click', (e) => {
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
    if (!title) return;

    const id = this.getNextId();

    this.state.data[id] = {
      id,
      title,
      columns: ["Task", "Category", "Priority", "Status"],
      rows: []
    };

    this.state.active = id;

    Storage.save(this.state);

    this.titleInput.value = "";
    this.hideModal();
    this.render();
  }
  confirmDelete(id, title) {
    const confirmed = confirm(`Delete tracker "${title}"?`);
  
    if (!confirmed) return;
  
    delete this.state.data[id];
  
    // if deleted tracker is active, reset it
    if (this.state.active === id) {
      this.state.active = null;
    }
  
    Storage.save(this.state);
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
        "bg-white p-5 rounded-2xl shadow hover:shadow-md cursor-pointer";

      card.addEventListener('click', () => {
        this.state.active = t.id;
        Storage.save(this.state);
        window.location.href = `../index.html?tracker=${t.id}`;
      });

      card.innerHTML = `
        <div class="flex justify-between items-start">
          <h2 class="text-lg font-semibold">${t.title}</h2>
      
          <button 
            class="btn-delete text-gray-400 hover:text-red-500 transition"
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
      
        this.confirmDelete(id, title);
      });
      this.grid.appendChild(card);
    });
  }
}