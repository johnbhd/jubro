import { getQuickOverviewMetrics, getStatusSummary } from './quickOverview.js';

export const OVERVIEW_METRICS = [
  {
    key: 'totalApplications',
    label: 'Total Applications',
    icon: 'fa-file-lines',
    tone: 'blue',
  },
  {
    key: 'interviews',
    label: 'Interviews',
    icon: 'fa-comments',
    tone: 'green',
  },
  {
    key: 'offers',
    label: 'Offers',
    icon: 'fa-briefcase',
    tone: 'purple',
  },
  {
    key: 'needAttention',
    label: 'Need Attention',
    icon: 'fa-clock',
    tone: 'coral',
  },
];

function appendText(parent, tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

export const trackerDashboardMethods = {
  getDashboardDateRange() {
    const range = this.dashboardRangeSelect?.value || 'this-month';
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    if (range === 'all-time') return null;

    if (range === 'this-week') {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const from = new Date(year, month, today.getDate() + mondayOffset);
      const to = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 6);

      return { from, to };
    }

    if (range === 'last-month') {
      return {
        from: new Date(year, month - 1, 1),
        to: new Date(year, month, 0)
      };
    }

    if (range === 'this-year') {
      return {
        from: new Date(year, 0, 1),
        to: new Date(year, 11, 31)
      };
    }

    if (range === 'custom') {
      const from = new Date(`${this.dashboardDateFrom?.value || ''}T00:00:00`);
      const to = new Date(`${this.dashboardDateTo?.value || ''}T00:00:00`);

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;

      return { from, to };
    }

    return {
      from: new Date(year, month, 1),
      to: new Date(year, month + 1, 0)
    };
  },

  getDashboardFilteredRows(tracker) {
    const rows = Array.isArray(tracker?.rows) ? tracker.rows : [];
    const dateRange = this.getDashboardDateRange();
    const dateIndex = this.getDateColumnIndex(tracker);
    const dateColumnName = this.normalizeText(this.getColumnName(tracker?.columns?.[dateIndex]));

    if (!dateRange || dateIndex === -1 || ['next action date', 'nextactiondate'].includes(dateColumnName)) {
      return rows;
    }

    const fromTime = dateRange.from.getTime();
    const toTime = dateRange.to.getTime();

    return rows.filter((row) => {
      const cell = row?.[dateIndex];
      const value = typeof cell === 'object' ? cell.value : cell;
      const time = new Date(`${value || ''}T00:00:00`).getTime();

      return !Number.isNaN(time) && time >= fromTime && time <= toTime;
    });
  },

  renderDashboard() {
    if (!this.dashboardCards) return;

    const tracker = this.getTracker();
    if (!tracker) return;

    this.updateDashboardRangeVisibility();
    const indexes = {
      ...this.getListColumnIndexes(tracker),
      status: this.getColumnIndexByNames(tracker, ['status']),
      nextAction: this.getColumnIndexByNames(tracker, ['next action', 'nextaction']),
      nextActionDate: this.getColumnIndexByNames(tracker, ['next action date', 'nextactiondate']),
    };
    const applications = this.getDashboardFilteredRows(tracker)
      .map(row => this.resolveApplicationRow(tracker, row, indexes));
    const metrics = getQuickOverviewMetrics(applications);
    const allApplications = this.getAnalyticsApplications
      ? this.getAnalyticsApplications(tracker)
      : tracker.rows.map(row => this.resolveApplicationRow(tracker, row, indexes));
    metrics.needAttention = getQuickOverviewMetrics(allApplications).needAttention;
    const empty = applications.length === 0;
    const noApplications = tracker.rows.length === 0;
    this.dashboardCards.innerHTML = '';
    for (const metric of OVERVIEW_METRICS) {
      const card = document.createElement('div');
      card.className = `overview-metric overview-metric-${metric.tone}${empty ? ' is-muted' : ''}`;
      card.dataset.metric = metric.key;
      const icon = appendText(card, 'i', `fa-solid ${metric.icon}`, '');
      icon.setAttribute('aria-hidden', 'true');
      appendText(card, 'p', 'overview-metric-label', metric.label);
      appendText(card, 'p', 'overview-metric-value', String(metrics[metric.key]));
      this.dashboardCards.appendChild(card);
    }

    this.dashboardEmptyState.hidden = !empty;
    this.dashboardEmptyTitle.textContent = noApplications ? 'No applications yet' : 'No applications in this period';
    this.dashboardEmptyDescription.textContent = noApplications
      ? 'Start adding your job applications to see your insights here.'
      : 'Try another time period to see your applications.';
    this.dashboardAddButton.hidden = !noApplications;
    this.dashboardInsights.hidden = empty;
    this.dashboardSubtitle.textContent = this.dashboardRangeSelect?.value === 'this-month'
      ? 'A quick look at your job search this month.'
      : 'A quick look at your job search for the selected period.';

    this.dashboardSummary.innerHTML = '';
    this.dashboardSummary.hidden = empty;
    if (empty) return;

    const summary = getStatusSummary(applications, tracker.columns[indexes.status]);
    appendText(this.dashboardSummary, 'h3', 'overview-summary-title', 'Status Summary');
    appendText(this.dashboardSummary, 'p', 'overview-description', 'Where your applications are right now.');
    const bar = document.createElement('div');
    bar.className = 'overview-status-bar';
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', summary.map(group => `${group.label}: ${group.count}`).join(', '));
    const legend = document.createElement('ul');
    legend.className = 'overview-status-legend';
    for (const group of summary) {
      const segment = document.createElement('span');
      segment.style.backgroundColor = group.color;
      segment.style.flexBasis = `${group.count / applications.length * 100}%`;
      segment.setAttribute('aria-label', `${group.label}: ${group.count}`);
      bar.appendChild(segment);
      const item = document.createElement('li');
      const dot = appendText(item, 'span', 'overview-status-dot', '');
      dot.style.backgroundColor = group.color;
      dot.setAttribute('aria-hidden', 'true');
      appendText(item, 'span', '', `${group.label} ${group.count}`);
      legend.appendChild(item);
    }
    this.dashboardSummary.append(bar, legend);
  },

  openDashboard(opener) {
    if (!this.dashboardModal) return;
    if (this.workspaceLoading?.isLoading
      || this.boardWorkspace?.hidden
      || (this.canOpenWorkspace && !this.canOpenWorkspace())) {
      return;
    }

    this.overviewReturnFocus = opener || document.getElementById('btnDashboard');
    this.renderDashboard();
    this.dashboardModal.classList.remove('hidden');
    document.getElementById('btnDashboard')?.setAttribute('aria-expanded', 'true');
    document.getElementById('btnCloseDashboard')?.focus();
  },

  closeDashboard() {
    const wasOpen = this.dashboardModal && !this.dashboardModal.classList.contains('hidden');
    this.dashboardModal?.classList.add('hidden');
    const trigger = document.getElementById('btnDashboard');
    trigger?.setAttribute('aria-expanded', 'false');
    if (wasOpen) {
      (this.overviewReturnFocus || trigger)?.focus();
    }
  },

  updateDashboardRangeVisibility() {
    if (!this.dashboardRangeSelect || !this.dashboardCustomRange) return;

    this.dashboardCustomRange.classList.toggle(
      'hidden',
      this.dashboardRangeSelect.value !== 'custom'
    );
  }
};
