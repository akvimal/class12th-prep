import { readFileSync, writeFileSync } from 'node:fs';

const screens = [
  ['Main', 'Dashboard', 'Daily loop'],
  ['Today', 'Today', 'Daily loop'],
  ['StudyNow', 'Study Now', 'Daily loop'],
  ['Session', 'Session logging', 'Daily loop'],
  ['Subjects', 'Subjects', 'Subjects & readiness'],
  ['SubjectDetail', 'Subject detail', 'Subjects & readiness'],
  ['ChapterDetail', 'Chapter detail', 'Subjects & readiness'],
  ['Revision', 'Revision', 'Revision & assessment'],
  ['Tests', 'Tests', 'Revision & assessment'],
  ['AddTest', 'Add a test', 'Revision & assessment'],
  ['AfterTest', 'After the test', 'Revision & assessment'],
  ['WeeklyReview', 'Weekly review', 'Review, plan & more'],
  ['PlanSetup', 'Plan setup', 'Review, plan & more'],
  ['Parent', 'Parent view', 'Review, plan & more'],
  ['More', 'More menu', 'Review, plan & more'],
  ['Reminders', 'Rhythm & reminders', 'Discipline & course correction'],
  ['Trajectory', 'Impact on your goal', 'Discipline & course correction'],
  ['CourseCorrect', 'Course correction', 'Discipline & course correction'],
];

const flowBlurb = {
  'Daily loop': 'open &rarr; Dashboard &rarr; Today (max 3 cards) &rarr; Study Now (time-boxed pick) &rarr; run &amp; log the session in under two minutes',
  'Subjects & readiness': 'subject list &rarr; chapters with state + school status &rarr; chapter readiness split into concept / practice / test / recall / revision, with data provenance',
  'Revision & assessment': 'spaced-retrieval queue with a calm recovery plan &middot; add a school test in under 30&nbsp;s (plan recalculates) &middot; enter a result &amp; tag where marks were lost',
  'Review, plan & more': 'weekly review (with study-rhythm adherence) &middot; date-driven plan setup with a live phase preview &middot; aggregate parent view (later phase) &middot; the More menu',
  'Discipline & course correction': 'study windows + a quiet reminder + calendar sync + 14-day adherence &middot; a readiness projection against the target line with plan-pressure drivers &middot; a course-correction sheet where you accept or decline each trade-off &mdash; capacity is never raised silently',
};

// Very small CSS selector prefixer for the simple, flat CSS these files use
// (no @media, no nesting). The @import/link is handled separately.
function prefixCss(css, scope) {
  return css
    .replace(/@import[^;]+;/g, '')
    .split('}')
    .map((chunk) => {
      if (!chunk.trim()) return '';
      const i = chunk.indexOf('{');
      if (i === -1) return '';
      const sels = chunk.slice(0, i).split(',').map((s) => {
        s = s.trim();
        if (!s) return s;
        if (s === 'body' || s === 'html') return scope;
        if (s === '*') return `${scope} *`;
        return `${scope} ${s}`;
      });
      return `${sels.join(', ')} {${chunk.slice(i + 1)}}`;
    })
    .join('\n');
}

const escAttr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

let styleBlocks = '';
let cards = '';
let lastFlow = null;
const fontLink = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap';

