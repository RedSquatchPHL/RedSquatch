'use strict';

// pdf-parse is pinned to the classic v1 (function-based) API — v2's bundled pdfjs
// viewer code calls process.getBuiltinModule, which doesn't exist before Node 20.16,
// and crash-loops the whole API on this deploy's Node 18 container.
const pdf = require('pdf-parse');
const { rowFromCells } = require('./work-cards-shared');

// v1 only gives us raw extracted text, not reconstructed table cells — and ServiceNow's
// PDF export packs adjacent columns with zero separator when a row fits on one line
// (e.g. "ENHC0010032Enhancement3 - ModeratePC Build Form Creation2026-03-06 11:11:26 AMOn Hold").
// So rows are reassembled by anchoring on the ticket-number prefix at line start, then a
// single regex splits the joined row text using the task-type vocabulary, the priority
// pattern, and the date pattern as anchors — whatever's left between priority and date is
// the description, however many lines it wrapped across.
const TICKET_START_RE = /^(ENHC|RLSE|STSK|STRY|SNWR|DFCT|DMND|PRJ)\d+/;
// Priority's word half must be an exact known label, not a greedy [A-Za-z]+ — on
// single-line rows there's no separator before the description (e.g. "3 - ModeratePC
// Build..."), so a greedy word match bleeds into the next column.
const PRIORITY_WORD_RE = 'Critical|Urgent|High|Moderate|Low|Planning';
// "Demand" and "Project" are a best guess at ServiceNow's task-type label for those
// tables — unverified against a real export (no sample available yet, unlike the daily
// task report). If a secondary Demand/Project PDF import lands everything in
// needsReview, the actual wording ServiceNow used just needs to be added here.
const ROW_RE = new RegExp(
  `^((?:ENHC|RLSE|STSK|STRY|SNWR|DFCT|DMND|PRJ)\\d+)(Enhancement|Scrum release|Scrum task|Story|ServiceNow Requests|Defect|Demand|Project)` +
  `(\\d+\\s*-\\s*(?:${PRIORITY_WORD_RE}))(.*?)(\\d{4}-\\d{2}-\\d{2}\\s+\\d{2}:\\d{2}:\\d{2}\\s*(?:AM|PM))(.*)$`
);

const NOISE_RES = [
  /^DT_Work Items/,
  /^Run By\s*:/,
  /^Report Title:/,
  /^Run Date and Time:/,
  /^Run by:/,
  /^Table name:/,
  /^Query Condition:/,
  /^Sort Order:/,
  /^\d+\s+Tasks$/,
  /^Numbers?\s*Task type/i, // repeated per-page header row (glyph glitch turns "Number" into "Numbers")
];

function isNoiseLine(line) {
  const trimmed = line.trim();
  if (trimmed === '') return true;
  return NOISE_RES.some(re => re.test(trimmed));
}

async function parseWorkCardsPdf(buffer) {
  const result = await pdf(buffer);
  const lines = result.text.split('\n').filter(line => !isNoiseLine(line));

  const anchorIndexes = [];
  lines.forEach((line, i) => {
    if (TICKET_START_RE.test(line.trim())) anchorIndexes.push(i);
  });

  const rows = [];
  const needsReview = [];

  anchorIndexes.forEach((start, i) => {
    const end = i + 1 < anchorIndexes.length ? anchorIndexes[i + 1] : lines.length;
    const blockText = lines.slice(start, end).join(' ').replace(/\s+/g, ' ').trim();

    const m = ROW_RE.exec(blockText);
    if (!m) {
      needsReview.push({ raw: blockText });
      return;
    }

    const [, ticket_number, , priority, descRaw, opened, state] = m;
    const parsed = rowFromCells([ticket_number, '', priority, descRaw, opened, state]);
    if (parsed.ok) rows.push(parsed.row);
    else needsReview.push({ raw: blockText });
  });

  return { rows, needsReview };
}

module.exports = { parseWorkCardsPdf };
