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

test('landing page comparison section implements Old Way vs Jubro Way structure', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'css/global.css'), 'utf8');

  // Verify section ID
  assert.ok(html.includes('id="why-jubro"'), 'Section #why-jubro exists');

  // Verify transition separator and heading
  assert.ok(html.includes('landing-comparison-separator'), 'Separator exists');
  assert.ok(html.includes('Your Job Search Shouldn\'t'), 'Heading exists');
  assert.ok(html.includes('landing-spreadsheet-accent'), 'Spreadsheet accent class exists');
  assert.ok(html.includes('>Spreadsheet</span>'), 'Spreadsheet accent word exists');

  // Verify supporting copy
  assert.ok(html.includes('Spreadsheets can store applications, but they don\'t give you a clear view of your progress or what to do next.'), 'First intro sentence exists');
  assert.ok(html.includes('Jubro turns it into a visual, easy-to-manage pipeline.'), 'Second intro sentence exists');

  // Verify Old Way card and points
  assert.ok(html.includes('THE OLD WAY'), 'Old way label exists');
  assert.ok(html.includes('Spreadsheets &amp; Notes'), 'Old way title exists');
  assert.ok(html.includes('Manual lists and updates'), 'Old point 1 exists');
  assert.ok(html.includes('Scattered job links'), 'Old point 2 exists');
  assert.ok(html.includes('Hard to see overall progress'), 'Old point 3 exists');
  assert.ok(html.includes('Easy to forget next steps'), 'Old point 4 exists');
  assert.ok(html.includes('Requires setup and maintenance'), 'Old point 5 exists');

  // Verify Jubro Way card and points
  assert.ok(html.includes('THE JUBRO WAY'), 'Jubro way label exists');
  assert.ok(html.includes('landing-comparison-logo'), 'Jubro logo class exists');
  assert.ok(html.includes('src="/img/jubro.png"'), 'Jubro logo source exists');
  assert.ok(html.includes('Visual job-search pipeline'), 'Jubro point 1 exists');
  assert.ok(html.includes('Clear application stages'), 'Jubro point 2 exists');
  assert.ok(html.includes('(Applied, Interview, Offer, etc.)'), 'Jubro point 2 subtext exists');
  assert.ok(html.includes('Next Action'), 'Jubro point 3 exists');
  assert.ok(html.includes('Save job links and key details'), 'Jubro point 4 exists');
  assert.ok(html.includes('Start tracking immediately'), 'Jubro point 5 exists');
  assert.ok(html.includes('(no account required)'), 'Jubro point 5 subtext exists');

  // Verify CSS styles
  assert.ok(css.includes('.landing-comparison-separator'), 'CSS styles .landing-comparison-separator');
  assert.ok(css.includes('.landing-spreadsheet-accent'), 'CSS styles .landing-spreadsheet-accent');
  assert.ok(css.includes('.landing-comparison-jubro'), 'CSS styles .landing-comparison-jubro');
  assert.ok(css.includes('.landing-comparison-logo'), 'CSS styles .landing-comparison-logo');
});

test('landing page mobile sections and footer centering on large screens', () => {
  const css = readFileSync(resolve(process.cwd(), 'css/global.css'), 'utf8');

  // Verify mobile sections share equal vertical margins
  assert.ok(css.includes(':is(#about, #mobile-board)'), 'Mobile sections rule exists');
  assert.ok(css.includes('margin-block: 0'), 'Mobile sections margin-block set');

  // Verify footer centering and max-width on large screens
  assert.ok(css.includes('footer > div'), 'Footer container rule exists');
  assert.ok(css.includes('max-width: 1440px') && css.includes('margin-inline: auto'), 'Footer container centered with max-width');
});