for (const [file, label, flow] of screens) {
  const src = readFileSync(new URL(`./${file}.dc.html`, import.meta.url), 'utf8');
  const scope = `#scr-${file}`;

  const styleInner = (src.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
  styleBlocks += `/* ${label} */\n${prefixCss(styleInner, scope)}\n`;

  let body = (src.match(/<x-dc>([\s\S]*?)<\/x-dc>/) || [, ''])[1];
  body = body.replace(/<helmet>[\s\S]*?<\/helmet>/, '').trim();

  if (flow !== lastFlow) {
    if (lastFlow !== null) cards += `  </div>\n</section>\n`;
    cards += `<section>\n  <h2>${flow}</h2>\n  <p class="blurb">${flowBlurb[flow]}</p>\n  <div class="grid">\n`;
    lastFlow = flow;
  }
  cards += `    <figure>\n      <div class="phone"><div class="dcscope" id="scr-${file}">${body}</div></div>\n      <figcaption>${label}</figcaption>\n    </figure>\n`;
}
cards += `  </div>\n</section>\n`;

const page = `<title>Board Prep Tracker Screens</title>
<link rel="stylesheet" href="${escAttr(fontLink)}">
<style>
  :root{ --bg:#EFEAE2; --ink:#17140F; --sub:#5f5a51; --faint:#8a8378; --line:#DED8CC; --card:#FDFCFA; --frame:#d9d3c6; }
  @media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#161310; --ink:#F3EFE7; --sub:#b7b0a4; --faint:#8a8378; --line:#302c25; --card:#FDFCFA; --frame:#2a2620; } }
  :root[data-theme="dark"]{ --bg:#161310; --ink:#F3EFE7; --sub:#b7b0a4; --faint:#8a8378; --line:#302c25; --card:#FDFCFA; --frame:#2a2620; }
  *{ box-sizing:border-box; }
  body{ margin:0; background:var(--bg); color:var(--ink);
    font-family:'IBM Plex Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
  header{ max-width:1180px; margin:0 auto; padding:44px 24px 4px; }
  header h1{ margin:0 0 10px; font:700 27px/1.15 'Space Grotesk','Segoe UI',system-ui,sans-serif; letter-spacing:-.015em; }
  header p{ margin:0; max-width:74ch; color:var(--sub); font-size:13px; line-height:1.65; }
  header .meta{ margin-top:14px; display:inline-block; border:1px dashed var(--line); border-radius:8px;
    padding:8px 12px; font-size:11px; color:var(--faint); }
  header .meta code{ font-family:'IBM Plex Mono',ui-monospace,monospace; }
  section{ max-width:1180px; margin:0 auto; padding:14px 24px; }
  section h2{ margin:26px 0 5px; font:600 12px/1 'IBM Plex Sans',sans-serif; letter-spacing:.1em;
    text-transform:uppercase; color:var(--faint); }
  section .blurb{ margin:0 0 20px; max-width:80ch; color:var(--sub); font-size:12.5px; line-height:1.6; }
  .grid{ display:grid; grid-template-columns:repeat(auto-fill, 390px); justify-content:center;
    gap:32px 24px; align-items:start; }
  figure{ margin:0; display:flex; flex-direction:column; gap:11px; min-width:0; }
  .phone{ width:390px; max-width:100%; border:1px solid var(--frame); border-radius:20px;
    overflow:hidden; background:var(--card);
    box-shadow:0 1px 2px rgba(0,0,0,.04), 0 18px 40px -18px rgba(0,0,0,.22); }
  .dcscope{ width:100%; overflow-x:auto; }
  figcaption{ font:600 12px/1.3 'IBM Plex Sans',sans-serif; color:var(--sub); text-align:center; }
  @media (max-width:460px){ .grid{ grid-template-columns:1fr; } }
  footer{ max-width:1180px; margin:0 auto; padding:22px 24px 60px; color:var(--faint); font-size:11px; line-height:1.7; }
${styleBlocks}</style>

<header>
  <h1>Board Prep Tracker &mdash; screen set</h1>
  <p>Static hi-fi mockups for the CBSE Class&nbsp;XII board-exam preparation tracker. Direction: <em>focused high-contrast</em> &mdash; near-black ink on warm paper, Space&nbsp;Grotesk headings with IBM&nbsp;Plex&nbsp;Sans/Mono, one electric-blue accent held back for the single next action. Mobile-first at 390&nbsp;px, calm language, at most three Today cards, every recommendation exposes &ldquo;Why&nbsp;this?&rdquo;.</p>
  <div class="meta">Every figure comes from <code>fixtures/synthetic-academic-data.json</code> &mdash; illustrative derived weights, <strong>not</strong> official CBSE chapter marks &middot; context date 2&nbsp;Sept&nbsp;2026, so the plan sits in the Syllabus-coverage phase.</div>
</header>

${cards}
<footer>
  Each frame is the real screen markup at 390&nbsp;px. This page is a flat review surface; the click-to-edit version is on the design canvas. Next step: wire these screens to the deterministic planning / readiness engine and persistence across Phases&nbsp;0&ndash;3.
</footer>
`;

writeFileSync(new URL('./board-prep-tracker-gallery.html', import.meta.url), page);
console.log('wrote board-prep-tracker-gallery.html', page.length, 'bytes');
