# Karma Allure 2 Reporter

> A Karma reporter for generating [Allure 2](https://github.com/allure-framework/allure2) test results.

## Installation

The easiest way is to install `karma-allure2-reporter` as a `devDependency`,
by running

```bash
npm install karma-allure2-reporter --save-dev
```

## Configuration

For configuration details see [Allure Report Documentation](https://allurereport.org/docs/).

## Examples

### Basic

```javascript
// karma.conf.js
module.exports = function (config) {
  config.set({
    allureReporter: {
      resultsDir: 'allure-results' // output directory for the allure report - can be omitted (default: allure-results)
    },
  });
};
```

### Custom Configuration

```javascript
// karma.conf.js
module.exports = function (config) {
  config.set({
    allureReporter: {
      customOptions: {
        projectLanguage: 'javascript', // by default 'javascript'
        testFramework: 'jasmine' // by default 'jasmine'
      },
    },
  });
};
```

---

For more information on Karma see the [homepage](https://karma-runner.github.io).