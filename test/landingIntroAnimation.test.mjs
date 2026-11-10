import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('landing page markup and styles include hero intro animation and motion accessibility', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'css/global.css'), 'utf8');

  // Verify index.html contains hero actions container
  assert.ok(html.includes('class="landing-hero-actions'), 'index.html has landing-hero-actions container');

  // Verify keyframes are defined
  assert.ok(css.includes('@keyframes landingIntroFadeUp'), 'css defines landingIntroFadeUp keyframes');
  assert.ok(css.includes('@keyframes landingIntroVisualIn'), 'css defines landingIntroVisualIn keyframes');
  assert.ok(css.includes('@keyframes landingIntroGlowIn'), 'css defines landingIntroGlowIn keyframes');

  // Verify animations are applied to hero elements with staggered timing
  assert.ok(css.includes('#homeBody .landing-hero-copy h1'), 'styles hero headline');
  assert.ok(css.includes('animation: landingIntroFadeUp 650ms cubic-bezier(0.16, 1, 0.3, 1) both;'), 'h1 has entrance animation');
  assert.ok(css.includes('#homeBody .landing-hero-copy > p'), 'styles hero paragraph');
  assert.ok(css.includes('animation: landingIntroFadeUp 650ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;'), 'p has staggered delay');
  assert.ok(css.includes('#homeBody .landing-hero-actions'), 'styles hero actions');
  assert.ok(css.includes('animation: landingIntroFadeUp 650ms cubic-bezier(0.16, 1, 0.3, 1) 240ms both;'), 'actions has staggered delay');

  // Verify hero visual animation and ambient glow
  assert.ok(css.includes('#homeBody .landing-hero-visual'), 'styles hero visual');
  assert.ok(css.includes('animation: landingIntroVisualIn 850ms cubic-bezier(0.16, 1, 0.3, 1) 360ms both;'), 'hero visual has scale/glide animation');
  assert.ok(css.includes('#homeBody .landing-hero-visual::before'), 'hero visual has ambient glow pseudo-element');
  assert.ok(css.includes('animation: landingIntroGlowIn 1000ms cubic-bezier(0.16, 1, 0.3, 1) 200ms both;'), 'ambient glow has smooth fade-in');

  // Verify hover lift interaction
  assert.ok(css.includes('#homeBody .landing-hero-visual > div:hover'), 'hero visual frame has hover lift');

  // Verify prefers-reduced-motion accessibility safeguard
  const reducedMotionSection = css.substring(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.ok(reducedMotionSection.includes('animation: none !important;'), 'disables animation on reduced motion');
  assert.ok(reducedMotionSection.includes('transform: none !important;'), 'disables transform on reduced motion');
  assert.ok(reducedMotionSection.includes('opacity: 1 !important;'), 'ensures opacity 1 on reduced motion');
});
