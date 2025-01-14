'use strict';

const KarmaAllure2Reporter = require('./src/KarmaAllure2Reporter');

module.exports = {
  'reporter:allure': ['type', KarmaAllure2Reporter]
};