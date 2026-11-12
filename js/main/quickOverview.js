import { normalizeCellValue } from '../services/trackerData.js';
import { getSelectOptionColor, STATUS_COLORS } from '../services/statusColors.js';

const SUMMARY_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
const TERMINAL_STATUSES = new Set(['rejected', 'withdrawn']);

function normalizedStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function isApplicationNeedingAttention(application, now = new Date()) {
  if (!String(application.nextAction ?? '').trim()
    || !application.nextActionDate
    || TERMINAL_STATUSES.has(normalizedStatus(application.status))) {
    return false;
  }

  let dueDate;
  try {
    dueDate = normalizeCellValue('date', application.nextActionDate, { strict: true });
  } catch {
    return false;
  }

  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowKey = [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, '0'),
    String(tomorrow.getDate()).padStart(2, '0'),
  ].join('-');

  return dueDate <= tomorrowKey;
}

export function getQuickOverviewMetrics(applications, now = new Date()) {
  return applications.reduce((metrics, application) => {
    const status = normalizedStatus(application.status);
    metrics.totalApplications += 1;
    if (status === 'interview') {
      metrics.interviews += 1;
    }
    if (status === 'offer') {
      metrics.offers += 1;
    }
    if (isApplicationNeedingAttention(application, now)) {
      metrics.needAttention += 1;
    }
    return metrics;
  }, {
    totalApplications: 0,
    interviews: 0,
    offers: 0,
    needAttention: 0,
  });
}

export function getStatusSummary(applications, statusColumn) {
  const groups = [...SUMMARY_STATUSES, 'Other'].map(label => {
    const option = statusColumn?.options?.find(item => (
      normalizedStatus(typeof item === 'string' ? item : item?.label) === normalizedStatus(label)
    ));
    return {
      label,
      count: 0,
      color: label === 'Other'
        ? STATUS_COLORS.slate
        : getSelectOptionColor(option || label, { status: true }),
    };
  });

  for (const application of applications) {
    const group = groups.find(item => (
      item.label !== 'Other' && normalizedStatus(item.label) === normalizedStatus(application.status)
    )) || groups[groups.length - 1];
    group.count += 1;
  }

  return groups.filter(group => group.count > 0);
}
