import { Storage } from '../storage/storage.js';
import { createDefaultTracker } from '../tracker/defaultTracker.js';

function button(text, className = '') {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = text;
  control.className = className;
  return control;
}

export const jobSearchManagementMethods = {
  captureJobSearchContext() {
    return {
      state: this.state,
      revision: this.state.revision,
      key: this.getActiveTrackerKey(),
      owner: Storage.getCurrentOwner(),
    };
  },

  assertJobSearchContext(context) {
    const owner = Storage.getCurrentOwner();
    if (context.state !== this.state || context.revision !== this.state.revision
      || context.owner.ownerType !== owner.ownerType || context.owner.ownerId !== owner.ownerId) {
      throw new Error('Your Job Search changed. Reopen this dialog.');
    }
  },

  changeJobSearch(action, { key, title, context = this.captureJobSearchContext() } = {}) {
    this.assertJobSearchContext(context);
    const source = this.state.data[key];
    if (action !== 'create' && !source) {
      throw new Error('This Job Search no longer exists.');
    }
    if (!['create', 'rename', 'duplicate', 'delete'].includes(action)) {
      return false;
    }
    const next = structuredClone(this.state);
    const names = Object.entries(next.data)
      .filter(([id]) => action !== 'rename' || id !== key)
      .map(([, tracker]) => String(tracker.title).trim().toLowerCase());
    const name = String(title ?? '').trim();
    if (action === 'create' || action === 'rename') {
      if (!name) {
        throw new Error('Job Search name is required.');
      }
      if (names.includes(name.toLowerCase())) {
        throw new Error('A Job Search with this name already exists.');
      }
      if (action === 'rename' && source.title === name) {
        return false;
      }
    }
    const newId = () => {
      let id = this.generateId();
      while (next.data[id]) {
        id = this.generateId();
      }
      return id;
    };

    if (action === 'create') {
      next.active = newId();
      next.data[next.active] = createDefaultTracker(next.active, name);
    } else if (action === 'rename') {
      next.data[key].title = name;
    } else if (action === 'duplicate') {
      let copyName = `${source.title} (copy)`;
      let suffix = 2;
      while (names.includes(copyName.toLowerCase())) {
        copyName = `${source.title} (copy ${suffix})`;
        suffix += 1;
      }
      next.active = newId();
      next.data[next.active] = { ...structuredClone(source), id: next.active, title: copyName };
    } else {
      delete next.data[key];
      if (next.active === key) {
        next.active = Object.keys(next.data)[0] || null;
      }
      if (!next.active) {
        next.active = newId();
        next.data[next.active] = createDefaultTracker(next.active, 'My Job Search');
      }
    }

    this.state = next;
    try {
      if (this.save() === false) {
        this.reloadStateFromStorage();
        return false;
      }
    } catch {
      this.reloadStateFromStorage();
      this.showToast('Could not save Job Search. Saved data restored.');
      return false;
    }
    this.closeSearchSpecificUI();
    this.ensureCanonicalTrackerURL(next.active);
    this.refresh({ persist: false });
    return true;
  },

  appendJobSearchActions(row, key) {
    const toggle = button('⋮', 'job-search-actions-toggle');
    toggle.setAttribute('aria-label', `Manage ${this.state.data[key].title} Job Search`);
    toggle.setAttribute('aria-expanded', 'false');
    const menu = document.createElement('div');
    menu.className = 'job-search-actions';
    menu.hidden = true;
    for (const [label, action] of [['Rename', 'rename'], ['Duplicate', 'duplicate'], ['Delete', 'delete']]) {
      const control = button(label);
      control.addEventListener('click', () => {
        document.getElementById('jobSearchDropdown').hidePopover();
        if (action === 'duplicate') {
          try {
            this.changeJobSearch('duplicate', { key });
          } catch (error) {
            this.showToast(error.message);
          }
          document.getElementById('jobSearchSelector')?.focus();
        } else {
          this.openJobSearchDialog(action, key);
        }
      });
      menu.appendChild(control);
    }
    toggle.addEventListener('click', () => {
      const opening = menu.hidden;
      row.parentElement.querySelectorAll('.job-search-actions').forEach(other => {
        other.hidden = true;
      });
      row.parentElement.querySelectorAll('.job-search-actions-toggle').forEach(other => {
        other.setAttribute('aria-expanded', 'false');
      });
      menu.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      if (opening) {
        menu.querySelector('button')?.focus();
      }
    });
    row.append(toggle, menu);
  },

  openJobSearchDialog(action, key = this.getActiveTrackerKey()) {
    const context = this.captureJobSearchContext();
    const tracker = this.state.data[key];
    if (action !== 'create' && !tracker) {
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'list-edit-dialog status-dialog';
    dialog.dataset.jobSearchAction = action;
    dialog.setAttribute('aria-labelledby', 'jobSearchDialogTitle');
    const form = document.createElement('form');
    form.noValidate = true;
    const heading = document.createElement('h2');
    heading.id = 'jobSearchDialogTitle';
    heading.textContent = action === 'create' ? 'Create New Job Search'
      : action === 'rename' ? 'Rename Job Search' : `Delete "${tracker.title}"?`;
    const error = document.createElement('p');
    error.id = 'jobSearchDialogError';
    error.className = 'status-dialog-error';
    error.setAttribute('role', 'alert');
    form.appendChild(heading);
    let input;
    if (action === 'delete') {
      const warning = document.createElement('p');
      warning.textContent = 'This will remove its applications.';
      form.appendChild(warning);
    } else {
      const label = document.createElement('label');
      label.textContent = 'Job Search Name';
      input = document.createElement('input');
      input.className = 'list-edit-control';
      input.placeholder = 'e.g. Internship Search';
      input.value = action === 'rename' ? tracker.title : '';
      input.required = true;
      input.setAttribute('aria-describedby', error.id);
      label.appendChild(input);
      form.appendChild(label);
    }
    const actions = document.createElement('div');
    actions.className = 'status-dialog-actions';
    const cancel = button('Cancel');
    cancel.addEventListener('click', () => dialog.close());
    const submit = button(action === 'create' ? 'Create' : action === 'rename' ? 'Rename' : 'Delete', 'primary-action-button');
    submit.type = 'submit';
    actions.append(cancel, submit);
    form.append(error, actions);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (submit.disabled) {
        return;
      }
      submit.disabled = true;
      try {
        const changed = this.changeJobSearch(action, { key, title: input?.value, context });
        if (changed || (action === 'rename' && input.value.trim() === tracker.title)) {
          dialog.close();
        } else {
          error.textContent = 'Your change was not saved. Reopen this dialog and try again.';
        }
      } catch (failure) {
        error.textContent = failure.message;
      } finally {
        submit.disabled = false;
      }
    });
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.addEventListener('close', () => {
      dialog.remove();
      document.getElementById('jobSearchSelector')?.focus();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right
          || event.clientY < rect.top || event.clientY > rect.bottom) {
          dialog.close();
        }
      }
    });
    dialog.showModal();
    (input || cancel).focus();
  },
};
