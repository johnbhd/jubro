import { Storage } from './storage/storage.js';

const THEME_KEY = 'jubro_theme';

export async function loadComponent(selector, componentPath) {
  const container = document.querySelector(selector);

  if (!container) return;

  const response = await fetch(componentPath);

  if (!response.ok) {
    throw new Error(`Failed to load component: ${componentPath}`);
  }

  container.innerHTML = await response.text();
}

function setupMobileMenu() {
  const btnMobileMenu = document.getElementById('btnMobileMenu');
  const mobileTrackerMenu = document.getElementById('mobileTrackerMenu');
  const btnOpenModal = document.getElementById('btnOpenModal');

  const closeMobileMenu = () => {
    const icon = btnMobileMenu?.querySelector('i');

    btnMobileMenu?.setAttribute('aria-expanded', 'false');
    mobileTrackerMenu?.classList.add('hidden');
    icon?.classList.add('fa-bars');
    icon?.classList.remove('fa-xmark');
  };

  btnMobileMenu?.addEventListener('click', () => {
    const isOpen = btnMobileMenu.getAttribute('aria-expanded') === 'true';
    const icon = btnMobileMenu.querySelector('i');

    btnMobileMenu.setAttribute('aria-expanded', String(!isOpen));
    mobileTrackerMenu?.classList.toggle('hidden', isOpen);
    icon?.classList.toggle('fa-bars', isOpen);
    icon?.classList.toggle('fa-xmark', !isOpen);
  });

  btnOpenModal?.addEventListener('click', () => {
    if (!window.matchMedia('(max-width: 1023px)').matches) return;

    closeMobileMenu();
  });

  document.addEventListener('click', (event) => {
    const isMenuOpen = btnMobileMenu?.getAttribute('aria-expanded') === 'true';
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (!isMenuOpen || isDesktop) return;
    if (btnMobileMenu?.contains(event.target) || mobileTrackerMenu?.contains(event.target)) return;

    closeMobileMenu();
  });
}

function setupScrollAwareNavbar() {
  const navbar = document.getElementById('siteNavbar');
  const mobileMenuButton = document.getElementById('btnMobileMenu');

  if (!navbar) return;

  const scrollThreshold = 50;
  const directionThreshold = 6;
  let lastScrollY = Math.max(0, window.scrollY);
  let isScrolled = lastScrollY > scrollThreshold;
  let isNavbarVisible = true;
  let frameRequested = false;

  const applyState = (nextScrolled, nextVisible) => {
    if (nextScrolled !== isScrolled) {
      isScrolled = nextScrolled;
      navbar.classList.toggle('is-scrolled', isScrolled);
    }

    if (nextVisible !== isNavbarVisible) {
      isNavbarVisible = nextVisible;
      navbar.classList.toggle('is-hidden', !isNavbarVisible);
    }
  };

  const updateNavbar = () => {
    frameRequested = false;

    const currentScrollY = Math.max(0, window.scrollY);
    const scrollDifference = currentScrollY - lastScrollY;
    const isMobileMenuOpen = mobileMenuButton?.getAttribute('aria-expanded') === 'true';
    const nextScrolled = currentScrollY > scrollThreshold;
    let nextVisible = isNavbarVisible;

    if (!nextScrolled || isMobileMenuOpen) {
      nextVisible = true;
    } else if (scrollDifference >= directionThreshold) {
      nextVisible = false;
    } else if (scrollDifference <= -directionThreshold) {
      nextVisible = true;
    }

    applyState(nextScrolled, nextVisible);

    if (Math.abs(scrollDifference) >= directionThreshold || !nextScrolled) {
      lastScrollY = currentScrollY;
    }
  };

  const requestNavbarUpdate = () => {
    if (frameRequested) return;

    frameRequested = true;
    window.requestAnimationFrame(updateNavbar);
  };

  navbar.classList.toggle('is-scrolled', isScrolled);
  window.addEventListener('scroll', requestNavbarUpdate, { passive: true });

  mobileMenuButton?.addEventListener('click', () => {
    isNavbarVisible = true;
    navbar.classList.remove('is-hidden');
    lastScrollY = Math.max(0, window.scrollY);
  });
}

