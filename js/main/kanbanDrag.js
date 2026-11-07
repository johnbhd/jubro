const DRAG_TYPE = 'application/x-jubro-card';
const INTERACTIVE = 'button, a, input, select, textarea, [contenteditable], [role="button"]';
let nextDragId = 0;

export function createApplicationDragHandle(document, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'application-drag-handle';
  button.dataset.applicationDragHandle = 'true';
  button.setAttribute('aria-label', `Move ${label}. Drag or use Up and Down arrow keys.`);
  button.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
  button.title = 'Drag to move application';
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-grip-vertical';
  icon.setAttribute('aria-hidden', 'true');
  button.appendChild(icon);
  return button;
}

export function createKanbanDrag(app, tracker) {
  return createCardDrag(app, tracker, app.kanbanColumns, 'kanban');
}

export function createListDrag(app, tracker) {
  if (app.listSortSelect?.value !== 'manual') return null;
  const drag = createCardDrag(app, tracker, app.listCards, 'list');
  drag?.attachColumn(app.listCards, undefined);
  return drag;
}

function createCardDrag(app, tracker, root, activeView) {
  const document = root.ownerDocument;

  // Lightweight renderer fixtures have no browser document or gesture lifecycle.
  if (!document) return null;

  const view = document.defaultView;
  const columns = new Map();
  const cards = new Map();
  const listeners = [];
  let session = null;
  let holdTimer;
  let frame;
  let preview;
  let destination;
  let insertionCard;

  function listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    listeners.push(() => target.removeEventListener(type, handler, options));
  }

  function current() {
    return session && app.getTracker() === tracker
      && tracker.rows === session.rows && tracker.rows[session.index] === session.row
      && root.contains(session.card) && !session.card.classList.contains('hidden')
      && (app.viewSelect?.value || 'kanban') === activeView
      && (activeView !== 'list' || app.listSortSelect?.value === 'manual');
  }

  function placementIn(column) {
    const hit = document.elementFromPoint(session.x, session.y);
    if (hit === session.card || (hit && session.card.contains(hit))) {
      return { targetIndex: session.index, placement: 'after' };
    }
    if (activeView === 'kanban' && hit?.closest('.kanban-column-header')) {
      return { targetIndex: null, placement: 'after' };
    }
    const available = [...cards.entries()].filter(([card]) => (
      card !== session.card && column.contains(card) && !card.classList.contains('hidden')
    ));
    const hovered = available.find(([card]) => card === hit || (hit && card.contains(hit)));
    if (hovered) {
      const [card, item] = hovered;
      const rect = card.getBoundingClientRect();
      return {
        targetIndex: item.index,
        placement: session.y < (rect.top + rect.bottom) / 2 ? 'before' : 'after',
        card,
        row: item.row,
      };
    }
    const next = available.find(([card]) => {
      const rect = card.getBoundingClientRect();
      return session.y < (rect.top + rect.bottom) / 2;
    });
    const target = next || available.at(-1);
    if (!target) {
      return { targetIndex: activeView === 'list' ? session.index : null, placement: 'after' };
    }
    const [card, item] = target;
    // Header and trailing column space append after all destination rows, even hidden ones.
    if (activeView === 'kanban' && session.y > card.getBoundingClientRect().bottom) {
      return { targetIndex: null, placement: 'after' };
    }
    return { targetIndex: item.index, placement: next ? 'before' : 'after', card, row: item.row };
  }

  function highlight(column) {
    destination?.classList.remove('is-drop-target');
    destination?.classList.remove('is-drop-append');
    insertionCard?.classList.remove('drop-before');
    insertionCard?.classList.remove('drop-after');
    insertionCard = null;
    destination = column;
    destination?.classList.add('is-drop-target');
    if (!column || !session) return;
    const placement = placementIn(column);
    insertionCard = placement.card;
    insertionCard?.classList.add(`drop-${placement.placement}`);
    if (placement.targetIndex === null) column.classList.add('is-drop-append');
  }

  function cancel() {
    const previous = session;
    session = null;
    clearTimeout(holdTimer);
    view.cancelAnimationFrame(frame);
    previous?.card.classList.remove('is-dragging');
    if (previous) previous.card.draggable = previous.nativeDraggable;
    root.classList.remove('is-card-dragging');
    preview?.remove();
    preview = null;
    highlight(null);
    if (previous && previous.pointerId !== null && previous.card.hasPointerCapture?.(previous.pointerId)) {
      previous.card.releasePointerCapture(previous.pointerId);
    }
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

    const scrolling = document.scrollingElement;
    const height = view.innerHeight;
    const viewportWidth = view.innerWidth || rect.right;
    if (scrolling && x >= Math.max(0, rect.left) && x <= Math.min(viewportWidth, rect.right)
      && y >= Math.max(0, rect.top) && y <= Math.min(height, rect.bottom)
      && scrolling.scrollHeight > scrolling.clientHeight) {
      let verticalDelta = 0;
      if (y < 40) verticalDelta = -12 * (1 - y / 40);
      else if (y > height - 40) verticalDelta = 12 * (1 - (height - y) / 40);
      if (verticalDelta) {
        scrolling.scrollTop += verticalDelta;
        position();
      }
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
      pointerId: null,
      pointerType: null,
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
    const placement = placementIn(column);
    const validTarget = !placement.card || (
      tracker.rows[placement.targetIndex] === placement.row
      && root.contains(placement.card) && !placement.card.classList.contains('hidden')
    );
    cancel();
    if (!validTarget) return;
    const move = {
      sourceIndex: index,
      targetIndex: placement.targetIndex,
      placement: placement.placement,
    };
    if (status !== null && status !== undefined) move.statusValue = status;
    try {
      if (app.repositionApplication(move)) {
        app.showToast?.(activeView === 'list'
          ? 'Application order updated.'
          : `Application moved in ${status || (status === null ? 'Applications' : 'No status')}.`);
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
  listen(document, 'pointerdown', (event) => {
    if (event.pointerType === 'touch' && session && session.pointerId !== event.pointerId) cancel();
  }, { capture: true });
  listen(document, 'pointermove', (event) => {
    if (!session || session.pointerId === null || event.pointerId !== session.pointerId) return;
    if (!current() || !(event.buttons & 1)) {
      cancel();
      return;
    }
    session.x = event.clientX;
    session.y = event.clientY;
    if (!session.active) {
      const distance = Math.hypot(session.x - session.startX, session.y - session.startY);
      if (session.pointerType === 'touch') {
        if (distance > 8) cancel();
        return;
      }
      if (distance < 8) return;
      activate(true);
    }
    if (session?.active) {
      event.preventDefault();
      position();
    }
  });
  listen(document, 'pointerup', (event) => {
    if (!session || session.pointerId === null || event.pointerId !== session.pointerId) return;
    if (!session.active) {
      cancel();
      return;
    }
    event.preventDefault();
    session.x = event.clientX;
    session.y = event.clientY;
    finish(hitColumn());
  });
  listen(document, 'pointercancel', (event) => {
    if (session?.pointerId === event.pointerId) cancel();
  });
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
    if (session?.active && (session.touchId !== null || session.pointerType === 'touch')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, { capture: true });

  return {
    cancel,
    attachCard(card, index) {
      card.draggable = true;
      cards.set(card, { index, row: tracker.rows[index] });
      let interactiveStart = false;

      listen(card, 'pointerdown', (event) => {
        const handle = event.target.closest('[data-application-drag-handle]');
        interactiveStart = Boolean(event.target.closest(INTERACTIVE)) && !handle;
        if (interactiveStart || !['mouse', 'touch'].includes(event.pointerType)
          || event.button !== 0 || event.isPrimary === false) return;
        begin(card, index, event);
        if (!session) return;
        session.pointerId = event.pointerId;
        session.pointerType = event.pointerType;
        // Keep mouse release in our pointer session instead of handing it to native drag/drop.
        card.draggable = false;
        if (event.pointerType === 'touch') {
          holdTimer = setTimeout(() => activate(true), 300);
        } else event.preventDefault();
        if (event.isTrusted && (handle || event.pointerType === 'mouse')) {
          card.setPointerCapture?.(event.pointerId);
        }
      });
      listen(card, 'keydown', (event) => {
        if (!event.target.closest('[data-application-drag-handle]')
          || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const row = tracker.rows[index];
        if (app.moveApplicationByDirection(index, event.key === 'ArrowUp' ? -1 : 1)) {
          const nextIndex = tracker.rows.indexOf(row);
          root.querySelector(`[data-row-index="${nextIndex}"] [data-application-drag-handle]`)?.focus();
          app.showToast?.('Application order updated.');
        }
      });
      listen(card, 'lostpointercapture', (event) => {
        if (session?.pointerId === event.pointerId) cancel();
      });
      listen(card, 'dragstart', (event) => {
        if (session && (session.touchId !== null || session.pointerId !== null)) {
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
        const handle = event.target.closest('[data-application-drag-handle]');
        if (event.touches.length !== 1 || (event.target.closest(INTERACTIVE) && !handle)) return;
        // A grip keeps its pointer capture and predeclared touch-action; do not restart it as a Touch Event session.
        if (handle && session?.pointerType === 'touch') return;
        const touch = event.touches[0];
        begin(card, index, touch, touch.identifier);
        if (!session) return;
        card.draggable = false;
        holdTimer = setTimeout(() => activate(true), 300);
      }, { passive: true });
    },
    attachColumn(column, status) {
      columns.set(column, status);
      listen(column, 'dragover', (event) => {
        if (!current() || !session.active || session.touchId !== null) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        session.x = event.clientX;
        session.y = event.clientY;
        highlight(column);
      });
      listen(column, 'drop', (event) => {
        event.preventDefault();
        if (session?.touchId === null && event.dataTransfer?.getData(DRAG_TYPE) === session.token) {
          session.x = event.clientX;
          session.y = event.clientY;
          finish(column);
        } else cancel();
      });
    },
    destroy() {
      cancel();
      listeners.forEach(remove => remove());
    },
  };
}
