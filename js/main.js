import { setupStorageNotice } from './storage/storageNotice.js';
import { showFlashToast } from './toast.js';

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

function setupFaqAccordion() {
  const faqItems = document.querySelectorAll('[data-faq-item]');
  if (!faqItems.length) return;

  faqItems.forEach((item) => {
    const trigger = item.querySelector('[data-faq-trigger]');
    const content = item.querySelector('[data-faq-content]');
    const icon = item.querySelector('[data-faq-icon]');

    if (!trigger || !content) return;

    trigger.addEventListener('click', () => {
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      const nextState = !isExpanded;

      trigger.setAttribute('aria-expanded', String(nextState));
      content.classList.toggle('hidden', !nextState);

      if (icon) {
        icon.classList.toggle('fa-plus', !nextState);
        icon.classList.toggle('fa-minus', nextState);
      }
    });
  });
}

async function setupAuth() {
  try {
    const [{ Auth }, { authService }] = await Promise.all([
      import('./auth/auth.js'),
      import('./auth/firebaseAuth.js')
    ]);

    new Auth();
    await authService.waitForWorkspace();
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
  setupFaqAccordion();
  syncGuestThemeButton(localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark');
  setupStorageNotice();
  await setupAuth();
  showFlashToast();
}

const componentsReady = new Promise((resolve) => {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('homeBody')) {
      initHomepage()
        .catch((error) => console.error(error))
        .finally(resolve);
      return;
    }

    const theme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    resolve();
  });
});

window.jubroComponentsReady = componentsReady;