function syncGuestThemeButton(theme) {
  theme = theme === 'light' ? 'light' : 'dark';
  const isDark = theme === 'dark';
  const themeButton = document.getElementById('btnGuestTheme');
  const themeIcon = themeButton?.querySelector('i');
  const themeLabel = themeButton?.querySelector('span');

  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.classList.toggle('dark', isDark);
  themeIcon?.classList.toggle('fa-moon', !isDark);
  themeIcon?.classList.toggle('fa-sun', isDark);
  themeLabel && (themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode');
  themeButton?.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
}

function setupFallbackThemeToggle() {
  const savedTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';

  syncGuestThemeButton(savedTheme);

  document.getElementById('btnGuestTheme')?.addEventListener('click', () => {
    const nextTheme = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    syncGuestThemeButton(nextTheme);
  });
}

function setupActiveNavigation() {
  const page = document.body.dataset.page || 'homepage';
  const activeLink = page === 'tracker' ? 'trackers' : 'home';
  const activeClasses = ['bg-gray-900', 'font-semibold', 'text-white', 'hover:bg-gray-800'];
  const inactiveClasses = ['font-medium', 'text-gray-700', 'hover:bg-gray-200', 'hover:text-gray-950'];

  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const isActive = link.dataset.navLink === activeLink;

    link.classList.remove(...activeClasses, ...inactiveClasses);
    link.classList.add(...(isActive ? activeClasses : inactiveClasses));

    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function getBoardUrl(trackerId) {
  const query = `tracker=${encodeURIComponent(trackerId)}`;

  if (window.location.pathname.includes('/pages/')) {
    return `./board.html?${query}`;
  }

  return `/board/?${query}`;
}

function getStatusValue(cell) {
  return String(typeof cell === 'object' ? cell.value : cell || '').trim().toLowerCase();
}

function getCellValue(row, index) {
  const cell = row?.[index];
  return typeof cell === 'object' ? cell.value : cell;
}

function getColumnIndex(tracker, names, fallbackIndex) {
  const wantedNames = names.map((name) => name.toLowerCase());
  const index = tracker?.columns?.findIndex((column) => {
    const columnName = String(typeof column === 'object' ? column.name : column || '').trim().toLowerCase();
    return wantedNames.includes(columnName);
  });

  return index >= 0 ? index : fallbackIndex;
}

function getStatusClasses(status) {
  const normalized = String(status || '').trim().toLowerCase();

  if (normalized === 'applied') {
    return 'rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700';
  }

  if (normalized === 'interview') {
    return 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700';
  }

  if (normalized === 'rejected') {
    return 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700';
  }

  return 'rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700';
}

function updateHomepagePreviewRows(tracker) {
  const previewRows = document.querySelectorAll('#homePreviewRows > div');
  if (!previewRows.length) return;

  const rows = Array.isArray(tracker?.rows) ? tracker.rows.slice(0, 3) : [];
  const companyIndex = getColumnIndex(tracker, ['company'], 0);
  const positionIndex = getColumnIndex(tracker, ['position', 'role', 'job title'], 1);
  const platformIndex = getColumnIndex(tracker, ['platform', 'source', 'location'], 2);
  const statusIndex = getColumnIndex(tracker, ['status'], 3);

  previewRows.forEach((card, index) => {
    const row = rows[index];
    const title = card.querySelector('[data-preview-title]');
    const subtitle = card.querySelector('[data-preview-subtitle]');
    const status = card.querySelector('[data-preview-status]');

    card.classList.toggle('hidden', !row);
    if (!row) return;

    const company = getCellValue(row, companyIndex) || 'Unknown company';
    const position = getCellValue(row, positionIndex) || 'Untitled position';
    const platform = getCellValue(row, platformIndex) || 'No platform';
    const statusText = getCellValue(row, statusIndex) || 'Pending';

    title.textContent = position;
    subtitle.textContent = `${company} - ${platform}`;
    status.textContent = statusText;
    status.className = getStatusClasses(statusText);
  });
}

function updateHomepageStats() {
  const activeTrackerCount = document.getElementById('homeActiveTrackerCount');
  const totalApplications = document.getElementById('homeTotalApplications');
  const appliedCount = document.getElementById('homeAppliedCount');
  const interviewCount = document.getElementById('homeInterviewCount');
  const rejectedCount = document.getElementById('homeRejectedCount');
  const previewBoardTitle = document.getElementById('homePreviewBoardTitle');
  const previewBoardEntries = document.getElementById('homePreviewBoardEntries');
  const previewBoardLink = document.getElementById('homePreviewBoardLink');

  if (!activeTrackerCount && !totalApplications) return;

  const state = Storage.load();
  const trackerEntries = Object.entries(state.data || {});
  const trackers = trackerEntries.map(([, tracker]) => tracker);
  const activeTrackerId = state.active && state.data?.[state.active]
    ? state.active
    : trackerEntries
        .map(([id]) => id)
        .sort((a, b) => {
          const aNumber = Number(a);
          const bNumber = Number(b);

          if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
            return bNumber - aNumber;
          }

          return String(b).localeCompare(String(a));
        })[0];
  const activeTracker = activeTrackerId ? state.data[activeTrackerId] : null;
  const rows = trackers.flatMap((tracker) => Array.isArray(tracker.rows) ? tracker.rows : []);
  const statusCounts = rows.reduce((counts, row) => {
    const status = getStatusValue(row?.[3]);
    if (status) counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  if (activeTrackerCount) {
    activeTrackerCount.textContent = `${trackers.length} Active`;
  }

  if (totalApplications) {
    totalApplications.textContent = String(trackers.length);
  }

  if (appliedCount) {
    appliedCount.textContent = String(statusCounts.applied || 0);
  }

  if (interviewCount) {
    interviewCount.textContent = String(statusCounts.interview || 0);
  }

  if (rejectedCount) {
    rejectedCount.textContent = String(statusCounts.rejected || 0);
  }

  if (previewBoardTitle) {
    previewBoardTitle.textContent = activeTracker?.title || 'No board yet';
  }

  if (previewBoardEntries) {
    const count = Array.isArray(activeTracker?.rows) ? activeTracker.rows.length : 0;
    previewBoardEntries.textContent = `${count} ${count === 1 ? 'entry' : 'entries'}`;
  }

  if (previewBoardLink) {
    previewBoardLink.href = activeTrackerId
      ? getBoardUrl(activeTrackerId)
      : '/trackers';
  }

  updateHomepagePreviewRows(activeTracker);
}

async function setupAuth() {
  try {
    const { Auth } = await import('./auth/auth.js');
    new Auth();
  } catch (error) {
    console.error(error);
    setupFallbackThemeToggle();
  }
}

async function initHomepage() {
  await Promise.all([
    loadComponent('#navbar', '/components/navbar.html'),
    loadComponent('#footer', '/components/footer.html')
  ]);

  setupMobileMenu();
  setupScrollAwareNavbar();
  setupActiveNavigation();
  syncGuestThemeButton(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');
  setupAuth();
}

const componentsReady = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('homeBody')) {
      initHomepage()
        .catch((error) => console.error(error))
        .finally(() => {
          updateHomepageStats();
          resolve();
        });
      return;
    }

    const theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    resolve();
  });
});

window.jubroComponentsReady = componentsReady;
