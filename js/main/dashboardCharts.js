const SVG_NS = 'http://www.w3.org/2000/svg';

function getTotal(counts) {
  return [...counts.values()].reduce((sum, count) => sum + count, 0);
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });

  return element;
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = (angle - 90) * Math.PI / 180;

  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function describeSlice(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    'Z'
  ].join(' ');
}

function getContrastColor(hex) {
  if (!hex) return '#111827';

  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  return yiq >= 150 ? '#111827' : '#ffffff';
}

function truncateLabel(label) {
  return label.length > 10 ? `${label.slice(0, 9)}...` : label;
}

function createPieChart(options, counts, total) {
  const svg = createSvgElement('svg', {
    class: 'h-48 w-full min-w-[220px]',
    viewBox: '0 0 220 220',
    role: 'img',
    'aria-label': 'Option distribution pie chart'
  });

  if (total === 0) {
    svg.appendChild(createSvgElement('circle', {
      cx: 110,
      cy: 110,
      r: 88,
      fill: '#f3f4f6'
    }));
    return svg;
  }

  let angle = 0;

  options.forEach((option) => {
    const count = counts.get(option.label) || 0;
    if (count === 0) return;

    const percent = count / total;
    const startAngle = angle;
    const endAngle = angle + percent * 360;
    const middleAngle = startAngle + (endAngle - startAngle) / 2;
    const textPoint = polarToCartesian(110, 110, 54, middleAngle);

    svg.appendChild(createSvgElement('path', {
      d: describeSlice(110, 110, 88, startAngle, endAngle),
      fill: option.color,
      stroke: '#ffffff',
      'stroke-width': 2
    }));

    const text = createSvgElement('text', {
      x: textPoint.x,
      y: textPoint.y,
      fill: getContrastColor(option.color),
      'font-size': percent < 0.12 ? 9 : 11,
      'font-weight': 600,
      'text-anchor': 'middle',
      'dominant-baseline': 'middle'
    });

    const labelLine = createSvgElement('tspan', {
      x: textPoint.x,
      dy: '-0.35em'
    });
    labelLine.textContent = truncateLabel(option.label);

    const percentLine = createSvgElement('tspan', {
      x: textPoint.x,
      dy: '1.1em'
    });
    percentLine.textContent = `${Math.round(percent * 100)}%`;

    text.appendChild(labelLine);
    text.appendChild(percentLine);
    svg.appendChild(text);

    angle = endAngle;
  });

  return svg;
}

function getColumnName(column) {
  return typeof column === 'object' ? column.name : column;
}

function getDateColumnIndex(tracker) {
  if (!tracker || !Array.isArray(tracker.columns)) return -1;

  const typedIndex = tracker.columns.findIndex((column) => (
    typeof column === 'object' && column.type === 'date'
  ));

  if (typedIndex !== -1) return typedIndex;

  return tracker.columns.findIndex((column) => {
    const name = String(getColumnName(column) || '').trim().toLowerCase();
    return name === 'date' || name === 'date applied';
  });
}

function formatDateLabel(value) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

function getApplicationsOverTime(tracker) {
  const dateIndex = getDateColumnIndex(tracker);
  const dateCounts = new Map();

  if (dateIndex === -1 || !Array.isArray(tracker?.rows)) return [];

  tracker.rows.forEach((row) => {
    const cell = row?.[dateIndex];
    const value = typeof cell === 'object' ? cell.value : cell;
    const date = String(value || '').trim();

    if (!date) return;

    dateCounts.set(date, (dateCounts.get(date) || 0) + 1);
  });

  return [...dateCounts.entries()]
    .sort(([a], [b]) => new Date(a) - new Date(b))
    .map(([date, count]) => ({ date, count }));
}

