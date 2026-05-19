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

  document.addEventListener('click', (event) => {
    const isMenuOpen = btnMobileMenu?.getAttribute('aria-expanded') === 'true';
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

    if (!isMenuOpen || isDesktop) return;
    if (btnMobileMenu?.contains(event.target) || mobileTrackerMenu?.contains(event.target)) return;

    closeMobileMenu();
  });
}

function syncGuestThemeButton(theme) {
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
  const savedTheme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';

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

function getStatusValue(cell) {
  return String(typeof cell === 'object' ? cell.value : cell || '').trim().toLowerCase();
}

function updateHomepageStats() {
  const activeTrackerCount = document.getElementById('homeActiveTrackerCount');
  const totalApplications = document.getElementById('homeTotalApplications');
  const appliedCount = document.getElementById('homeAppliedCount');
  const interviewCount = document.getElementById('homeInterviewCount');
  const rejectedCount = document.getElementById('homeRejectedCount');

  if (!activeTrackerCount && !totalApplications) return;

  const state = Storage.load();
  const trackers = Object.values(state.data || {});
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
    totalApplications.textContent = String(rows.length);
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
    loadComponent('#navbar', '../components/navbar.html'),
    loadComponent('#footer', '../components/footer.html')
  ]);

  setupMobileMenu();
  setupActiveNavigation();
  syncGuestThemeButton(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
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

    const theme = localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    resolve();
  });
});

window.jubroComponentsReady = componentsReady;
