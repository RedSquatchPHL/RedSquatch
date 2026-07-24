'use strict';

// Shared row validation for both the PDF (getTable) and XLSX parsers — both end up
// producing the same [ticket, taskType, priority, description, opened, state] shape,
// just extracted differently, so a single validator keeps the two in lockstep.

// DMND (Demand) and PRJ (Project) don't come from the daily "task" table report —
// they're pulled from separate secondary ServiceNow reports, but flow through the
// same import pipeline since the row shape (Number/Type/Priority/Description/Opened/
// State) is the same list-report format ServiceNow produces for any table.
const TICKET_RE = /^(ENHC|RLSE|STSK|STRY|SNWR|DFCT|DMND|PRJ)\d+$/;
const PRIORITY_RE = /^\d+\s*-\s*.+$/;
const OPENED_RE = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

// ServiceNow's "2026-03-06 11:11:26 AM" format is locale-ambiguous for Date.parse,
// so convert it by hand into a plain (no-tz) ISO string for the TIMESTAMP column.
function parseOpenedDate(value) {
  if (value instanceof Date) {
    const pad = n => String(n).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`;
  }
  const m = OPENED_RE.exec(String(value ?? '').trim());
  if (!m) return null;
  let [, y, mo, d, h, mi, s, ap] = m;
  h = parseInt(h, 10);
  if (/pm/i.test(ap) && h !== 12) h += 12;
  if (/am/i.test(ap) && h === 12) h = 0;
  return `${y}-${mo}-${d}T${String(h).padStart(2, '0')}:${mi}:${s}`;
}

// cells = [ticket, taskTypeWord, priority, description, opened, state, fullDescription,
// project, enhancement] (task type word is unused — the ticket number's own prefix is a
// more reliable source of truth). fullDescription/project/enhancement are optional — only
// Demand rows currently supply them, so their absence never fails validation.
//
// Demand (DMND) is the one task type whose ServiceNow report has no Priority or Opened
// date at all, so those two are only required for non-Demand rows — Demand cards just
// render without a priority badge / opened date.
function rowFromCells(cells) {
  const ticket_number = String(cells[0] ?? '').trim();
  const ticketMatch = TICKET_RE.exec(ticket_number);
  const priorityRaw = String(cells[2] ?? '').trim();
  const opened_at = parseOpenedDate(cells[4]);
  const state = String(cells[5] ?? '').trim();
  const short_description = String(cells[3] ?? '').replace(/\s*\n\s*/g, ' ').trim();
  const description = String(cells[6] ?? '').trim() || null;
  const related_project = String(cells[7] ?? '').trim() || null;
  const related_enhancement = String(cells[8] ?? '').trim() || null;

  if (!ticketMatch || !state || !short_description) {
    return { ok: false };
  }

  const isDemand = ticketMatch[1] === 'DMND';
  const priorityValid = PRIORITY_RE.test(priorityRaw);
  if (!isDemand && (!priorityValid || !opened_at)) {
    return { ok: false };
  }

  return {
    ok: true,
    row: {
      ticket_number,
      task_type: ticketMatch[1],
      priority: priorityValid ? priorityRaw : null,
      short_description,
      opened_at,
      state,
      description,
      related_project,
      related_enhancement,
    },
  };
}

module.exports = { TICKET_RE, PRIORITY_RE, OPENED_RE, parseOpenedDate, rowFromCells };
