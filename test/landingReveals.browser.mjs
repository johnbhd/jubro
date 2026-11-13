import assert from 'node:assert/strict';

export async function verifyLandingReveals({ command, evaluate, context, origin, theme, width }) {
  await command('browsingContext.navigate', { context, url: origin + '/', wait: 'complete' });
  const initial = await evaluate(`
    await window.jubroComponentsReady;
    document.documentElement.classList.toggle('dark', ${theme === 'dark'});
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.revealWorkspaceSnapshot = JSON.stringify(localStorage);
    const targets = [...document.querySelectorAll('.landing-reveal-pending')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.revealTargets = targets;
    return {
      reduced,
      pending: targets.length,
      heroPending: Boolean(document.querySelector('#home .landing-reveal-pending')),
      hidden: targets.every(target => getComputedStyle(target).opacity === '0'),
      unexpected: targets.filter(target => getComputedStyle(target).opacity !== '0')
        .map(target => ({ classes: target.className, opacity: getComputedStyle(target).opacity })),
    };
  `);
  assert.equal(initial.heroPending, false, 'Hero retains its own intro');
  assert.equal(initial.pending > 0, !initial.reduced, 'Only motion-enabled offscreen sections wait for scroll');
  assert.equal(initial.hidden, true, 'Pending targets start transparent: ' + JSON.stringify(initial.unexpected));

  const count = await evaluate('return window.revealTargets.length;');
  for (let index = 0; index < count; index += 1) {
    const result = await evaluate(`
      const target = window.revealTargets[${index}];
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const deadline = performance.now() + 2500;
      while (target.classList.contains('landing-reveal-pending') && performance.now() < deadline) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      const animations = target.getAnimations().filter(animation =>
        animation.effect.getKeyframes().some(frame => 'translate' in frame));
      const transformsIndependent = animations.every(animation =>
        animation.effect.getKeyframes().every(frame => !('transform' in frame)));
      await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
      return {
        visible: Number(getComputedStyle(target).opacity) > 0,
        pending: target.classList.contains('landing-reveal-pending'),
        classes: target.className,
        top: target.getBoundingClientRect().top,
        bottom: target.getBoundingClientRect().bottom,
        transformsIndependent,
        fits: target.getBoundingClientRect().left >= -1
          && target.getBoundingClientRect().right <= innerWidth + 1,
      };
    `);
    assert.equal(result.visible, true, 'Scrolled content becomes visible ' + theme + ' ' + width
      + ' ' + index + ': ' + JSON.stringify(result));
    assert.equal(result.pending, false, 'Revealed content leaves pending state ' + index);
    assert.equal(result.transformsIndependent, true, 'Entrance preserves hover transforms');
    assert.equal(result.fits, true, 'Revealed content fits ' + theme + ' ' + width);
  }
  assert.equal(await evaluate(`
    window.scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return !document.querySelector('.landing-reveal-pending')
      && window.revealTargets.every(target => Number(getComputedStyle(target).opacity) > 0
        && target.getAnimations().every(animation =>
          !animation.effect.getKeyframes().some(frame => 'translate' in frame)))
      && document.documentElement.scrollWidth <= innerWidth
      && JSON.stringify(localStorage) === window.revealWorkspaceSnapshot;
  `), true, 'No replay, horizontal overflow, or workspace writes ' + theme + ' ' + width);
}

export async function verifyLandingRevealAccess({ command, evaluate, context, origin }) {
  const refreshPreload = await command('script.addPreloadScript', {
    functionDeclaration: `() => {
      window.refreshEntrances = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const bounds = this.getBoundingClientRect();
        window.refreshEntrances.push({
          duration: options.duration,
          visible: bounds.bottom > 0 && bounds.top < innerHeight,
        });
        return animate.call(this, frames, options);
      };
    }`,
    contexts: [context],
  });
  try {
    await command('browsingContext.navigate', { context, url: origin + '/', wait: 'complete' });
    const restoredScroll = await evaluate(`
      await window.jubroComponentsReady;
      document.querySelector('#faq').scrollIntoView({ block: 'center', behavior: 'instant' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return scrollY;
    `);
    await command('browsingContext.reload', { context, wait: 'complete' });
    const refreshed = await evaluate(`
      await window.jubroComponentsReady;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const deadline = performance.now() + 2500;
      while (!reduced && !window.refreshEntrances.some(entry => entry.visible)
        && performance.now() < deadline) {
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      return { reduced, scroll: scrollY, entrances: window.refreshEntrances };
    `);
    assert.ok(Math.abs(refreshed.scroll - restoredScroll) < 64, 'Refresh preserves native scroll position');
    assert.equal(refreshed.entrances.some(entry => entry.visible && entry.duration === 900),
      !refreshed.reduced, 'Refreshed visible section enters slowly unless motion is reduced');
  } finally {
    await command('script.removePreloadScript', { script: refreshPreload.script });
  }
  await command('browsingContext.navigate', { context, url: origin + '/', wait: 'complete' });
  const focus = await evaluate(`
    await window.jubroComponentsReady;
    const target = document.querySelector('.faq-item');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wasPending = target.classList.contains('landing-reveal-pending');
    const button = target.querySelector('button');
    button.focus();
    const nativeFocusRevealed = !target.classList.contains('landing-reveal-pending');
    if (!document.hasFocus() && !nativeFocusRevealed) {
      // Headless Firefox suppresses native focus events while its window is inactive.
      button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    }
    return { reduced, wasPending, nativeFocusRevealed, focusedWindow: document.hasFocus(),
      visible: !target.classList.contains('landing-reveal-pending')
        && getComputedStyle(target).opacity === '1' };
  `);
  assert.equal(focus.visible, true, 'Focus handler reveals the FAQ before interaction: ' + JSON.stringify(focus));

  await command('browsingContext.navigate', { context, url: origin + '/#features', wait: 'complete' });
  assert.equal(await evaluate(`
    await window.jubroComponentsReady;
    return !document.querySelector('#features .landing-reveal-pending');
  `), true, 'Direct hash entry reveals destination content');

  const preload = await command('script.addPreloadScript', {
    functionDeclaration: '() => { window.IntersectionObserver = undefined; }',
    contexts: [context],
  });
  try {
    await command('browsingContext.navigate', { context, url: origin + '/', wait: 'complete' });
    assert.equal(await evaluate(`
      await window.jubroComponentsReady;
      return !document.querySelector('.landing-reveal-pending')
        && [...document.querySelectorAll('.landing-main > section, .footer-inner')]
          .every(target => getComputedStyle(target).opacity === '1');
    `), true, 'Unsupported observer leaves the whole landing page visible');
  } finally {
    await command('script.removePreloadScript', { script: preload.script });
  }
  return {
    nativeFocusVerified: focus.focusedWindow && focus.nativeFocusRevealed,
    syntheticFocusFallback: !focus.focusedWindow && !focus.nativeFocusRevealed,
  };
}
