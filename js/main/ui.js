let pressTimer;

export const UIState = {
  activeRow: null,
  activeCol: null,
  activeType: null
};

function resetActiveTarget() {
  UIState.activeRow = null;
  UIState.activeCol = null;
  UIState.activeType = null;
}

export function setActiveTarget(rowIndex, colIndex, type) {
  UIState.activeRow = rowIndex;
  UIState.activeCol = colIndex;
  UIState.activeType = type;
}

export function clearActiveTarget(rowIndex, colIndex, type) {
  const menu = getMenu();

  if (menu && !menu.classList.contains('hidden')) {
    return;
  }

  if (
    UIState.activeRow === rowIndex
    && UIState.activeCol === colIndex
    && UIState.activeType === type
  ) {
    UIState.activeRow = null;
    UIState.activeCol = null;
    UIState.activeType = null;
  }
}

function getMenu() {
  return document.getElementById('contextMenu');
}

function placeFloatingMenu(menu, x, y) {
  const viewportPadding = 8;

  menu.style.left = `${viewportPadding}px`;
  menu.style.top = `${viewportPadding}px`;

  const rect = menu.getBoundingClientRect();
  const maxLeft = window.innerWidth - rect.width - viewportPadding;
  const maxTop = window.innerHeight - rect.height - viewportPadding;
  const left = Math.max(viewportPadding, Math.min(x, maxLeft));
  const top = Math.max(viewportPadding, Math.min(y, maxTop));

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}

export function showMenu(e, rowIndex, colIndex, type) {
  e.preventDefault();

  const menu = document.getElementById('contextMenu');

  setActiveTarget(rowIndex, colIndex, type);
  
  menu.classList.remove('hidden');
  placeFloatingMenu(menu, e.clientX, e.clientY);

  
  const btnAddRow = document.getElementById('btn-addRow');
  const btnAddCol = document.getElementById('btn-addCol');
  const btnMoveUp = document.getElementById('btn-moveUp');
  const btnMoveDown = document.getElementById('btn-moveDown');
  const btnMoveLeft = document.getElementById('btn-moveLeft');
  const btnMoveRight = document.getElementById('btn-moveRight');
  const btnDelRow = document.getElementById('btn-delRow');
  const btnDelCol = document.getElementById('btn-delCol');
  const btnCustomize = document.getElementById('btn-customize');
  const subMenu = document.getElementById('subMenu');
  const btnCopyRow = document.getElementById('btn-copyRow');
  const btnCopyCol = document.getElementById('btn-copyCol');
  
  [
    btnAddRow, btnAddCol,
    btnMoveUp, btnMoveDown,
    btnMoveLeft, btnMoveRight,
    btnDelRow, btnDelCol,
    btnCustomize, subMenu,
    btnCopyRow, btnCopyCol
  ].forEach(btn => btn.classList.add('hidden'));

  if (type === 'row') {
    btnAddRow.classList.remove('hidden');
    btnDelRow.classList.remove('hidden');
    btnCopyRow.classList.remove('hidden');
    btnMoveUp.classList.remove('hidden');
    btnMoveDown.classList.remove('hidden');
  }
  
  if (type === 'col') {
    btnAddCol.classList.remove('hidden');
    btnDelCol.classList.remove('hidden');
    btnCopyCol.classList.remove('hidden');
    btnCustomize.classList.remove('hidden');
    btnMoveLeft.classList.remove('hidden');
    btnMoveRight.classList.remove('hidden');
  }
}

export function closeMenu() {
  const menu = getMenu();
  if (!menu) return;
  menu.classList.add('hidden');
  resetActiveTarget();
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

  const btnCustomize = document.getElementById('btn-customize');
  const subMenu = document.getElementById('subMenu');

  btnCustomize?.addEventListener('click', (e) => {
    e.stopPropagation();
    subMenu.classList.toggle('hidden');
  });

  subMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) {
      subMenu.classList.add('hidden');
    }
  });

  menu.addEventListener('click', (e) => e.stopPropagation());
});
