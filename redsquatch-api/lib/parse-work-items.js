'use strict';

// Parses a markdown table export of ServiceNow work items.
// Expected row shape: | # | Ticket Number | Title | Status | Priority |
// Header/separator rows and non-table lines are skipped.

function parseWorkItemsMarkdown(markdown) {
  const items = [];

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;

    const cells = trimmed
      .slice(1, -1)
      .split('|')
      .map(cell => cell.trim());

    if (cells.length !== 5) continue;

    const [seq, ticketNumber, title, status, priority] = cells;

    if (!/^\d+$/.test(seq)) continue; // skips header ("#") and separator ("---") rows
    if (!ticketNumber || !title || !status || !priority) continue;

    items.push({
      type: ticketNumber.slice(0, 4).toUpperCase(),
      ticket_number: ticketNumber,
      title,
      status,
      priority,
    });
  }

  return items;
}

module.exports = { parseWorkItemsMarkdown };
