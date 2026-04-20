let pressTimer;

export const UIState = {
  activeRow: null,
  activeCol: null,
  activeType: null
};

function getMenu() {
  return document.getElementById('contextMenu');
}
export function showMenu(e, rowIndex, colIndex, type) {
  e.preventDefault();

  const menu = document.getElementById('contextMenu');

  UIState.activeRow = rowIndex;
  UIState.activeCol = colIndex;
  UIState.activeType = type;
  
  menu.classList.remove('hidden');
  menu.style.top = e.pageY + 'px';
  menu.style.left = e.pageX + 'px';

  
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
  
  [
    btnAddRow, btnAddCol,
    btnMoveUp, btnMoveDown,
    btnMoveLeft, btnMoveRight,
    btnDelRow, btnDelCol,
    btnCustomize, subMenu
  ].forEach(btn => btn.classList.add('hidden'));

  if (type === 'row') {
    btnAddRow.classList.remove('hidden');
    btnMoveUp.classList.remove('hidden');
    btnMoveDown.classList.remove('hidden');
    btnDelRow.classList.remove('hidden');
  }
  if (type === 'row') {
    btnAddRow.classList.remove('hidden');
    btnMoveUp.classList.remove('hidden');
    btnMoveDown.classList.remove('hidden');
    btnDelRow.classList.remove('hidden');
  
    btnCustomize.classList.remove('hidden');
  }
  
  if (type === 'col') {
    btnAddCol.classList.remove('hidden');
    btnMoveLeft.classList.remove('hidden');
    btnMoveRight.classList.remove('hidden');
    btnDelCol.classList.remove('hidden');
  }
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
  
  const btnCustomize = document.getElementById('btn-customize');
  const subMenu = document.getElementById('subMenu');

  btnCustomize?.addEventListener('mouseenter', () => {
    subMenu.classList.remove('hidden');
  });

  btnCustomize?.addEventListener('mouseleave', () => {
    setTimeout(() => subMenu.classList.add('hidden'), 200);
  });

  subMenu?.addEventListener('mouseenter', () => {
    subMenu.classList.remove('hidden');
  });

  subMenu?.addEventListener('mouseleave', () => {
    subMenu.classList.add('hidden');
  });

  menu.addEventListener('click', (e) => e.stopPropagation());
});