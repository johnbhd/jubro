import { normalizeCellValue } from '../../services/trackerData.js';
import { getSelectOptionColor, STATUS_COLORS } from '../../services/statusColors.js';
import { getPendingActionDate, getQuickOverviewMetrics, isApplicationNeedingAttention } from '../quickOverview.js';

export const INSIGHTS_PERIODS = [
  ['7-days', '7 Days'],
  ['30-days', '30 Days'],
  ['3-months', '3 Months'],
  ['all-time', 'All Time'],
];

function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function parseDate(value) {
  try {
    return normalizeCellValue('date', value || '', { strict: true }) || null;
  } catch {
    return null;
  }
}

function localDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function normalized(value) {
  return String(value || '').trim().toLowerCase();
}

export function getPeriodRange(period, now = new Date()) {
  if (period === 'all-time') {
    return null;
  }
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === '3-months') {
    const target = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    from.setFullYear(target.getFullYear(), target.getMonth(), Math.min(now.getDate(), lastDay));
    from.setDate(from.getDate() + 1);
  } else {
    from.setDate(from.getDate() - (period === '7-days' ? 6 : 29));
  }
  return { from: dateKey(from), to: dateKey(now) };
}

export function getDueLabel(value, now = new Date()) {
  const key = parseDate(value);
  if (!key) {
    return '';
  }
  const due = localDate(key);
  // Compare calendar days without DST-length days or UTC date parsing.
  const delta = Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())
    - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (delta < 0) {
    const days = Math.abs(delta);
    return `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (delta === 0) {
    return 'Due today';
  }
  if (delta === 1) {
    return 'Due tomorrow';
  }
  return `Due ${due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function breakdown(applications, field, options = [], { status = false, groupUnknown = false } = {}) {
  const groups = options.map(option => ({
    label: typeof option === 'string' ? option : option.label,
    count: 0,
    color: status ? getSelectOptionColor(option, { status: true }) : STATUS_COLORS.blue,
  }));
  for (const application of applications) {
    const value = String(application[field] || '').trim();
    let group = groups.find(item => normalized(item.label) === normalized(value));
    const label = value ? (groupUnknown && !group ? 'Other' : value) : (status ? 'No status' : 'Other');
    if (!group) {
      group = groups.find(item => item.label === label);
    }
    if (!group) {
      group = { label, count: 0, color: STATUS_COLORS.slate };
      groups.push(group);
    }
    group.count += 1;
  }
  return groups.filter(group => group.count > 0);
}

function activityBuckets(applications, period, range) {
  const dates = applications.map(item => parseDate(item.date)).filter(Boolean).sort();
  if (!range && dates.length === 0) {
    return [];
  }
  const start = localDate(range?.from || dates[0]);
  const end = localDate(range?.to || dates[dates.length - 1]);
  if (!range) {
    start.setDate(1);
  }
  const buckets = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const from = dateKey(cursor);
    const label = cursor.toLocaleDateString(undefined, {
      month: 'short',
      ...(period === 'all-time' ? { year: 'numeric' } : { day: 'numeric' }),
    });
    if (period === 'all-time') {
      cursor.setMonth(cursor.getMonth() + 1, 1);
    } else {
      cursor.setDate(cursor.getDate() + (period === '7-days' ? 1 : period === '3-months' ? 7 : 6));
    }
    const next = dateKey(cursor);
    buckets.push({ label, from, count: dates.filter(date => date >= from && date < next).length });
  }
  return buckets;
}

export function getInsights(applications, {
  period = '30-days', now = new Date(), statusColumn, platformColumn,
} = {}) {
  const range = getPeriodRange(period, now);
  const periodApplications = applications.filter(application => {
    const date = parseDate(application.date);
    return !range || (date && date >= range.from && date <= range.to);
  });
  const metrics = getQuickOverviewMetrics(periodApplications, now);
  metrics.needAttention = applications.filter(application => isApplicationNeedingAttention(application, now)).length;
  const upcoming = applications.filter(application => getPendingActionDate(application))
    .slice().sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate));
  return {
    metrics,
    upcoming,
    attention: upcoming.filter(application => isApplicationNeedingAttention(application, now)),
    activity: activityBuckets(periodApplications, period, range),
    pipeline: breakdown(applications, 'status', statusColumn?.options, { status: true }),
    platforms: breakdown(periodApplications, 'platform', platformColumn?.options, { groupUnknown: true }),
    workSetup: breakdown(periodApplications.filter(item => item.workSetup), 'workSetup'),
    employmentType: breakdown(periodApplications.filter(item => item.employmentType), 'employmentType'),
    undated: applications.filter(application => !parseDate(application.date)).length,
  };
}
