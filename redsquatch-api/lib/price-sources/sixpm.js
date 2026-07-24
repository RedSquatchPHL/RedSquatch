'use strict';

const { makeSearchFn } = require('./zappos-family');

module.exports = { searchSixpm: makeSearchFn('6pm.com', '6pm') };
