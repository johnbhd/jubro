import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('landing page How Jubro Works section implements ADD -> TRACK -> ACT flow', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'css/global.css'), 'utf8');

  // Verify section ID and anchor target
  assert.ok(html.includes('id="how-it-works"'), 'Section #how-it-works exists');

  // Verify heading and updated subtitle
  assert.ok(html.includes('How Jubro Works') && html.includes('id="how-it-works"'), 'Heading How Jubro Works exists');
  assert.ok(html.includes('A simple flow to organize and stay on top of your job search.'), 'Subtitle updated');
  assert.ok(!html.includes('Three simple steps to keep your entire job search under control.'), 'Old subtitle removed');

  // Verify old numbered presentation is removed
  assert.ok(!html.includes('landing-step-number'), 'Old step numbers removed');
  assert.ok(!html.includes('>01<'), '01 removed');
  assert.ok(!html.includes('>02<'), '02 removed');
  assert.ok(!html.includes('>03<'), '03 removed');

  // Verify ADD card
  assert.ok(html.includes('landing-flow-card-add'), 'ADD card class exists');
  assert.ok(html.includes('>ADD</span>'), 'ADD verb exists');
  assert.ok(html.includes('Add an Application'), 'Add an Application title exists');
  assert.ok(html.includes('Save the company, position, date, platform, and job link.'), 'ADD description exists');

  // Verify TRACK card
  assert.ok(html.includes('landing-flow-card-track'), 'TRACK card class exists');
  assert.ok(html.includes('>TRACK</span>'), 'TRACK verb exists');
  assert.ok(html.includes('Track Its Progress'), 'Track Its Progress title exists');
  assert.ok(html.includes('Move your application through Applied, Interview, Offer, or Rejected.'), 'TRACK description exists');

  // Verify ACT card
  assert.ok(html.includes('landing-flow-card-act'), 'ACT card class exists');
  assert.ok(html.includes('>ACT</span>'), 'ACT verb exists');
  assert.ok(html.includes('Know What Comes Next'), 'Know What Comes Next title exists');
  assert.ok(html.includes('Use Next Action to see which applications need your attention.'), 'ACT description exists');

  // Verify flow arrows
  assert.ok(html.includes('landing-flow-arrow'), 'Flow arrows exist');
  assert.ok(html.includes('fa-arrow-down'), 'Mobile down arrow icon exists');
  assert.ok(html.includes('fa-arrow-right'), 'Desktop right arrow icon exists');

  // Verify CSS styles
  assert.ok(css.includes('.landing-flow-card'), 'CSS styles .landing-flow-card');
  assert.ok(css.includes('.landing-flow-card-add'), 'CSS styles .landing-flow-card-add');
  assert.ok(css.includes('.landing-flow-card-track'), 'CSS styles .landing-flow-card-track');
  assert.ok(css.includes('.landing-flow-card-act'), 'CSS styles .landing-flow-card-act');
  assert.ok(css.includes('.landing-flow-arrow'), 'CSS styles .landing-flow-arrow');
});
