import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyFinalCta({ command, evaluate, context, theme, width, artifacts }) {
  const failures = await evaluate(`
    const panel = document.querySelector('.landing-final-cta');
    const button = panel.querySelector('a');
    panel.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const bounds = panel.getBoundingClientRect();
    const features = document.getElementById('features').getBoundingClientRect();
    const buttonBounds = button.getBoundingClientRect();
    const surface = getComputedStyle(panel);
    const action = getComputedStyle(button);
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
    check(Math.abs(bounds.left - features.left) < 1 && Math.abs(bounds.right - features.right) < 1,
      'CTA aligns with Features');
    check(bounds.left >= 0 && bounds.right <= innerWidth && panel.scrollWidth <= panel.clientWidth,
      'Panel fits viewport');
    check(surface.paddingLeft === (innerWidth < 640 ? '32px' : '56px'), 'Responsive panel padding');
    check(surface.backgroundImage.includes('radial-gradient'), 'Subtle background depth');
    check(getComputedStyle(panel.querySelector('h2')).fontSize === (innerWidth < 640 ? '30px' : '40px'),
      'Responsive heading hierarchy');
    for (const selector of ['h2', '.landing-cta-copy', '.landing-cta-reassurance']) {
      const text = panel.querySelector(selector);
      check(text && readable(getComputedStyle(text).color, surface.backgroundColor), 'Readable CTA copy');
    }
    check(action.backgroundColor === 'rgb(37, 99, 235)' && readable(action.color, action.backgroundColor),
      'Blue primary button has strong contrast in both themes');
    check(buttonBounds.height >= 48 && buttonBounds.width <= 320
      && buttonBounds.left >= bounds.left && buttonBounds.right <= bounds.right
      && button.scrollWidth <= button.clientWidth, 'Button is readable and usable');
    if (innerWidth < 640) {
      check(Math.abs(buttonBounds.width - Math.min(320, panel.clientWidth - 64)) < 1,
        'Mobile button fills available content width up to 320px');
    }
    check(button.pathname === '/board/' && panel.querySelectorAll('a').length === 1, 'One guest-first Board link');
    check(button.querySelector('.fa-arrow-right')?.getAttribute('aria-hidden') === 'true', 'Arrow is decorative');
    return failures;
  `);
  assert.deepEqual(failures, [], `Final CTA layout ${theme} ${width}`);

  for (const target of ['.landing-final-cta', '.landing-final-cta a']) {
    const pointer = await evaluate(`
      const bounds = document.querySelector('${target}').getBoundingClientRect();
      return { x: Math.round(bounds.left + bounds.width / 2), y: Math.round(bounds.top + bounds.height / 2) };
    `);
    await command('input.performActions', { context, actions: [{
      type: 'pointer', id: 'cta-mouse', parameters: { pointerType: 'mouse' },
      actions: [{ type: 'pointerMove', ...pointer, duration: 0 }],
    }] });
    assert.equal(await evaluate(`
      const target = document.querySelector('${target}');
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await Promise.all(target.getAnimations().map(animation => animation.finished));
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = '${target}' === '.landing-final-cta' ? -3 : -2;
      return getComputedStyle(target).transform === (reduced ? 'none' : 'matrix(1, 0, 0, 1, 0, ' + offset + ')');
    `), true, `CTA hover respects motion preference ${target} ${theme} ${width}`);
  }
  await command('input.performActions', { context, actions: [{
    type: 'pointer', id: 'cta-mouse', parameters: { pointerType: 'mouse' },
    actions: [{ type: 'pointerMove', x: 0, y: 0, duration: 0 }],
  }] });
  await evaluate(`
    await Promise.all(document.querySelector('.landing-final-cta').getAnimations({ subtree: true })
      .map(animation => animation.finished));
  `);
  const shot = await command('browsingContext.captureScreenshot', { context });
  await writeFile(resolve(artifacts, theme + '-' + width + '-final-cta.png'), Buffer.from(shot.data, 'base64'));
}
