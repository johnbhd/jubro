export function setupStorageNotice() {
  if (document.getElementById('jubroStorageNotice')) return;

  const notice = document.createElement('div');

  notice.id = 'jubroStorageNotice';
  notice.className = 'hidden fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-xl';
  notice.setAttribute('role', 'alert');
  notice.setAttribute('aria-live', 'assertive');
  notice.setAttribute('aria-atomic', 'true');
  notice.innerHTML = `
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p id="jubroStorageNoticeText" class="text-sm leading-6"></p>
      <button type="button" class="shrink-0 rounded-lg bg-amber-950 px-4 py-2 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950">
        Reload latest data
      </button>
    </div>
  `;

  const text = notice.querySelector('#jubroStorageNoticeText');
  const reloadButton = notice.querySelector('button');
  const show = (message) => {
    text.textContent = message;
    notice.classList.remove('hidden');
  };

  reloadButton.addEventListener('click', () => window.location.reload());
  document.addEventListener('jubro:external-storage-change', () => {
    show('Jubro changed in another tab. Reload the latest data before making more changes.');
  });
  document.addEventListener('jubro:storage-conflict', () => {
    show('Your change was not saved because Jubro changed in another tab. Reload the latest data and try again.');
  });
  document.addEventListener('tracker:sync-error', () => {
    show('Cloud sync failed. Your local data remains on this device. Reload to try again.');
  });

  document.body.appendChild(notice);
}
