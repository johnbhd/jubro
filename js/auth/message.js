export class Message {
  init(container) {
    this.el = document.createElement('p');
    this.el.className = 'text-sm mb-3 hidden text-center';

    const title = container.querySelector('#authTitle');

    if (title) {
      title.insertAdjacentElement('afterend', this.el); // ✅ correct position
    } else {
      container.prepend(this.el); // fallback
    }
  }

  show(text, type = 'error') {
    this.el.textContent = text;
    this.el.classList.remove('hidden', 'text-red-500', 'text-green-500');

    this.el.classList.add(
      type === 'success' ? 'text-green-500' : 'text-red-500'
    );
  }

  clear() {
    this.el.textContent = '';
    this.el.classList.add('hidden');
  }
}