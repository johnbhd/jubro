export const listFilterMethods = {
  pruneListFilters() {
    const validOptionsByIndex = new Map(
      this.getListSelectColumns().map(({ column, index }) => [
        String(index),
        new Set(this.getDashboardOptions(column).map((option) => option.label))
      ])
    );

    Object.keys(this.activeListFilters).forEach((index) => {
      const validOptions = validOptionsByIndex.get(index);

      if (!validOptions || !validOptions.has(this.activeListFilters[index])) {
        delete this.activeListFilters[index];
      }
    });
  },

  rowMatchesListFilters(row, tracker) {
    const listQuery = this.normalizeText(this.listSearchInput?.value);

    if (listQuery && !this.getListRowText(row).includes(listQuery)) {
      return false;
    }

    for (const [columnIndex, filterValue] of Object.entries(this.activeListFilters)) {
      if (!filterValue) continue;

      if (this.normalizeText(this.getCellValue(row?.[Number(columnIndex)])) !== this.normalizeText(filterValue)) {
        return false;
      }
    }

    return true;
  },

  updateListStats(tracker) {
    if (!this.listThisMonthCount || !this.listTotalCount) return;

    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const dateIndex = this.getDateColumnIndex(tracker);
    const now = new Date();
    const thisMonthCount = rows.filter((row) => {
      const dateValue = this.getCellValue(row?.[dateIndex]);
      const date = new Date(`${dateValue || ''}T00:00:00`);

      return !Number.isNaN(date.getTime())
        && date.getFullYear() === now.getFullYear()
        && date.getMonth() === now.getMonth();
    }).length;

    this.listThisMonthCount.textContent = String(thisMonthCount);
    this.listTotalCount.textContent = String(rows.length);
  },

  countColumnValue(rows, columnIndex, value) {
    if (!value) return rows.length;

    return rows.filter((row) => (
      this.normalizeText(this.getCellValue(row?.[columnIndex])) === this.normalizeText(value)
    )).length;
  },

  createListFilterChip(column, columnIndex, value, count) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'list-filter-chip';
    chip.dataset.columnIndex = String(columnIndex);
    chip.dataset.filterValue = value;

    const optionColor = value
      ? this.getOptionColor(column, value)
      : '#111827';
    chip.style.setProperty('--chip-color', optionColor);
    chip.style.setProperty('--chip-text-color', this.getContrastColor(optionColor));

    chip.append(document.createTextNode(value || 'All'));

    const countBadge = document.createElement('span');
    countBadge.className = 'list-filter-count';
    countBadge.textContent = String(count);
    chip.appendChild(countBadge);

    return chip;
  },

  renderListFilterSections(tracker) {
    if (!this.listFilterSections) return;

    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const selectColumns = this.getListSelectColumns();
    this.listFilterSections.innerHTML = '';
    this.pruneListFilters();

    if (selectColumns.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'rounded-md border border-dashed border-gray-200 p-3 text-sm text-gray-400';
      empty.textContent = 'No data exists.';
      this.listFilterSections.appendChild(empty);
      return;
    }

    selectColumns.forEach(({ column, index }) => {
      const options = this.getDashboardOptions(column);
      const section = document.createElement('div');
      const title = document.createElement('p');
      const chips = document.createElement('div');

      title.className = 'text-xs font-medium uppercase text-gray-400';
      title.textContent = this.getColumnName(column) || `Column ${index + 1}`;
      chips.className = 'mt-3 flex flex-wrap gap-2';

      chips.appendChild(this.createListFilterChip(column, index, '', rows.length));

      options.forEach((option) => {
        chips.appendChild(
          this.createListFilterChip(
            column,
            index,
            option.label,
            this.countColumnValue(rows, index, option.label)
          )
        );
      });

      if (options.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-sm text-gray-400';
        empty.textContent = 'No options yet.';
        chips.appendChild(empty);
      }

      section.appendChild(title);
      section.appendChild(chips);
      this.listFilterSections.appendChild(section);
    });
  },

  updateListFilterChipStyles() {
    document.querySelectorAll('.list-filter-chip').forEach((chip) => {
      const columnIndex = chip.dataset.columnIndex;
      const value = chip.dataset.filterValue || '';
      const isActive = value === ''
        ? !this.activeListFilters[columnIndex]
        : this.activeListFilters[columnIndex] === value;

      chip.classList.toggle('is-active', isActive);
    });
  }
};