function createLineChart(data) {
  const card = document.createElement('div');
  card.className = 'min-w-0 rounded-xl border p-4';

  const title = document.createElement('div');
  title.className = 'mb-3 flex items-center justify-between gap-3';

  const heading = document.createElement('h3');
  heading.className = 'text-sm font-semibold text-gray-700';
  heading.textContent = 'Applications Over Time';

  const total = document.createElement('span');
  total.className = 'text-xs text-gray-400';
  total.textContent = `${data.reduce((sum, point) => sum + point.count, 0)} total`;

  title.appendChild(heading);
  title.appendChild(total);
  card.appendChild(title);

  if (data.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'flex h-48 min-w-[360px] items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-400';
    empty.textContent = 'No dates found.';
    const emptyScroller = document.createElement('div');
    emptyScroller.className = 'overflow-x-auto';
    emptyScroller.appendChild(empty);
    card.appendChild(emptyScroller);
    return card;
  }

  const width = 420;
  const height = 180;
  const padding = { top: 16, right: 16, bottom: 38, left: 28 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map((point) => point.count), 1);
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((point, index) => {
    const x = padding.left + (data.length > 1 ? index * step : chartWidth / 2);
    const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;

    return { ...point, x, y };
  });

  const svg = createSvgElement('svg', {
    class: 'h-48 w-full min-w-[420px]',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Applications over time line chart'
  });

  [0, 0.5, 1].forEach((ratio) => {
    const y = padding.top + chartHeight * ratio;

    svg.appendChild(createSvgElement('line', {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: '#f3f4f6',
      'stroke-width': 1
    }));
  });

  points.forEach((point) => {
    svg.appendChild(createSvgElement('line', {
      x1: point.x,
      y1: padding.top + chartHeight,
      x2: point.x,
      y2: point.y,
      stroke: '#e5e7eb',
      'stroke-width': 8,
      'stroke-linecap': 'round'
    }));
  });

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ');
  svg.appendChild(createSvgElement('polyline', {
    points: polyline,
    fill: 'none',
    stroke: '#111827',
    'stroke-width': 3,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  }));

  points.forEach((point) => {
    svg.appendChild(createSvgElement('circle', {
      cx: point.x,
      cy: point.y,
      r: 4,
      fill: '#ffffff',
      stroke: '#111827',
      'stroke-width': 2
    }));

    const countLabel = createSvgElement('text', {
      x: point.x,
      y: Math.max(point.y - 10, 10),
      fill: '#374151',
      'font-size': 10,
      'font-weight': 600,
      'text-anchor': 'middle'
    });
    countLabel.textContent = point.count;
    svg.appendChild(countLabel);

    const dateLabel = createSvgElement('text', {
      x: point.x,
      y: height - 12,
      fill: '#6b7280',
      'font-size': 10,
      'text-anchor': 'middle'
    });
    dateLabel.textContent = formatDateLabel(point.date);
    svg.appendChild(dateLabel);
  });

  const scroller = document.createElement('div');
  scroller.className = 'overflow-x-auto pb-1';
  scroller.appendChild(svg);
  card.appendChild(scroller);
  return card;
}

export function renderDashboardCharts(container, options, counts, tracker) {
  if (!container) return;

  container.innerHTML = '';

  if (!options.length) return;

  const total = getTotal(counts);
  const wrapper = document.createElement('div');
  wrapper.className = 'mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]';

  const pieCard = document.createElement('div');
  pieCard.className = 'min-w-0 rounded-xl border p-4';

  const pieTitle = document.createElement('h3');
  pieTitle.className = 'mb-3 text-sm font-semibold text-gray-700';
  pieTitle.textContent = 'Status Breakdown';

  pieCard.appendChild(pieTitle);
  const pieScroller = document.createElement('div');
  pieScroller.className = 'overflow-x-auto pb-1';
  pieScroller.appendChild(createPieChart(options, counts, total));

  pieCard.appendChild(pieScroller);

  wrapper.appendChild(pieCard);
  wrapper.appendChild(createLineChart(getApplicationsOverTime(tracker)));
  container.appendChild(wrapper);
}
