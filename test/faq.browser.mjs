import assert from 'node:assert/strict';

export async function verifyFaq({ command, evaluate, context, theme, width }) {
  await command('browsingContext.activate', { context });
  const layout = await evaluate(`
    const items = [...document.querySelectorAll('[data-faq-item]')];
    const triggers = items.map(item => item.querySelector('[data-faq-trigger]'));
    const before = localStorage.getItem('flextracker_data');
    const failures = [];
    function check(value, message) {
      if (!value) failures.push(message);
    }
    function luminance(color) {
      const channels = color.match(/[\\d.]+/g).slice(0, 3).map(Number).map(value => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    function readable(color, background) {
      const values = [luminance(color), luminance(background)];
      return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05) >= 4.5;
    }
    check(items.length === 5, 'Five FAQ cards remain');
    check(triggers.every(trigger => trigger.getAttribute('aria-expanded') === 'false'), 'Answers start closed');
    check(getComputedStyle(document.querySelector('.faq-list')).gap === (innerWidth < 640 ? '12px' : '16px'), 'Responsive card gaps');
    for (const item of items) {
      const trigger = item.querySelector('[data-faq-trigger]');
      const answer = item.querySelector('[data-faq-content]');
      const surface = getComputedStyle(item);
      const question = getComputedStyle(trigger);
      check(trigger.getBoundingClientRect().height >= 64, 'Question touch target');
      check(question.paddingLeft === (innerWidth < 640 ? '20px' : '24px'), 'Question padding');
      check(readable(question.color, surface.backgroundColor), 'Question contrast');
      trigger.click();
      check(trigger.getAttribute('aria-expanded') === 'true' && getComputedStyle(answer).display !== 'none', 'Answer opens');
      check(trigger.getAttribute('aria-controls') === answer.id && answer.getAttribute('aria-labelledby') === trigger.id, 'ARIA linkage');
      check(getComputedStyle(answer).paddingLeft === question.paddingLeft, 'Answer text alignment');
      check(readable(getComputedStyle(answer).color, surface.backgroundColor), 'Answer contrast');
      check(item.scrollWidth <= item.clientWidth && answer.scrollWidth <= answer.clientWidth, 'Card content fits');
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        check([item, trigger, item.querySelector('.faq-icon-badge'), item.querySelector('[data-faq-icon]')]
          .every(node => getComputedStyle(node).transitionDuration === '0s'), 'Reduced motion disables transitions');
      }
      trigger.click();
      check(trigger.getAttribute('aria-expanded') === 'false' && getComputedStyle(answer).display === 'none', 'Answer closes');
    }
    const first = triggers[0];
    first.scrollIntoView({ block: 'center', behavior: 'instant' });
    const bounds = first.getBoundingClientRect();
    check(bounds.left >= 0 && bounds.right <= innerWidth, 'FAQ fits viewport');
    check(localStorage.getItem('flextracker_data') === before, 'FAQ does not mutate workspace');
    return { failures, x: Math.round(bounds.left + 30), y: Math.round(bounds.top + bounds.height / 2) };
  `);
  assert.deepEqual(layout.failures, [], `FAQ layout ${theme} ${width}`);
  await command('input.performActions', { context, actions: [{
    type: 'pointer', id: 'faq-mouse', parameters: { pointerType: 'mouse' },
    actions: [
      { type: 'pointerMove', x: layout.x, y: layout.y, duration: 0 },
      { type: 'pointerDown', button: 0 },
      { type: 'pointerUp', button: 0 },
    ],
  }] });
  assert.equal(await evaluate(`
    const trigger = document.getElementById('faq-trigger-1');
    trigger.focus();
    return trigger.getAttribute('aria-expanded') === 'true';
  `), true, `FAQ pointer opens answer ${theme} ${width}`);
  const keyboardVerified = await evaluate('return document.hasFocus();');
  // Inactive headless windows receive trusted keys but Firefox suppresses native button activation.
  if (keyboardVerified) {
    for (const key of ['\uE006', ' ']) {
      await command('input.performActions', { context, actions: [{
        type: 'key', id: 'faq-keyboard',
        actions: [{ type: 'keyDown', value: key }, { type: 'keyUp', value: key }],
      }] });
      assert.equal(await evaluate(`
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return document.getElementById('faq-trigger-1').getAttribute('aria-expanded');
      `), key === '\uE006' ? 'false' : 'true', `FAQ keyboard toggle ${theme} ${width}`);
    }
  }
  assert.equal(await evaluate(`
    const first = document.getElementById('faq-trigger-1');
    const second = document.getElementById('faq-trigger-2');
    second.click();
    const focus = getComputedStyle(first);
    const independent = first.getAttribute('aria-expanded') === 'true'
      && second.getAttribute('aria-expanded') === 'true';
    const visibleFocus = !${keyboardVerified} || (focus.outlineStyle === 'solid'
      && focus.outlineWidth === '2px' && parseFloat(focus.outlineOffset) < 0);
    await Promise.all(document.querySelector('.faq-list').getAnimations({ subtree: true })
      .map(animation => animation.finished));
    const card = first.closest('.faq-item');
    const tinted = getComputedStyle(first).backgroundColor !== getComputedStyle(card).backgroundColor;
    first.click();
    second.click();
    first.blur();
    return independent && visibleFocus && tinted;
  `), true, `FAQ independent cards and open surface ${theme} ${width}`);
  await command('input.releaseActions', { context });
  return keyboardVerified;
}
