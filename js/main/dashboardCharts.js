const SVG_NS = 'http://www.w3.org/2000/svg';
let chartInstance = 0;

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

function createSmoothPath(points) {
  if (points.length === 0) return '';

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y}`;
  }

  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;

    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const controlOneX = previous.x + (point.x - beforePrevious.x) / 6;
    const controlOneY = previous.y + (point.y - beforePrevious.y) / 6;
    const controlTwoX = point.x - (next.x - previous.x) / 6;
    const controlTwoY = point.y - (next.y - previous.y) / 6;

    return `${path} C ${controlOneX} ${controlOneY}, ${controlTwoX} ${controlTwoY}, ${point.x} ${point.y}`;
  }, '');
}

function getVisualLinePoints(points, chartWidth) {
  if (points.length !== 1) return points;

  const point = points[0];
  const singlePointSpread = Math.min(chartWidth * 0.26, 56);

  return [
    { ...point, x: point.x - singlePointSpread },
    point,
    { ...point, x: point.x + singlePointSpread }
  ];
}

function createLineChart(data) {
  const card = document.createElement('div');
  card.className = 'dashboard-area-card min-w-0 rounded-xl border p-4';

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
    empty.className = 'dashboard-area-empty flex h-48 min-w-[360px] items-center justify-center rounded-lg text-sm';
    empty.textContent = 'No dates found.';
    const emptyScroller = document.createElement('div');
    emptyScroller.className = 'overflow-x-auto';
    emptyScroller.appendChild(empty);
    card.appendChild(emptyScroller);
    return card;
  }

  const width = 420;
  const height = 180;
  const padding = { top: 16, right: 18, bottom: 34, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(...data.map((point) => point.count), 1);
  const step = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;

  const points = data.map((point, index) => {
    const x = padding.left + (data.length > 1 ? index * step : chartWidth / 2);
    const y = padding.top + chartHeight - (point.count / maxCount) * chartHeight;

    return { ...point, x, y };
  });
  const visualLinePoints = getVisualLinePoints(points, chartWidth);
  const baseY = padding.top + chartHeight;
  const linePath = createSmoothPath(visualLinePoints);
  const areaPath = [
    linePath,
    `L ${visualLinePoints[visualLinePoints.length - 1].x} ${baseY}`,
    `L ${visualLinePoints[0].x} ${baseY}`,
    'Z'
  ].join(' ');
  const gradientId = `applicationsAreaGradient-${chartInstance++}`;

  const svg = createSvgElement('svg', {
    class: 'dashboard-area-chart h-48 w-full min-w-[420px]',
    viewBox: `0 0 ${width} ${height}`,
    role: 'img',
    'aria-label': 'Applications over time area chart'
  });

  const defs = createSvgElement('defs');
  const gradient = createSvgElement('linearGradient', {
    id: gradientId,
    x1: 0,
    y1: padding.top,
    x2: 0,
    y2: baseY,
    gradientUnits: 'userSpaceOnUse'
  });

  [
    { offset: '0%', opacity: 0.26 },
    { offset: '48%', opacity: 0.11 },
    { offset: '100%', opacity: 0 }
  ].forEach((stop) => {
    gradient.appendChild(createSvgElement('stop', {
      offset: stop.offset,
      'stop-color': 'var(--dashboard-accent)',
      'stop-opacity': stop.opacity
    }));
  });

  defs.appendChild(gradient);
  svg.appendChild(defs);

  [0, 0.5, 1].forEach((ratio) => {
    const y = padding.top + chartHeight * ratio;

    svg.appendChild(createSvgElement('line', {
      x1: padding.left,
      y1: y,
      x2: width - padding.right,
      y2: y,
      stroke: 'var(--dashboard-grid)',
      'stroke-width': 1
    }));
  });

  const area = createSvgElement('path', {
    class: 'dashboard-area-fill',
    d: areaPath,
    fill: `url(#${gradientId})`
  });
  svg.appendChild(area);

  const line = createSvgElement('path', {
    class: 'dashboard-area-line',
    d: linePath,
    fill: 'none',
    stroke: 'var(--dashboard-accent)',
    'stroke-width': 3,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  });
  svg.appendChild(line);

  const tooltip = createSvgElement('g', {
    class: 'dashboard-area-tooltip',
    opacity: 0
  });
  const tooltipBox = createSvgElement('rect', {
    width: 74,
    height: 38,
    rx: 8,
    fill: 'var(--dashboard-tooltip-bg)'
  });
  const tooltipDate = createSvgElement('text', {
    x: 37,
    y: 15,
    fill: 'var(--dashboard-tooltip-muted)',
    'font-size': 9,
    'font-weight': 500,
    'text-anchor': 'middle'
  });
  const tooltipCount = createSvgElement('text', {
    x: 37,
    y: 29,
    fill: 'var(--dashboard-tooltip-text)',
    'font-size': 11,
    'font-weight': 700,
    'text-anchor': 'middle'
  });
  tooltip.appendChild(tooltipBox);
  tooltip.appendChild(tooltipDate);
  tooltip.appendChild(tooltipCount);

  points.forEach((point) => {
    const marker = createSvgElement('circle', {
      class: 'dashboard-area-point',
      cx: point.x,
      cy: point.y,
      r: 4,
      fill: 'var(--dashboard-card-bg)',
      stroke: 'var(--dashboard-accent)',
      'stroke-width': 2
    });
    svg.appendChild(marker);

    const hitArea = createSvgElement('circle', {
      class: 'dashboard-area-hit',
      cx: point.x,
      cy: point.y,
      r: 14,
      fill: 'transparent'
    });

    const showTooltip = () => {
      const tooltipWidth = 74;
      const tooltipHeight = 38;
      const tooltipX = Math.min(
        Math.max(point.x - tooltipWidth / 2, 4),
        width - tooltipWidth - 4
      );
      const tooltipY = Math.max(point.y - tooltipHeight - 12, 4);

      marker.setAttribute('r', '6');
      tooltip.setAttribute('transform', `translate(${tooltipX} ${tooltipY})`);
      tooltip.setAttribute('opacity', '1');
      tooltipDate.textContent = formatDateLabel(point.date);
      tooltipCount.textContent = `${point.count} application${point.count === 1 ? '' : 's'}`;
    };

    const hideTooltip = () => {
      marker.setAttribute('r', '4');
      tooltip.setAttribute('opacity', '0');
    };

    hitArea.addEventListener('mouseenter', showTooltip);
    hitArea.addEventListener('focus', showTooltip);
    hitArea.addEventListener('mouseleave', hideTooltip);
    hitArea.addEventListener('blur', hideTooltip);
    hitArea.setAttribute('tabindex', '0');
    hitArea.setAttribute('aria-label', `${point.count} application${point.count === 1 ? '' : 's'} on ${formatDateLabel(point.date)}`);
    svg.appendChild(hitArea);

    const dateLabel = createSvgElement('text', {
      x: point.x,
      y: height - 12,
      fill: 'var(--dashboard-axis)',
      'font-size': 10,
      'font-weight': 500,
      'text-anchor': 'middle'
    });
    dateLabel.textContent = formatDateLabel(point.date);
    svg.appendChild(dateLabel);
  });

  svg.appendChild(tooltip);

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
