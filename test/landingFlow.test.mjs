import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('landing Features preserves four benefits with static decorative product previews', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const section = html.match(/<section id="features"[\s\S]*?<\/section>/)?.[0];

  assert.ok(section);
  assert.equal((section.match(/class="landing-feature-card"/g) || []).length, 4);
  assert.equal((section.match(/class="landing-feature-preview[^"]*" aria-hidden="true"/g) || []).length, 4);
  for (const title of ['Visual Job Pipeline', 'Next Action', 'Board &amp; List', 'Local + Cloud']) {
    assert.ok(section.includes(title));
  }
  for (const copy of [
    'Everything You Need to Stay On Top of Applications',
    'Essential tools to keep your search organized without unnecessary complexity.',
    'See every application grouped by its current stage so you can understand your job search at a glance.',
    'Keep the next step visible for each application, from following up to preparing for an interview.',
    'Use Board to track progress visually and List when you need a more detailed view.',
    'Start immediately as a guest, then sign in when you want your applications synchronized through your account.',
  ]) {
    assert.ok(section.includes(copy));
  }
  for (const caption of ['Follow up with recruiter', 'Start as a guest', 'Sign in to sync']) {
    assert.ok(section.includes(caption));
  }
  const boardSample = section.match(/class="feature-board-sample">([\s\S]*?)<\/div>/)?.[1];
  assert.ok(boardSample);
  assert.deepEqual([...boardSample.matchAll(/class="feature-board-label">([^<]+)<\/span>/g)].map(match => match[1]),
    ['Applied', 'Interview', 'Rejected']);
  assert.doesNotMatch(section, /<(button|input|select|canvas|script)\b|\bonclick=/);
});

test('FAQ retains its five accessible questions and answers with scoped card styling', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const section = html.match(/<section id="faq"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section);
  assert.equal((section.match(/class="faq-question"/g) || []).length, 5);
  assert.equal((section.match(/class="faq-icon-badge" aria-hidden="true"/g) || []).length, 5);
  const questions = [
    'Can I use Jubro without an account?',
    'What happens when I sign in?',
    'Can I create multiple Job Searches?',
    'Is Jubro free?',
    'Does Jubro work on mobile?',
  ];
  const answers = [
    'Yes. You can start using Jubro as a guest without creating an account.',
    'Signing in lets your supported Jubro data synchronize through your account instead of remaining only on the current device.',
    'Yes. You can separate different searches such as internships, freelance work, or full-time applications.',
    'Jubro is currently available to use without a paid subscription.',
    'Yes. Jubro is a responsive web app designed to work across desktop, tablet, and mobile browsers.',
  ];
  for (let index = 0; index < questions.length; index += 1) {
    assert.ok(section.includes(questions[index]));
    assert.ok(section.includes(answers[index]));
    assert.ok(section.includes(`aria-controls="faq-answer-${index + 1}"`));
    assert.ok(section.includes(`aria-labelledby="faq-trigger-${index + 1}"`));
  }
  assert.equal((section.match(/aria-expanded="false"/g) || []).length, 5);
});

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

test('landing page mobile showcase sections and benefit icons share unified component pattern', () => {
  const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
  const css = readFileSync(resolve(process.cwd(), 'css/global.css'), 'utf8');

  // Verify shared mobile-showcase classes in HTML
  assert.ok(html.includes('id="about" class="mobile-showcase'), 'Section 1 uses .mobile-showcase');
  assert.ok(html.includes('id="mobile-board" class="mobile-showcase mobile-showcase--reverse'), 'Section 2 uses .mobile-showcase--reverse');
  assert.equal((html.match(/class="[^"]*mobile-showcase-grid[^"]*"/g) || []).length, 2, 'Both sections use .mobile-showcase-grid');
  assert.equal((html.match(/class="[^"]*mobile-showcase-copy[^"]*"/g) || []).length, 2, 'Both sections use .mobile-showcase-copy');
  assert.equal((html.match(/class="[^"]*mobile-showcase-media[^"]*"/g) || []).length, 2, 'Both sections use .mobile-showcase-media');
  assert.equal((html.match(/class="landing-benefit-icon"/g) || []).length, 6, 'All 6 benefit items use .landing-benefit-icon');
  assert.ok(!html.includes('rounded-full bg-blue-100'), 'Generic circular bg-blue-100 benefit badges removed');

  // Verify mobile showcase CSS rules
  assert.ok(css.includes('.mobile-showcase'), 'Mobile showcase container rule exists');
  assert.ok(css.includes('margin-block: 0'), 'Mobile showcase margin-block set');
  assert.ok(css.includes('.landing-benefit-icon'), 'Benefit icon rule exists');
  assert.ok(css.includes('border-radius: 7px'), 'Benefit icon uses rounded square border-radius');

  // Verify footer centering and max-width on large screens
  assert.ok(css.includes('footer > div'), 'Footer container rule exists');
  assert.ok(css.includes('max-width: 1440px') && css.includes('margin-inline: auto'), 'Footer container centered with max-width');
});
