export const listIndexMethods = {
  getListColumnIndexes(tracker) {
    const company = this.getColumnIndexByNames(
      tracker,
      ['company', 'company name', 'employer', 'organization'],
      0
    );
    const rawPosition = this.getColumnIndexByNames(
      tracker,
      ['position', 'role', 'job title', 'position / role', 'job role', 'title'],
      1
    );
    const position = rawPosition === company ? -1 : rawPosition;

    return {
      company,
      position,
      platform: this.getColumnIndexByNames(tracker, ['platform', 'source'], 2),
      status: this.getColumnIndexByNames(tracker, ['status'], 3),
      date: this.getDateColumnIndex(tracker),
      link: this.getColumnIndexByNames(tracker, ['website', 'link', 'url', 'job link', 'application link'], 5),
      workSetup: this.getColumnIndexByNames(tracker, ['work setup', 'worksetup'], -1),
      employmentType: this.getColumnIndexByNames(tracker, ['employment type', 'employmenttype'], -1),
      nextAction: this.getColumnIndexByNames(tracker, ['next action', 'nextaction'], 8),
      nextActionDate: this.getColumnIndexByNames(tracker, ['next action date', 'nextactiondate'], 9),
      email: this.getColumnIndexByNames(tracker, ['email'], -1),
      location: this.getColumnIndexByNames(tracker, ['location'], -1)
    };
  },

  resolveApplicationRow(tracker, row, indexes = this.getListColumnIndexes(tracker)) {
    const readDisplay = (index) => (
      Number.isInteger(index) && index >= 0 ? this.getCellDisplay(row?.[index]) : '-'
    );
    const toUsefulText = (displayValue) => (
      this.isUsefulListValue(displayValue) ? displayValue : ''
    );

    const companyDisplay = readDisplay(indexes.company);
    const positionDisplay = readDisplay(indexes.position);
    const dateDisplay = readDisplay(indexes.date);
    const platformDisplay = readDisplay(indexes.platform);
    const statusDisplay = readDisplay(indexes.status);
    const workSetupDisplay = readDisplay(indexes.workSetup);
    const employmentTypeDisplay = readDisplay(indexes.employmentType);
    const nextActionDisplay = readDisplay(indexes.nextAction);
    const nextActionDateDisplay = readDisplay(indexes.nextActionDate);
    const indexedLink = Number.isInteger(indexes.link) && indexes.link >= 0
      ? String(this.getCellValue(row?.[indexes.link]) || '').trim()
      : '';
    const link = this.isUsefulListValue(indexedLink)
      ? indexedLink
      : this.getFirstRowLink(row);

    return {
      companyDisplay,
      positionDisplay,
      dateDisplay,
      platformDisplay,
      statusDisplay,
      workSetupDisplay,
      employmentTypeDisplay,
      nextActionDisplay,
      nextActionDateDisplay,
      company: toUsefulText(companyDisplay),
      position: toUsefulText(positionDisplay),
      date: toUsefulText(dateDisplay),
      platform: toUsefulText(platformDisplay),
      status: toUsefulText(statusDisplay),
      workSetup: toUsefulText(workSetupDisplay),
      employmentType: toUsefulText(employmentTypeDisplay),
      nextAction: toUsefulText(nextActionDisplay),
      nextActionDate: toUsefulText(nextActionDateDisplay),
      link
    };
  },

  resolveListCardIdentity(tracker, row, indexes = this.getListColumnIndexes(tracker)) {
    const { company, position } = this.resolveApplicationRow(tracker, row, indexes);
    const hasPosition = Boolean(position);
    const hasCompany = Boolean(company);
    const titleText = hasPosition
      ? position
      : hasCompany
        ? company
        : 'Untitled Application';
    const companyText = hasPosition && hasCompany ? company : '';

    return {
      titleText,
      companyText,
      showCompany: Boolean(companyText),
      company,
      position
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

    if (columnIndex === indexes.company || ['company', 'company name', 'employer', 'organization'].includes(columnName)) return 'company';
    if (columnIndex === indexes.position || ['position', 'role', 'job title', 'position / role', 'job role', 'title'].includes(columnName)) return 'position';
    if (columnIndex === indexes.platform || ['platform', 'source'].includes(columnName)) return 'platform';
    if (columnIndex === indexes.status || columnName === 'status') return 'status';
    if (columnIndex === indexes.date || ['application date', 'date', 'date applied'].includes(columnName)) return 'date';
    if (columnIndex === indexes.link || ['website', 'link', 'url', 'job link', 'application link'].includes(columnName)) return 'website';
    if (columnIndex === indexes.workSetup || ['work setup', 'worksetup'].includes(columnName)) return 'workSetup';
    if (columnIndex === indexes.employmentType || ['employment type', 'employmenttype'].includes(columnName)) return 'employmentType';
    if (columnIndex === indexes.nextAction || ['next action', 'nextaction'].includes(columnName)) return 'nextAction';
    if (columnIndex === indexes.nextActionDate || ['next action date', 'nextactiondate'].includes(columnName)) return 'nextActionDate';
    if (columnIndex === indexes.email || columnName === 'email') return 'email';
    if (columnIndex === indexes.location || columnName === 'location') return 'location';

    return `column-${columnIndex}`;
  },

  isUsefulListValue(value) {
    const normalized = this.normalizeText(value);

    return Boolean(normalized) && normalized !== '-' && normalized !== 'n/a' && normalized !== 'na';
  },

  getFirstRowLink(row) {
    if (!Array.isArray(row)) return '';

    const cell = row.find((item) => this.isHttpLink(this.getCellValue(item)));

    return this.getCellValue(cell) || '';
  }
};
