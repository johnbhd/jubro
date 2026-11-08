import { normalizeCellValue } from '../services/trackerData.js';

function columnType(column) {
  return typeof column === 'object' ? column.type || 'text' : 'text';
}

function columnName(column) {
  return String(typeof column === 'object' ? column.name : column).trim().toLowerCase();
}

export const applicationFormMethods = {
  createApplicationDraft(now = new Date()) {
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    return this.getTracker().columns.map(column => ({
      type: columnType(column),
      value: columnType(column) === 'date' && !['next action date', 'nextactiondate'].includes(columnName(column))
        ? today
        : normalizeCellValue(columnType(column), null),
    }));
  },

  captureApplicationContext() {
    return {
      ...this.captureJobSearchContext(),
      tracker: this.getTracker(),
      schema: JSON.stringify(this.getTracker().columns),
    };
  },

  addApplicationDraft(draft, context) {
    this.assertJobSearchContext(context);
    const tracker = this.getTracker();
    if (tracker !== context.tracker || context.key !== this.getActiveTrackerKey()
      || JSON.stringify(tracker.columns) !== context.schema) {
      throw new Error('Your Job Search changed. Reopen Add Application.');
    }
    if (!Array.isArray(draft) || draft.length !== tracker.columns.length) {
      throw new Error('Application fields changed. Reopen Add Application.');
    }
    const row = tracker.columns.map((column, index) => {
      const type = columnType(column);
      const value = normalizeCellValue(type, draft[index]?.value, { strict: true });
      if (type === 'select' && value !== '') {
        const labels = (column.options || []).map(option => (
          typeof option === 'string' ? option : option.label
        ));
        if (!labels.includes(value)) {
          throw new Error('Choose a current option for ' + column.name + '.');
        }
      }
      return { type, value };
    });
    const identityIndexes = tracker.columns.reduce((indexes, column, index) => {
      if (['company', 'position', 'role', 'job title'].includes(columnName(column))) {
        indexes.push(index);
      }
      return indexes;
    }, []);
    const meaningful = identityIndexes.length > 0
      ? identityIndexes.some(index => String(row[index].value ?? '').trim())
      : row.some(cell => ['text', 'select'].includes(cell.type) && String(cell.value).trim());
    if (!meaningful) {
      throw new Error(identityIndexes.length > 0
        ? 'Enter a company or position to add this application.'
        : 'Enter a description or choose an option to add this application.');
    }
    tracker.rows.unshift(row);
    try {
      if (this.save() === false) {
        this.reloadStateFromStorage();
        return false;
      }
    } catch {
      this.reloadStateFromStorage();
      this.showToast('Could not add application. Saved data restored.');
      return false;
    }
    this.refresh({ persist: false });
    this.showToast('Application added.');
    return true;
  },

  openAddApplication() {
    if (document.querySelector('[data-add-application][open]')) {
      return;
    }
    const tracker = this.getTracker();
    if (!tracker || !this.canOpenWorkspace()) {
      return;
    }
    this.kanbanDrag?.cancel();
    this.listDrag?.cancel();
    const context = this.captureApplicationContext();
    const draft = this.createApplicationDraft();
    const previousFocus = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'list-edit-dialog application-add-dialog';
    dialog.dataset.addApplication = 'true';
    dialog.setAttribute('aria-labelledby', 'applicationAddTitle');
    const form = document.createElement('form');
    form.noValidate = true;
    const heading = document.createElement('h2');
    heading.id = 'applicationAddTitle';
    heading.textContent = 'Add Job Application';
    const description = document.createElement('p');
    description.textContent = "Add a job you've applied to.";
    const fields = document.createElement('div');
    fields.className = 'application-add-fields';
    this.getListEditFields(tracker).forEach(field => {
      fields.appendChild(this.createListEditInput(field, draft, { mode: 'add' }));
    });
    const error = document.createElement('p');
    error.className = 'status-dialog-error';
    error.setAttribute('role', 'alert');
    const actions = document.createElement('div');
    actions.className = 'status-dialog-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => dialog.close());
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-action-button';
    submit.textContent = 'Add Application';
    actions.append(cancel, submit);
    form.append(heading, description, fields, error, actions);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (submit.disabled) {
        return;
      }
      submit.disabled = true;
      fields.querySelectorAll('[data-field-key]').forEach(input => {
        const cell = draft[Number(input.dataset.fieldKey)];
        cell.value = cell.type === 'checkbox' ? input.checked : input.value;
      });
      try {
        if (this.addApplicationDraft(draft, context)) {
          dialog.close();
        } else {
          error.textContent = 'Your application was not saved. Reopen Add Application to retry.';
        }
      } catch (failure) {
        error.textContent = failure.userMessage || failure.message;
      } finally {
        submit.disabled = false;
      }
    });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (previousFocus?.isConnected) {
        previousFocus.focus();
      } else {
        document.getElementById('btnAddApplication')?.focus();
      }
    });
    dialog.addEventListener('click', event => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right
        || event.clientY < rect.top || event.clientY > rect.bottom)) {
        dialog.close();
      }
    });
    dialog.appendChild(form);
    document.body.appendChild(dialog);
    dialog.showModal();
    fields.querySelector('input, select')?.focus();
  },
};
