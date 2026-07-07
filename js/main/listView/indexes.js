export const listIndexMethods = {
  getListColumnIndexes(tracker) {
    return {
      company: this.getColumnIndexByNames(tracker, ['company'], 0),
      position: this.getColumnIndexByNames(tracker, ['position', 'role', 'job title'], 1),
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['website', 'link', 'url', 'job link'], 5),
      email: this.getColumnIndexByNames(tracker, ['email'], -1),
      location: this.getColumnIndexByNames(tracker, ['location'], -1)
    };
  },

  getListRowText(row) {
    return row
      .map((cell) => this.getCellDisplay(cell))
      .join(' ')
      .toLowerCase();
  },

  getListSelectColumns() {
    return this.getSelectColumns();
  },

  getActiveListFilterValues() {
    return Object.values(this.activeListFilters).filter(Boolean);
  },

  getListColumnFieldKey(tracker, columnIndex) {
    const indexes = this.getListColumnIndexes(tracker);
    const columnName = this.normalizeText(this.getColumnName(tracker?.columns?.[columnIndex]));

    if (columnIndex === indexes.company || columnName === 'company') return 'company';
    if (columnIndex === indexes.position || ['position', 'role', 'job title'].includes(columnName)) return 'position';
    if (columnIndex === indexes.platform || ['platform', 'source'].includes(columnName)) return 'platform';
    if (columnIndex === indexes.status || columnName === 'status') return 'status';
    if (columnIndex === indexes.date || ['date', 'date applied'].includes(columnName)) return 'date';
    if (columnIndex === indexes.link || ['website', 'link', 'url', 'job link'].includes(columnName)) return 'website';
    if (columnIndex === indexes.email || columnName === 'email') return 'email';
    if (columnIndex === indexes.location || columnName === 'location') return 'location';

    return `column-${columnIndex}`;
  },

  isUsefulListValue(value) {
    const normalized = this.normalizeText(value);

    return Boolean(normalized) && normalized !== '-' && normalized !== 'n/a' && normalized !== 'na';
  },

  getFirstRowLink(row) {
    const cell = row.find((item) => this.isHttpLink(this.getCellValue(item)));

    return this.getCellValue(cell) || '';
  }
};
