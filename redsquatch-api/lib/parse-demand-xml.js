'use strict';

// Parses a ServiceNow dmn_demand XML export (e.g. a "Demand" record unload)
// into the plain-text fields DemandForm/demand_forms actually use. These
// exports are a single project-level demand record with rich-text (CDATA/
// HTML) fields, not a list of individual tickets — there is no ticket-level
// data to extract here, only the demand narrative itself.
const FIELDS = [
  'number', 'short_description', 'business_case', 'assumptions',
  'enablers', 'in_scope', 'out_of_scope', 'barriers',
];

function decodeEntities(str) {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function htmlToText(html) {
  const withBreaks = html
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/(div|p|ul)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join('\n');
}

function extractField(block, tag) {
  if (new RegExp(`<${tag}(\\s[^>]*)?/>`).test(block)) return '';

  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!match) return '';

  let content = match[1];
  const cdata = content.match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  if (cdata) content = cdata[1];

  return /<[a-z]/i.test(content) ? htmlToText(content) : decodeEntities(content).trim();
}

function parseDemandXml(xmlText) {
  const demandMatch = xmlText.match(/<dmn_demand[^>]*>([\s\S]*?)<\/dmn_demand>/);
  if (!demandMatch) {
    throw new Error('No <dmn_demand> record found in this file');
  }
  const block = demandMatch[1];

  const result = {};
  for (const field of FIELDS) {
    result[field] = extractField(block, field);
  }
  return result;
}

module.exports = { parseDemandXml };
