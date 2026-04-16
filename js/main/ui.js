let pressTimer;

export const UIState = {
  activeRow: null,
  activeCol: null,
  activeType: null
};

function getMenu() {
  return document.getElementById('contextMenu');
}

export function showMenu(e, row, col, type) {
  e.preventDefault();
  e.stopPropagation();

  const menu = getMenu();
  if (!menu) return;

  UIState.activeRow = row;
  UIState.activeCol = col;
  UIState.activeType = type;

  menu.style.top = `${e.pageY}px`;
  menu.style.left = `${e.pageX}px`;
  menu.classList.remove('hidden');
}

export function closeMenu() {
  const menu = getMenu();
  if (!menu) return;
  menu.classList.add('hidden');
}

export function startPress(e, row, col, type) {
  if (e.button !== 0) return;

  clearTimeout(pressTimer);

  pressTimer = setTimeout(() => {
    showMenu(e, row, col, type);
  }, 400);
}

export function cancelPress() {
  clearTimeout(pressTimer);
}

/* ✅ ONLY ONE GLOBAL LISTENER */
document.addEventListener('click', (e) => {
  const menu = getMenu();
  if (!menu) return;

  if (!menu.classList.contains('hidden') && !menu.contains(e.target)) {
    closeMenu();
  }
});

/* prevent closing when clicking inside menu */
document.addEventListener('DOMContentLoaded', () => {
  const menu = getMenu();
  if (!menu) return;

  menu.addEventListener('click', (e) => e.stopPropagation());
});