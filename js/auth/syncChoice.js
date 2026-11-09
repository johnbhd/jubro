let choiceQueue = Promise.resolve();

function getSyncChoiceModal() {
  let modal = document.getElementById('syncConflictModal');
  if (modal) {
    return modal;
  }

  modal = document.createElement('div');
  modal.id = 'syncConflictModal';
  modal.className = 'hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'syncConflictTitle');
  modal.setAttribute('aria-describedby', 'syncConflictText');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
      <h2 id="syncConflictTitle" class="text-xl font-semibold text-gray-900"></h2>
      <p id="syncConflictText" class="mt-3 leading-7 text-gray-600"></p>
      <div class="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          id="btnSyncChoiceCancel"
          type="button"
          class="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-900 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        ></button>
        <button
          id="btnSyncChoiceConfirm"
          type="button"
          class="theme-create-button flex-1 rounded-xl bg-black px-4 py-2 font-medium text-white hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        ></button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function showSyncChoice({ title, text, cancelLabel, confirmLabel, requireChoice }) {
  const modal = getSyncChoiceModal();
  const cancelButton = modal.querySelector('#btnSyncChoiceCancel');
  const confirmButton = modal.querySelector('#btnSyncChoiceConfirm');
  const previousFocus = document.activeElement;
  const background = [...document.body.children].filter((element) => element !== modal && !element.inert);

  background.forEach((element) => {
    element.inert = true;
  });

  modal.querySelector('#syncConflictTitle').textContent = title;
  modal.querySelector('#syncConflictText').textContent = text;
  cancelButton.textContent = cancelLabel;
  confirmButton.textContent = confirmLabel;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  return new Promise((resolve) => {
    let settled = false;
    const cleanup = (confirmed) => {
      if (settled) {
        return;
      }
      settled = true;
      cancelButton.removeEventListener('click', cancelHandler);
      confirmButton.removeEventListener('click', confirmHandler);
      document.removeEventListener('keydown', keydownHandler, true);
      document.removeEventListener('focusin', focusHandler);
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
      background.forEach((element) => {
        element.inert = false;
      });
      previousFocus?.focus?.();
      resolve(confirmed);
    };
    const cancelHandler = () => cleanup(false);
    const confirmHandler = () => cleanup(true);
    const focusHandler = (event) => {
      if (!modal.contains(event.target)) {
        cancelButton.focus();
      }
    };
    const keydownHandler = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!requireChoice) {
          cleanup(false);
        }
      } else if (event.key === 'Tab') {
        event.preventDefault();
        const next = document.activeElement === cancelButton ? confirmButton : cancelButton;
        next.focus();
      }
    };

    cancelButton.addEventListener('click', cancelHandler);
    confirmButton.addEventListener('click', confirmHandler);
    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('focusin', focusHandler);
    cancelButton.focus();
  });
}

function presentSyncChoice(details) {
  const choice = choiceQueue.then(() => showSyncChoice(details));
  choiceQueue = choice.catch(() => {});
  return choice;
}

export function confirmTrackerOverwrite({ localTracker, firebaseTracker }) {
  const localTitle = localTracker?.title || 'Untitled Job Search';
  const cloudTitle = firebaseTracker?.title || localTitle;

  return presentSyncChoice({
    title: 'Job Search already exists',
    text: `"${localTitle}" already exists in your account as "${cloudTitle}", but the applications do not match. Replace the account Job Search with this Job Search?`,
    cancelLabel: 'Keep Account',
    confirmLabel: 'Replace Account',
  });
}

export function confirmGuestTransfer({ guestState, accountState }) {
  const guestCount = Object.keys(guestState?.data || {}).length;
  const accountCount = Object.keys(accountState?.data || {}).length;

  return presentSyncChoice({
    title: 'Guest Job Searches found',
    text: `This browser has ${guestCount} guest Job Search${guestCount === 1 ? '' : 'es'}, and your account has ${accountCount}. Would you like to bring the guest Job Searches into this account?`,
    cancelLabel: 'Keep Account Only',
    confirmLabel: 'Bring Guest Job Searches',
    requireChoice: true,
  });
}
