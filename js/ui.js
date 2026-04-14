let pressTimer;
const contextMenu = document.getElementById('contextMenu');

export const UIState = {
  activeRow: null,
  activeCol: null,
  activeType: null
};

export function showMenu(e, row, col, type) {
  e.preventDefault();
  e.stopPropagation(); // Stop click from immediately triggering the "close" listener
  
  UIState.activeRow = row;
  UIState.activeCol = col;
  UIState.activeType = type;

  contextMenu.style.top = `${e.pageY}px`;
  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.classList.remove('hidden');
}

export function closeMenu() {
  contextMenu.classList.add('hidden');
}

export function startPress(e, row, col, type) {
  if (e.button !== 0) return; 
  // We clear any existing timer to prevent multiple menus
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    showMenu(e, row, col, type);
  }, 500);
}

export function cancelPress() {
  clearTimeout(pressTimer);
}

// --- NEW: CLOSE ON CLICK OUTSIDE ---
window.addEventListener('click', (e) => {
  // If the menu is open and the click is NOT on the menu itself, close it
  if (!contextMenu.classList.contains('hidden')) {
    if (!contextMenu.contains(e.target)) {
      closeMenu();
    }
  }
});

// Prevent clicks inside the menu from closing it (e.g., clicking between buttons)
contextMenu.addEventListener('click', (e) => e.stopPropagation());