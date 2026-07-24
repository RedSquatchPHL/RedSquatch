'use strict';

const XLSX = require('xlsx');
const { rowFromCells } = require('./work-cards-shared');

// Maps a normalized ServiceNow column header to its position in the fixed
// [ticket, taskType, priority, description, opened, state] shape rowFromCells expects.
const HEADER_TO_POSITION = {
  number: 0,
  'task type': 1,
  priority: 2,
  'short description': 3,
  name: 3, // Demand's ServiceNow export calls this column "Name" instead of "Short description"
  opened: 4,
  state: 5,
  description: 6,
  project: 7,
  enhancement: 8,
};

function parseWorkCardsXlsx(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });

  const rows = [];
  const needsReview = [];
  if (grid.length === 0) return { rows, needsReview };

  const headerRow = grid[0].map(h => String(h ?? '').trim().toLowerCase());
  const positionToColumn = {};
  headerRow.forEach((h, colIndex) => {
    if (h in HEADER_TO_POSITION) positionToColumn[HEADER_TO_POSITION[h]] = colIndex;
  });

  for (let i = 1; i < grid.length; i++) {
    const raw = grid[i];
    if (!raw || raw.every(c => c === '' || c == null)) continue; // skip blank rows

    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(pos => (
      positionToColumn[pos] !== undefined ? raw[positionToColumn[pos]] : ''
    ));
    const parsed = rowFromCells(cells);
    if (parsed.ok) rows.push(parsed.row);
    else needsReview.push({ raw });
  }

  return { rows, needsReview };
}

module.exports = { parseWorkCardsXlsx };
