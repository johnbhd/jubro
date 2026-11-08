const PLATFORM_DOMAINS = {
  linkedin: 'linkedin.com',
  indeed: 'indeed.com',
  jobstreet: 'jobstreet.com',
  upwork: 'upwork.com',
  onlinejobsph: 'onlinejobs.ph',
  'online jobs ph': 'onlinejobs.ph',
  glassdoor: 'glassdoor.com',
  monster: 'monster.com',
  'company website': ''
};

function normalizePlatform(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[^a-z0-9. ]/g, '')
    .replace(/\s+/g, ' ');
}

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

export function getLinkFavicon(link) {
  try {
    if (!link || typeof link !== 'string') {
      return {
        hostname: '',
        url: ''
      };
    }

    const { hostname, protocol } = new URL(link.trim());

    if (protocol !== 'http:' && protocol !== 'https:') {
      return {
        hostname: '',
        url: ''
      };
    }

    if (!hostname) {
      return {
        hostname: '',
        url: ''
      };
    }

    return {
      hostname,
      url: faviconUrl(hostname)
    };
  } catch {
    return {
      hostname: '',
      url: ''
    };
  }
}

export function createCompanyFaviconElement(jobLink, company) {
  const container = document.createElement('div');
  container.className = 'kanban-card-favicon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-700 font-semibold text-sm select-none overflow-hidden';

  const cleanCompany = String(company || '').trim();
  const initial = (cleanCompany && cleanCompany !== '-' && cleanCompany !== 'Untitled company')
    ? cleanCompany.charAt(0).toUpperCase()
    : '';

  const renderFallback = () => {
    container.replaceChildren();
    if (initial) {
      const span = document.createElement('span');
      span.textContent = initial;
      container.appendChild(span);
    } else {
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-briefcase text-xs text-gray-400';
      container.appendChild(icon);
    }
  };

  const favicon = getLinkFavicon(jobLink);
  if (!favicon.url) {
    renderFallback();
    return container;
  }

  const image = document.createElement('img');
  image.src = favicon.url;
  image.alt = '';
  image.className = 'h-full w-full object-contain p-1';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    renderFallback();
  });
  container.appendChild(image);

  return container;
}

export function getJobSiteIcon(jobLink, company) {
  return createCompanyFaviconElement(jobLink, company);
}

export function getPlatformFavicon(platform) {
  const normalized = normalizePlatform(platform);
  const compact = normalized.replace(/\s+/g, '');
  const mappedDomain = PLATFORM_DOMAINS[normalized] || PLATFORM_DOMAINS[compact];
  const guessedDomain = normalized.includes('.')
    ? normalized.split('/')[0]
    : compact
      ? `${compact}.com`
      : '';
  const domain = mappedDomain ?? guessedDomain;

  return {
    hostname: domain,
    url: domain ? faviconUrl(domain) : ''
  };
}

export function createFaviconElement(favicon) {
  const holder = document.createElement('span');
  holder.className = 'favicon-holder';

  if (!favicon?.url) {
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-globe text-[11px] text-gray-500';
    holder.appendChild(icon);
    return holder;
  }

  const image = document.createElement('img');
  image.src = favicon.url;
  image.alt = '';
  image.className = 'h-5 w-5 rounded';
  image.loading = 'lazy';
  image.referrerPolicy = 'no-referrer';
  image.addEventListener('error', () => {
    holder.innerHTML = '<i class="fa-solid fa-globe text-[11px] text-gray-500"></i>';
  });
  holder.appendChild(image);

  return holder;
}
