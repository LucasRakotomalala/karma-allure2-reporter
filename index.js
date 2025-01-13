'use strict';

const AllureReporter = require('./src/KarmaAllure2Reporter');

module.exports = {
    'reporter:allure': ['type', AllureReporter]
};