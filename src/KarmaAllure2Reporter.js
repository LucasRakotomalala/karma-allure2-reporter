'use strict';

const { pid } = require('node:process');

const { Stage, Status } = require('allure-js-commons');

const { extractMetadataFromString } = require('allure-js-commons/sdk');

const {
  createDefaultWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getLanguageLabel,
  getFrameworkLabel,
  getHostLabel,
  getThreadLabel,
} = require('allure-js-commons/sdk/reporter');

const { getDefaultAllureResultsDir, getDefaultFrameworkName } = require('./utils');

function KarmaAllure2Reporter(baseReporterDecorator, config, logger) {
  baseReporterDecorator(this);

  const log = logger.create('KarmaAllure2Reporter');

  const { resultsDir = getDefaultAllureResultsDir(), customOptions, ...reporterOptions } = config || {};
  const { projectLanguage, testFramework = getDefaultFrameworkName() } = customOptions || {};

  const allureRuntime = new ReporterRuntime({
    writer: createDefaultWriter({ resultsDir }),
    ...reporterOptions
  });

  const scopeStack = [];
  let currentTestUuid = undefined;

  this.onSpecComplete = function (browser, result) {
    log.debug('Spec complete: ', result);

    // Extract the description and suite from the test result
    const { description: resultDescription, suite: resultSuite = [] } = result || {};

    // Extract metadata from the test description
    const metadata = extractMetadataFromString(resultDescription);

    const testName = resultDescription; // Represents the `it` test name
    const packageName = resultSuite.join('.'); // Concatenated `describe` texts separated by '.'
    const parentSuite = resultSuite.join(' > '); // Concatenated `describe` texts separated by ' > '

    // Determine suite and subSuite labels dynamically
    let suiteLabel = undefined;
    let subSuiteLabel = undefined;

    if (resultSuite.length === 2) {
      suiteLabel = resultSuite[1]; // Add the second element as the suite label
    } else if (resultSuite.length > 2) {
      suiteLabel = resultSuite[1]; // The second element is the suite
      subSuiteLabel = resultSuite.slice(2).join(' > '); // Concatenate the rest as subSuite
    }

    // Retrieve global and initial labels
    const globalLabels = getEnvironmentLabels()?.filter((label) => !!label.value) || [];
    const initialLabels = [
      getLanguageLabel(),
      getFrameworkLabel(testFramework),
      getHostLabel(),
      getThreadLabel(pid), // Use the current process ID for the thread label
    ];

    if (projectLanguage) {
      const languageLabel = initialLabels.find((label) => label.name === 'language');

      if (languageLabel) {
        languageLabel.value = projectLanguage;
      }
    }

    if (!currentTestUuid) {
      const scopeUuid = allureRuntime.startScope();
      scopeStack.push(scopeUuid);

      const currentTestResult = {
        name: metadata?.cleanTitle || testName,
        fullName: `${parentSuite} > ${testName}`,
        stage: Stage.RUNNING,
        labels: [
          ...globalLabels,
          ...initialLabels,
          ...metadata?.labels || [],
          { name: 'browser', value: browser.name }, // Add the browser label
          { name: 'package', value: packageName }, // Add the package name label
          { name: 'parentSuite', value: resultSuite[0] }, // Add the first element as the parent suite
        ],
      };

      // Add suite and subSuite labels conditionally
      if (suiteLabel) {
        currentTestResult.labels.push({ name: 'suite', value: suiteLabel });
      }
      if (subSuiteLabel) {
        currentTestResult.labels.push({ name: 'subSuite', value: subSuiteLabel });
      }

      currentTestUuid = allureRuntime.startTest(currentTestResult, scopeStack);
    }

    // Update the test status and details
    allureRuntime.updateTest(currentTestUuid, (test) => {
      test.stage = Stage.FINISHED;

      if (result?.skipped) {
        test.status = Status.SKIPPED;
        test.statusDetails = {
          message: 'Test skipped',
          trace: 'Test execution was skipped by either \'xdescribe\' or \'xit\'',
        };
      } else if (result?.success) {
        test.status = Status.PASSED;
      } else {
        test.status = Status.FAILED;
        test.statusDetails = {
          message: 'Test failed. See the stack trace for details',
          trace: result?.log?.join('\n') || 'No trace available',
        };
      }
    });

    finalizeTest();
  };

  this.onRunComplete = function () {
    finalizeScopes();
  };

  function finalizeTest() {
    if (currentTestUuid) {
      allureRuntime.stopTest(currentTestUuid);
      allureRuntime.writeTest(currentTestUuid);
      currentTestUuid = undefined;
    }

    const scopeUuid = scopeStack.pop();
    if (scopeUuid) {
      allureRuntime.writeScope(scopeUuid);
    }
  }

  function finalizeScopes() {
    while (scopeStack.length > 0) {
      const scopeUuid = scopeStack.pop();
      allureRuntime.writeScope(scopeUuid);
    }
  }
}

KarmaAllure2Reporter.$inject = ['baseReporterDecorator', 'config.allureReporter', 'logger'];

module.exports = KarmaAllure2Reporter;