import { getInsights, getDueLabel, INSIGHTS_PERIODS } from './calculations.js';
import { getWorkspaceLink } from './navigation.js';
import { OVERVIEW_METRICS } from '../trackerDashboard.js';

const INSIGHTS_METRIC_ICONS = {
  totalApplications: 'fa-file-lines',
  interviews: 'fa-comments',
  offers: 'fa-trophy',
  needAttention: 'fa-bell',
};

function text(parent, tag, className, value) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = value;
  parent.append(node);
  return node;
}

function button(parent, label, className, onClick) {
  const node = text(parent, 'button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function panel(parent, title, description) {
  const section = text(parent, 'section', 'insights-panel', '');
  text(section, 'h2', '', title);
  if (description) {
    text(section, 'p', 'insights-description', description);
  }
  return section;
}

function bars(parent, groups) {
  const list = text(parent, 'ul', 'insights-breakdown', '');
  const maximum = Math.max(1, ...groups.map(group => group.count));
  for (const group of groups) {
    const row = text(list, 'li', '', '');
    const header = text(row, 'div', 'insights-bar-label', '');
    text(header, 'span', '', group.label);
    text(header, 'strong', '', String(group.count));
    const track = text(row, 'div', 'insights-bar-track', '');
    track.setAttribute('aria-hidden', 'true');
    const fill = text(track, 'span', '', '');
    fill.style.width = `${group.count / maximum * 100}%`;
    fill.style.backgroundColor = group.color;
  }
}

export const insightsMethods = {
  getAnalyticsApplications(tracker = this.getTracker()) {
    const names = {
      company: ['company', 'company name', 'employer', 'organization'],
      position: ['position', 'role', 'job title', 'position / role', 'job role', 'title'],
      status: ['status'],
      platform: ['platform', 'source'],
      date: ['application date', 'date applied', 'date'],
      workSetup: ['work setup', 'worksetup'],
      employmentType: ['employment type', 'employmenttype'],
      nextAction: ['next action', 'nextaction'],
      nextActionDate: ['next action date', 'nextactiondate'],
    };
    const indexes = Object.fromEntries(Object.entries(names).map(([field, aliases]) => (
      [field, this.getColumnIndexByNames(tracker, aliases)]
    )));
    return (tracker?.rows || []).map((row, rowIndex) => ({
      ...Object.fromEntries(Object.entries(indexes).map(([field, index]) => (
        [field, index < 0 ? '' : String(this.getCellValue(row[index]) ?? '').trim()]
      ))),
      rowIndex,
    }));
  },

  updateInsightsLinks() {
    const key = this.getActiveTrackerKey();
    const link = document.getElementById('overviewInsightsLink');
    if (link) {
      link.href = getWorkspaceLink(key, 'insights');
    }
  },

  renderInsights() {
    const root = document.getElementById('insightsView');
    const tracker = this.getTracker();
    if (!root || !tracker || !this.isInsightsPage) {
      return;
    }
    root.hidden = false;
    root.replaceChildren();
    const key = this.getActiveTrackerKey();
    const back = text(root, 'a', 'insights-back', '← Back to Board');
    back.href = getWorkspaceLink(key, 'kanban');
    const header = text(root, 'div', 'insights-header', '');
    const heading = text(header, 'div', '', '');
    text(heading, 'h1', '', 'Job Search Insights');
    text(heading, 'p', 'insights-description', 'A progress report for your job search.');
    const controls = text(header, 'div', 'insights-header-controls', '');
    const period = text(controls, 'select', 'insights-period', '');
    period.setAttribute('aria-label', 'Insights time period');
    for (const [value, label] of INSIGHTS_PERIODS) {
      const option = text(period, 'option', '', label);
      option.value = value;
    }
    period.value = this.insightsPeriod || '30-days';
    period.addEventListener('change', () => {
      this.insightsPeriod = period.value;
      this.renderInsights();
      root.querySelector('.insights-period').focus();
    });

    const applications = this.getAnalyticsApplications(tracker);
    if (applications.length === 0) {
      const empty = text(root, 'div', 'insights-empty', '');
      const illustration = text(empty, 'div', 'overview-empty-icon', '');
      const clipboard = text(illustration, 'span', 'overview-empty-clipboard', '');
      text(clipboard, 'i', 'fa-solid fa-list-check', '').setAttribute('aria-hidden', 'true');
      illustration.setAttribute('aria-hidden', 'true');
      text(empty, 'h2', '', 'No insights yet');
      text(empty, 'p', 'insights-description', 'Add your first application and Jubro will start showing how your job search is progressing.');
      button(empty, '+ Add Application', 'primary-action-button', () => this.openAddApplication());
      return;
    }

    const statusIndex = this.getColumnIndexByNames(tracker, ['status']);
    const platformIndex = this.getColumnIndexByNames(tracker, ['platform', 'source']);
    const now = new Date();
    const result = getInsights(applications, {
      period: this.insightsPeriod || '30-days',
      now,
      statusColumn: tracker.columns[statusIndex],
      platformColumn: tracker.columns[platformIndex],
    });
    const metrics = text(root, 'div', 'overview-metrics insights-metrics', '');
    for (const metric of OVERVIEW_METRICS) {
      const card = text(metrics, 'div', `overview-metric overview-metric-${metric.tone}`, '');
      card.dataset.metric = metric.key;
      text(card, 'i', `fa-solid ${INSIGHTS_METRIC_ICONS[metric.key]}`, '').setAttribute('aria-hidden', 'true');
      text(card, 'p', 'overview-metric-label', metric.label);
      text(card, 'p', 'overview-metric-value', String(result.metrics[metric.key]));
    }
    text(root, 'p', 'insights-description insights-scope-note', 'Applications, Interviews, and Offers use the selected application-date period. Interviews and Offers reflect current status, not historical transitions. Need Attention and Pipeline show your entire current Job Search.');
    if (result.undated > 0) {
      text(root, 'p', 'insights-description', `${result.undated} ${result.undated === 1 ? 'application has' : 'applications have'} no valid application date. Included in All Time totals, but excluded from dated periods and activity bars.`);
    }

    const attention = panel(root, 'Need Attention', 'Your next steps, ordered by urgency.');
    const expanded = Boolean(this.insightsExpanded);
    const attentionRows = expanded ? result.upcoming : result.attention.slice(0, 5);
    if (result.upcoming.length > Math.min(5, result.attention.length) || expanded) {
      button(attention, expanded ? 'Show Less' : 'View Upcoming →', 'insights-upcoming-toggle insights-secondary', () => {
        this.insightsExpanded = !expanded;
        this.renderInsights();
        root.querySelector('.insights-upcoming-toggle')?.focus();
      });
    }
    if (attentionRows.length === 0) {
      text(attention, 'p', 'insights-description insights-caught-up', 'You’re all caught up. No applications need attention right now.');
    }
    const list = text(attention, 'ul', 'insights-attention', '');
    for (const application of attentionRows) {
      const row = text(list, 'li', '', '');
      const source = tracker.rows[application.rowIndex];
      const action = button(row, '', 'insights-attention-row', () => {
        if (this.getTracker() === tracker && tracker.rows[application.rowIndex] === source) {
          this.openListEditModal(application.rowIndex);
        }
      });
      text(action, 'strong', '', application.company || application.position || 'Untitled Application');
      text(action, 'span', '', application.nextAction);
      const due = text(action, 'small', 'insights-due', getDueLabel(application.nextActionDate, now));
      if (application.nextActionDate < [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-')) {
        due.classList.add('is-overdue');
      }
    }

    const activity = panel(root, 'Applications Over Time', 'Applications by application date—not save or sync date.');
    const total = result.activity.reduce((sum, bucket) => sum + bucket.count, 0);
    if (total === 0) {
      text(activity, 'p', 'insights-description insights-caught-up', 'No applications added during this period.');
    } else {
      const chart = text(activity, 'ol', 'insights-activity', '');
      chart.setAttribute('aria-label', 'Applications over time');
      const maximum = Math.max(...result.activity.map(bucket => bucket.count));
      for (const bucket of result.activity) {
        const bar = text(chart, 'li', '', '');
        bar.setAttribute('aria-label', `${bucket.label}: ${bucket.count} applications`);
        text(bar, 'strong', '', String(bucket.count));
        const track = text(bar, 'div', 'insights-activity-track', '');
        const fill = text(track, 'span', '', '');
        fill.style.height = `${bucket.count / maximum * 100}%`;
        fill.setAttribute('aria-hidden', 'true');
        text(bar, 'small', '', bucket.label);
      }
    }
    const grid = text(root, 'div', 'insights-panels', '');
    bars(panel(grid, 'Pipeline Breakdown', 'Current stages across your entire Job Search.'), result.pipeline);
    if (result.metrics.totalApplications > 0 && platformIndex >= 0) {
      bars(panel(grid, 'Applications by Platform', 'Applications in the selected period.'), result.platforms);
    }
    if (result.workSetup.length > 0) {
      bars(panel(grid, 'Work Setup', 'Applications in the selected period.'), result.workSetup);
    }
    if (result.employmentType.length > 0) {
      bars(panel(grid, 'Employment Type', 'Applications in the selected period.'), result.employmentType);
    }
  },
};
