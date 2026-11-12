import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyFooter({ command, evaluate, context, theme, width, artifacts, page = 'home' }) {
  const failures = await evaluate(`
    const footer = document.querySelector('.site-footer');
    if (!footer) return ['Shared footer is missing'];
    footer.scrollIntoView({ block: 'center', behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
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
    const inner = footer.querySelector('.footer-inner');
    const bounds = inner.getBoundingClientRect();
    const brand = footer.querySelector('.footer-brand').getBoundingClientRect();
    const groups = [...footer.querySelectorAll('.footer-links')];
    const product = groups[0].getBoundingClientRect();
    const resources = groups[1].getBoundingClientRect();
    check(groups.map(group => group.querySelector('h3').textContent).join('|') === 'Product|Resources', 'Footer headings');
    check(!footer.textContent.includes('Jubro Dev') && !footer.querySelector('iframe'), 'No developer column or widget');
    check(footer.querySelector('.footer-brand-link img').getAttribute('src') === '/img/jubro.png', 'Authentic logo');
    check(bounds.width <= 1440 && Math.abs(bounds.left - (document.documentElement.clientWidth - bounds.width) / 2) < 1,
      'Footer stays capped and centered');
    check(getComputedStyle(inner).paddingLeft === (innerWidth < 640 ? '16px' : innerWidth < 1024 ? '24px' : '32px'),
      'Footer uses landing page padding');
    check(innerWidth >= 1024
      ? Math.abs(brand.top - product.top) < 1 && Math.abs(product.top - resources.top) < 1 && product.left > brand.right
      : product.top >= brand.bottom + 31 && Math.abs(product.top - resources.top) < 1,
    'Responsive brand and two navigation groups');
    const surface = luminance(getComputedStyle(footer).backgroundColor);
    for (const node of footer.querySelectorAll('h2, h3, p, a')) {
      const text = luminance(getComputedStyle(node).color);
      check((Math.max(surface, text) + 0.05) / (Math.min(surface, text) + 0.05) >= 4.5, 'Readable footer text');
    }
    for (const link of footer.querySelectorAll('a')) {
      check(link.getBoundingClientRect().height >= 44, 'Usable footer link target');
      check(link.scrollWidth <= link.clientWidth, 'Footer links wrap without overflow');
      if (link.protocol === 'https:') {
        check(link.target === '_blank' && link.relList.contains('noopener') && link.relList.contains('noreferrer'),
          'External link safety');
      }
    }
    check(bounds.left >= 0 && bounds.right <= innerWidth && footer.scrollWidth <= footer.clientWidth, 'Footer fits viewport');
    return failures;
  `);
  assert.deepEqual(failures, [], `Footer ${page} ${theme} ${width}`);
  const pointer = await evaluate(`
    const link = document.querySelector('.footer-links a');
    const bounds = link.getBoundingClientRect();
    return { x: Math.round(bounds.left + 15), y: Math.round(bounds.top + bounds.height / 2) };
  `);
  await command('input.performActions', { context, actions: [{
    type: 'pointer', id: 'footer-mouse', parameters: { pointerType: 'mouse' },
    actions: [{ type: 'pointerMove', ...pointer, duration: 0 }],
  }] });
  assert.equal(await evaluate(`
    return getComputedStyle(document.querySelector('.footer-links a')).color;
  `), theme === 'dark' ? 'rgb(127, 168, 255)' : 'rgb(37, 99, 235)', `Footer hover ${page} ${theme} ${width}`);
  const shot = await command('browsingContext.captureScreenshot', { context });
  await writeFile(resolve(artifacts, theme + '-' + width + '-' + page + '-footer.png'), Buffer.from(shot.data, 'base64'));
  await command('input.releaseActions', { context });
}

export async function verifyLegalFooters({ command, evaluate, context, origin, artifacts }) {
  for (const page of ['privacy', 'terms']) {
    await command('browsingContext.navigate', { context, url: origin + '/pages/' + page + '/', wait: 'complete' });
    await evaluate('await window.jubroComponentsReady;');
    for (const theme of ['dark', 'light']) {
      for (const width of [390, 1440]) {
        await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
        await evaluate(`document.documentElement.classList.toggle('dark', ${theme === 'dark'});`);
        await verifyFooter({ command, evaluate, context, theme, width, artifacts, page });
      }
    }
  }
}
