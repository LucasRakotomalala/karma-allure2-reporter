'use strict';

const AllureReporter = require('./src/KarmaAllureReporter');

module.exports = {
    'reporter:allure': ['type', AllureReporter]
};