'use strict';

// Parses a Discovery Form Markdown export (the same "## Heading" shape
// produced by discoverySections()/exportDiscoveryAsMarkdown()) back into the
// plain-text fields discovery_forms uses — the inverse of that export, so a
// user can export, edit offline, and re-import. Mirrors parse-demand-md.js.
const HEADING_TO_FIELD = {
  'their process': 'their_process',
  'expected outcome': 'expected_outcome',
  'pain points': 'pain_points',
  'ideal method': 'ideal_method',
  'your interpretation': 'your_interpretation',
};

function parseDiscoveryMarkdown(mdText) {
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
      'No recognized section headings found (expected e.g. "## Their Process", "## Pain Points", ...)'
    );
  }

  return result;
}

module.exports = { parseDiscoveryMarkdown };
