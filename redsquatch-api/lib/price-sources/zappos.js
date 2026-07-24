'use strict';

const { makeSearchFn } = require('./zappos-family');

module.exports = { searchZappos: makeSearchFn('zappos.com', 'Zappos') };
