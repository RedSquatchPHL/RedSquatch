'use strict';

// Parses a Demand Form Markdown export (the same "## Heading" shape
// produced by demandMarkdown()/exportDemandAsMarkdown()) back into the
// plain-text fields demand_forms uses — the inverse of that export, so a
// user can export, edit offline, and re-import.
const HEADING_TO_FIELD = {
  'description': 'description',
  'business case': 'business_case',
  'risk of performing': 'risk_of_performing',
  'risk of not performing': 'risk_of_not_performing',
  'enablers': 'enablers',
  'barriers': 'barriers',
  'in scope': 'in_scope',
  'out of scope': 'out_of_scope',
  'assumptions': 'assumptions',
};

function parseDemandMarkdown(mdText) {
  // Strip a leading UTF-8 BOM so the first heading still matches at column 0.
  const lines = mdText.replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n');
  const result = {};
  let currentField = null;
  let buffer = [];

  const flush = () => {
    if (currentField) result[currentField] = buffer.join('\n').trim();
    buffer = [];
  };

  for (const line of lines) {
    // Accept any heading level (#, ##, ###...), case-insensitive label match.
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (heading) {
      flush();
      currentField = HEADING_TO_FIELD[heading[1].trim().toLowerCase()] || null;
      continue;
    }
    if (/^---\s*$/.test(line)) {
      flush();
      currentField = null;
      continue;
    }
    if (currentField) buffer.push(line);
  }
  flush();

  if (Object.keys(result).length === 0) {
    throw new Error(
      'No recognized section headings found (expected e.g. "## Business Case", "## In Scope", ...)'
    );
  }

  return result;
}

module.exports = { parseDemandMarkdown };
