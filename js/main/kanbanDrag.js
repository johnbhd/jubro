const DRAG_TYPE = 'application/x-jubro-card';
const INTERACTIVE = 'button, a, input, select, textarea, [contenteditable], [role="button"]';
let nextDragId = 0;

export function createKanbanDrag(app, tracker) {
  const root = app.kanbanColumns;
  const document = root.ownerDocument;

  // Lightweight renderer fixtures have no browser document or gesture lifecycle.
  if (!document) return null;

  const view = document.defaultView;
  const columns = new Map();
  const listeners = [];
  let session = null;
  let holdTimer;
  let frame;
  let preview;
  let destination;

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function current() {
    return session && app.getTracker() === tracker
      && tracker.rows === session.rows && tracker.rows[session.index] === session.row
      && root.contains(session.card) && (app.viewSelect?.value || 'kanban') === 'kanban';
  }

  function highlight(column) {
    destination?.classList.remove('is-drop-target');
    destination = column;
    destination?.classList.add('is-drop-target');
  }

  function cancel() {
    clearTimeout(holdTimer);
    view.cancelAnimationFrame(frame);
    session?.card.classList.remove('is-dragging');
    if (session) session.card.draggable = session.nativeDraggable;
    root.classList.remove('is-card-dragging');
    preview?.remove();
    preview = null;
    highlight(null);
    session = null;
  }

  function hitColumn() {
    const hit = document.elementFromPoint(session.x, session.y);
    return [...columns.keys()].find(column => column === hit || (hit && column.contains(hit))) || null;
  }

  function position() {
    if (preview) {
      preview.style.transform = `translate(${session.x - session.offsetX}px, ${session.y - session.offsetY}px)`;
    }
    highlight(hitColumn());
  }

  function scroll() {
    if (!current()) {
      cancel();
      return;
    }
    const rect = root.getBoundingClientRect();
    const { x, y } = session;
    let delta = 0;

    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      if (x < rect.left + 40) delta = -12 * (1 - (x - rect.left) / 40);
      else if (x > rect.right - 40) delta = 12 * (1 - (rect.right - x) / 40);
    }
    if (delta && root.scrollWidth > root.clientWidth) {
      root.scrollLeft += delta;
      position();
    }

    frame = view.requestAnimationFrame(scroll);
  }

  function activate(touch) {
    if (!current()) {
      cancel();
      return;
    }
    session.active = true;
    session.card.classList.add('is-dragging');
    root.classList.add('is-card-dragging');
    if (touch) {
      const rect = session.card.getBoundingClientRect();
      preview = session.card.cloneNode(true);
      preview.removeAttribute?.('id');
      preview.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      preview.classList.remove('is-dragging');
      preview.classList.add('kanban-drag-preview');
      preview.setAttribute('aria-hidden', 'true');
      preview.setAttribute('inert', '');
      preview.draggable = false;
      preview.style.width = `${rect.right - rect.left}px`;
      document.body.appendChild(preview);
      view.getSelection?.()?.removeAllRanges();
      position();
    }
    frame = view.requestAnimationFrame(scroll);
  }

  function begin(card, index, point, touchId = null) {
    cancel();
    const row = tracker.rows[index];
    if (!Array.isArray(row)) return;
    const rect = card.getBoundingClientRect();
    session = {
      card, index, row, rows: tracker.rows, touchId, active: false,
      token: String(++nextDragId), x: point.clientX, y: point.clientY,
      nativeDraggable: card.draggable,
      startX: point.clientX, startY: point.clientY,
      offsetX: point.clientX - rect.left, offsetY: point.clientY - rect.top,
    };
  }

  function finish(column) {
    if (!current() || !session.active || !columns.has(column)) {
      cancel();
      return;
    }
    const { index } = session;
    const status = columns.get(column);
    const source = session.card.closest('[data-kanban-status]')?.dataset.kanbanStatus;
    cancel();
    if (source === status) return;
    try {
      if (app.moveKanbanRow(index, status)) {
        app.showToast?.(`Application moved to ${status || 'No status'}.`);
      }
    } catch {
      app.showToast?.('Could not move application. Saved data has been restored.');
    }
  }

  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape' && session) {
      event.preventDefault();
      cancel();
    }
  });
  listen(view, 'blur', cancel);
  listen(view, 'pagehide', cancel);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) cancel();
  });
  listen(document, 'drop', cancel);
  listen(document, 'dragover', (event) => {
    if (!session?.active || session.touchId !== null) return;
    session.x = event.clientX;
    session.y = event.clientY;
    position();
  });
  listen(document, 'touchstart', (event) => {
    if (event.touches.length !== 1) cancel();
  }, { passive: true, capture: true });
  listen(document, 'touchmove', (event) => {
    if (!session || session.touchId === null) return;
    const touch = [...event.touches].find(item => item.identifier === session.touchId);
    if (!touch || event.touches.length !== 1 || !current()) {
      cancel();
      return;
    }
    if (!session.active) {
      if (Math.hypot(touch.clientX - session.startX, touch.clientY - session.startY) > 8) cancel();
      return;
    }
    if (!event.cancelable) {
      cancel();
      return;
    }
    event.preventDefault();
    session.x = touch.clientX;
    session.y = touch.clientY;
    position();
  }, { passive: false });
  listen(document, 'touchend', (event) => {
    if (!session || session.touchId === null) return;
    const touch = [...event.changedTouches].find(item => item.identifier === session.touchId);
    if (!touch) return;
    if (session.active) {
      event.preventDefault();
      session.x = touch.clientX;
      session.y = touch.clientY;
      finish(hitColumn());
    } else cancel();
  }, { passive: false });
  listen(document, 'touchcancel', cancel);
  listen(root, 'contextmenu', (event) => {
    if (session?.touchId !== null && session?.active) event.preventDefault();
  });

  return {
    attachCard(card, index) {
      card.draggable = true;
      let interactiveStart = false;

      listen(card, 'pointerdown', (event) => {
        interactiveStart = Boolean(event.target.closest(INTERACTIVE));
      });
      listen(card, 'dragstart', (event) => {
        if (session?.touchId !== null && session) {
          event.preventDefault();
          return;
        }
        if (interactiveStart || event.target.closest(INTERACTIVE) || !event.dataTransfer) {
          event.preventDefault();
          return;
        }
        begin(card, index, event);
        if (!session) return;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_TYPE, session.token);
        activate(false);
      });
      listen(card, 'dragend', cancel);
      listen(card, 'touchstart', (event) => {
        if (event.touches.length !== 1 || event.target.closest(INTERACTIVE)) return;
        const touch = event.touches[0];
        begin(card, index, touch, touch.identifier);
        if (!session) return;
        card.draggable = false;
        holdTimer = setTimeout(() => activate(true), 300);
      }, { passive: true });
    },
    attachColumn(column, status) {
      if (status === null) return;
      columns.set(column, status);
      listen(column, 'dragover', (event) => {
        if (!current() || !session.active || session.touchId !== null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        highlight(column);
      });
      listen(column, 'drop', (event) => {
        event.preventDefault();
        if (session?.touchId === null && event.dataTransfer?.getData(DRAG_TYPE) === session.token) finish(column);
        else cancel();
      });
    },
    destroy() {
      cancel();
      listeners.forEach(remove => remove());
    },
  };
}
