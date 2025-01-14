'use strict';

/**
 * Returns the default directory for Allure results.
 */
function getDefaultAllureResultsDir() {
  return 'allure-results';
}

/**
 * Returns the default framework name.
 */
function getDefaultFrameworkName() {
  return 'jasmine';
}

module.exports = {
  getDefaultAllureResultsDir,
  getDefaultFrameworkName,
};