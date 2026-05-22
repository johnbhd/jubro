import { renderDashboardCharts } from './dashboardCharts.js';

export const trackerDashboardMethods = {
countDashboardOptions(columnIndex, options) {
    const tracker = this.getTracker();
    const counts = new Map(options.map((option) => [option.label, 0]));

    if (!tracker || !Array.isArray(tracker.rows)) return counts;

    tracker.rows.forEach((row) => {
      const cell = row?.[columnIndex];
      const value = typeof cell === 'object' ? cell.value : cell;

      if (counts.has(value)) {
        counts.set(value, counts.get(value) + 1);
      }
    });

    return counts;
  },

renderDashboardCards(columnIndex) {
    const tracker = this.getTracker();
    const column = tracker?.columns?.[columnIndex];
    const options = this.getDashboardOptions(column);

    if (!this.dashboardCards) return;

    this.dashboardCards.innerHTML = '';

    if (!column || options.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-xl border border-dashed border-gray-200 p-4 text-center text-sm text-gray-400 lg:col-span-3';
      empty.textContent = 'No options found.';
      this.dashboardCards.appendChild(empty);
      renderDashboardCharts(this.dashboardCharts, [], new Map(), tracker);
      return;
    }

    const counts = this.countDashboardOptions(columnIndex, options);

    options.forEach((option) => {
      const card = document.createElement('div');
      card.className = 'rounded-xl border p-4 text-center';
      card.style.borderColor = option.color;

      const label = document.createElement('p');
      label.className = 'truncate text-sm font-medium';
      label.textContent = option.label;
      label.style.color = option.color;

      const count = document.createElement('p');
      count.className = 'mt-2 text-3xl font-semibold';
      count.textContent = counts.get(option.label) || 0;
      count.style.color = option.color;

      card.appendChild(label);
      card.appendChild(count);
      this.dashboardCards.appendChild(card);
    });

    renderDashboardCharts(this.dashboardCharts, options, counts, tracker);
  },

renderDashboard() {
    if (!this.dashboardSelectColumn) return;

    const selectColumns = this.getSelectColumns();
    const currentValue = this.dashboardSelectColumn.value;

    this.dashboardSelectColumn.innerHTML = '';

    if (selectColumns.length === 0) {
      const option = document.createElement('option');
      option.textContent = 'No select columns';
      option.value = '';
      this.dashboardSelectColumn.appendChild(option);
      this.dashboardSelectColumn.disabled = true;
      this.renderDashboardCards(null);
      return;
    }

    this.dashboardSelectColumn.disabled = false;

    selectColumns.forEach(({ column, index }) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = this.getColumnName(column) || `Column ${index + 1}`;
      this.dashboardSelectColumn.appendChild(option);
    });

    const selected = selectColumns.some(({ index }) => String(index) === currentValue)
      ? currentValue
      : String(selectColumns[0].index);

    this.dashboardSelectColumn.value = selected;
    this.renderDashboardCards(Number(selected));
  },

openDashboard() {
    if (!this.dashboardModal) return;

    this.renderDashboard();
    this.dashboardModal.classList.remove('hidden');
  },

closeDashboard() {
    this.dashboardModal?.classList.add('hidden');
  }
};
