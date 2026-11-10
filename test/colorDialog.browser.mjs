// Invoked through JUBRO_COLOR_ONLY=1 node test/statusCustomization.browser.mjs.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function verifyColorDialog({ command, evaluate, context, origin, artifacts }) {
  await evaluate(`
    localStorage.clear();
    const { createDefaultTracker } = await import('/js/tracker/defaultTracker.js');
    const tracker = createDefaultTracker('colors', 'My Job Search');
    tracker.rows = [
      ['Google', 'Developer', 'LinkedIn', 'Applied'],
      ['Meta', 'Developer', 'LinkedIn', 'Rejected'],
      ['Blank', 'Developer', '', ''],
    ];
    localStorage.setItem('flextracker_data', JSON.stringify({
      active: tracker.id, ownerType: 'guest', ownerId: null, revision: 1,
      data: { [tracker.id]: tracker },
    }));
  `);
  await command('browsingContext.navigate', { context, url: origin + '/board/', wait: 'complete' });
  await command('browsingContext.activate', { context });
  assert.equal(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const { TrackerApp } = await import('/js/main/main.js');
    window.colorApp = new TrackerApp();
    window.colorFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    window.colorBefore = localStorage.getItem('flextracker_data');
    colorApp.openStatusDialog(2, 'color');
    const dialog = document.querySelector('.status-dialog[open]');
    const custom = dialog.querySelector('.status-color-custom');
    const picker = dialog.querySelector('input[type="color"]');
    if (!custom || !picker) {
      return false;
    }
    window.colorPickerOpens = 0;
    // Test the native-picker trigger without opening an OS dialog in headless Firefox.
    picker.click = () => {
      colorPickerOpens += 1;
    };
    custom.focus();
    custom.click();
    return dialog.querySelectorAll('.status-color-choice').length === 10;
  `), true, 'Nine presets and one native custom picker replace the final swatch');

  const pendingResult = await evaluate(`
    const dialog = document.querySelector('.status-dialog[open]');
    const picker = dialog.querySelector('input[type="color"]');
    picker.value = '#d946ef';
    picker.dispatchEvent(new Event('input', { bubbles: true }));
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    const pending = {
      opens: colorPickerOpens,
      selected: dialog.querySelector('.status-color-custom').getAttribute('aria-pressed'),
      selectedCount: dialog.querySelectorAll('[aria-pressed="true"]').length,
      pendingReadOnly: localStorage.getItem('flextracker_data') === colorBefore,
      keyboardControl: document.activeElement === dialog.querySelector('.status-color-custom')
        && dialog.querySelector('.status-color-custom').tagName === 'BUTTON'
        && dialog.querySelector('.status-color-custom').type === 'button',
    };
    dialog.querySelector('.status-dialog-cancel').click();
    await colorFrame();
    return { ...pending, cancelReadOnly: localStorage.getItem('flextracker_data') === colorBefore };
  `);
  assert.deepEqual(pendingResult, { opens: 1, selected: 'true', selectedCount: 1,
    pendingReadOnly: true, cancelReadOnly: true, keyboardControl: true },
  'A focusable button triggers the native picker; input/change and Cancel cause no mutation');

  assert.equal(await evaluate(`
    const { Storage } = await import('/js/storage/storage.js');
    let before = Storage.load().revision;
    colorApp.openStatusDialog(2, 'color');
    let dialog = document.querySelector('.status-dialog[open]');
    dialog.querySelector('[aria-label="Purple"]').click();
    dialog.querySelector('form').requestSubmit();
    await colorFrame();
    const presetSaved = Storage.load().revision === before + 1
      && colorApp.getTracker().columns[3].options[2].color === 'purple';
    const column = document.querySelector('[data-kanban-status="Rejected"]');
    const oldTint = getComputedStyle(column.querySelector('.kanban-column-header')).backgroundColor;
    const rowsBefore = JSON.stringify(colorApp.getTracker().rows);
    before = Storage.load().revision;
    colorApp.openStatusDialog(2, 'color');
    dialog = document.querySelector('.status-dialog[open]');
    const picker = dialog.querySelector('input[type="color"]');
    picker.value = '#d946ef';
    picker.dispatchEvent(new Event('input', { bubbles: true }));
    dialog.querySelector('form').requestSubmit();
    await colorFrame();
    const savedColumn = document.querySelector('[data-kanban-status="Rejected"]');
    const rgb = 'rgb(217, 70, 239)';
    return presetSaved && Storage.load().revision === before + 1
      && colorApp.getTracker().columns[3].options[2].color === '#d946ef'
      && JSON.stringify(colorApp.getTracker().rows) === rowsBefore
      && getComputedStyle(savedColumn).borderTopColor === rgb
      && getComputedStyle(savedColumn.querySelector('.kanban-status-dot')).backgroundColor === rgb
      && getComputedStyle(savedColumn.querySelector('.kanban-card')).borderLeftColor === rgb
      && getComputedStyle(savedColumn.querySelector('.kanban-column-header')).backgroundColor !== oldTint;
  `), true, 'Preset and custom saves each increment once and share column/dot/header/card styling');

  assert.equal(await evaluate(`
    const { Storage } = await import('/js/storage/storage.js');
    colorApp.updateStatusOption(1, { color: 'slate' });
    const before = localStorage.getItem('flextracker_data');
    colorApp.openStatusDialog(1, 'color');
    let dialog = document.querySelector('.status-dialog[open]');
    const legacySelected = dialog.querySelector('.status-color-custom').getAttribute('aria-pressed') === 'true';
    dialog.querySelector('form').requestSubmit();
    await colorFrame();
    if (!legacySelected || localStorage.getItem('flextracker_data') !== before) {
      return false;
    }
    colorApp.openStatusDialog(null, 'color');
    dialog = document.querySelector('.status-dialog[open]');
    const picker = dialog.querySelector('input[type="color"]');
    picker.value = '#008899';
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    dialog.querySelector('form').requestSubmit();
    await colorFrame();
    const fallback = document.querySelector('[data-kanban-status=""]');
    return localStorage.getItem('flextracker_data') === before
      && getComputedStyle(fallback).borderTopColor === 'rgb(0, 136, 153)'
      && colorApp.getCellValue(colorApp.getTracker().rows[2][3]) === '';
  `), true, 'Existing gray saves without rewriting; custom No status color remains session-only and blank');

  await command('browsingContext.reload', { context, wait: 'complete' });
  assert.equal(await evaluate(`
    const { authService } = await import('/js/auth/firebaseAuth.js');
    await authService.waitForWorkspace();
    const { TrackerApp } = await import('/js/main/main.js');
    window.colorApp = new TrackerApp();
    window.colorFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return colorApp.getTracker().columns[3].options[2].color === '#d946ef';
  `), true, 'Custom status color reloads from the existing option metadata');

  for (const theme of ['dark', 'light']) {
    for (const width of [390, 430, 768, 1024, 1440, 1920]) {
      await command('browsingContext.setViewport', { context, viewport: { width, height: 900 }, devicePixelRatio: 1 });
      const result = await evaluate(`
        document.documentElement.classList.toggle('dark', ${theme === 'dark'});
        const before = localStorage.getItem('flextracker_data');
        colorApp.openStatusDialog(2, 'color');
        await colorFrame();
        const dialog = document.querySelector('.status-dialog[open]');
        const palette = dialog.querySelector('.status-color-palette');
        const buttons = [...palette.querySelectorAll('button')];
        const rects = buttons.map(button => button.getBoundingClientRect());
        const bounds = palette.getBoundingClientRect();
        const modal = dialog.getBoundingClientRect();
        const selected = dialog.querySelector('.status-color-choice[aria-pressed="true"]');
        const save = dialog.querySelector('button[type="submit"]').getBoundingClientRect();
        return {
          count: buttons.length === 10 && buttons[9].classList.contains('status-color-custom'),
          rows: rects.slice(0, 5).every(rect => Math.abs(rect.top - rects[0].top) < 1)
            && rects.slice(5).every(rect => Math.abs(rect.top - rects[5].top) < 1)
            && rects[5].top > rects[0].bottom,
          centered: Math.abs((rects[0].left - bounds.left) - (bounds.right - rects[4].right)) < 1
            && rects.every((rect, index) => index < 5 || Math.abs(rect.left - rects[index - 5].left) < 1),
          fullWidth: Math.abs(bounds.width - dialog.querySelector('.status-dialog-fields').getBoundingClientRect().width) < 1,
          circles: rects.every(rect => rect.width === 44 && rect.height === 44),
          rainbow: getComputedStyle(buttons[9]).backgroundImage.includes('conic-gradient'),
          selected: selected === buttons[9] && selected.textContent === '✓'
            && dialog.querySelector('input[type="color"]').value === '#d946ef',
          copy: dialog.querySelector('h2').textContent === 'Change Column Color'
            && dialog.querySelector('.status-dialog-fields > p').textContent === 'This will update the color for "Rejected".',
          footer: Math.abs(save.right - (modal.right - parseFloat(getComputedStyle(dialog).paddingRight) - 1)) < 1,
          fits: modal.left >= 0 && modal.right <= innerWidth && dialog.scrollWidth <= dialog.clientWidth,
          readOnly: localStorage.getItem('flextracker_data') === before,
        };
      `);
      assert.equal(Object.values(result).every(Boolean), true, theme + ' ' + width + ': ' + JSON.stringify(result));
      const shot = await command('browsingContext.captureScreenshot', { context });
      await writeFile(resolve(artifacts, `${theme}-${width}-custom-color.png`), Buffer.from(shot.data, 'base64'));
      await evaluate(`
        document.querySelector('.status-dialog[open] .status-dialog-cancel').click();
        await colorFrame();
      `);
    }
  }
}
