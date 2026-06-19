#!/usr/bin/env node

/**
 * Token Generator
 * Converts tokens.json into tokens.css with CSS custom properties
 * Run: node generate-tokens.js
 */

const fs = require('fs');
const path = require('path');

// Read tokens.json
const tokensPath = path.join(__dirname, 'tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));

// Flatten tokens into CSS custom properties
function flattenTokens(obj, prefix = '') {
  let cssVars = '';

  for (const [key, value] of Object.entries(obj)) {
    const varName = prefix ? `${prefix}-${key}` : key;

    if (typeof value === 'object' && value !== null) {
      cssVars += flattenTokens(value, varName);
    } else {
      // Escape special characters and format as CSS custom property
      const cssKey = `--${varName.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      cssVars += `  ${cssKey}: ${value};\n`;
    }
  }

  return cssVars;
}

const cssVars = flattenTokens(tokens);

// Build CSS file
const cssContent = `/* ========================================
   AUTO-GENERATED DESIGN TOKENS
   Generated from tokens.json
   DO NOT EDIT MANUALLY — regenerate via: node generate-tokens.js
   ======================================== */

:root {
${cssVars}}
`;

// Write to tokens.css
const outputPath = path.join(__dirname, 'tokens.css');
fs.writeFileSync(outputPath, cssContent, 'utf8');

console.log(`✓ Generated ${outputPath}`);
console.log(`✓ CSS variables created from tokens.json`);
