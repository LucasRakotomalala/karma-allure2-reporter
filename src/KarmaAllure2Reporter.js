'use strict';

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

function KarmaAllureReporter(baseReporterDecorator, config, logger) {
    baseReporterDecorator(this);

    const log = logger.create('KarmaAllureReporter');

    const { resultsDir = 'allure-results', ...restOptions } = config || {};

    const allureRuntime = new ReporterRuntime({
        writer: createDefaultWriter({ resultsDir }),
        ...restOptions
    });

    let currentTestUuid = undefined;
    const scopeStack = [];

    this.onSpecComplete = function (browser, result) {
        log.debug('Spec complete: ', result);

        // Extract metadata from the test description
        const metadata = extractMetadataFromString(result.description);

        const testName = result.description; // Represents the `it` test name
        const packageName = result.suite.join('.'); // Concatenated `describe` texts separated by '.'
        const parentSuite = result.suite.join(' > '); // Concatenated `describe` texts separated by ' > '

        // Determine suite and subSuite labels dynamically
        let suiteLabel = undefined;
        let subSuiteLabel = undefined;

        if (result.suite.length === 2) {
            suiteLabel = result.suite[1]; // Add the second element as the suite label
        } else if (result.suite.length > 2) {
            suiteLabel = result.suite[1]; // The second element is the suite
            subSuiteLabel = result.suite.slice(2).join(' > '); // Concatenate the rest as subSuite
        }

        // Retrieve global and initial labels
        const globalLabels = getEnvironmentLabels().filter((label) => !!label.value);
        const initialLabels = [
            getLanguageLabel(),
            getFrameworkLabel(getFrameworkName()),
            getHostLabel(),
            getThreadLabel(process.pid), // Use the current process ID for the thread label
        ];

        if (!currentTestUuid) {
            const scopeUuid = allureRuntime.startScope();
            scopeStack.push(scopeUuid);

            const currentTestResult = {
                name: metadata.cleanTitle || testName,
                fullName: `${parentSuite} > ${testName}`,
                stage: Stage.RUNNING,
                labels: [
                    ...globalLabels,
                    ...initialLabels,
                    ...metadata.labels,
                    { name: 'browser', value: browser.name }, // Add the browser label
                    { name: 'package', value: packageName }, // Add the package name label
                    { name: 'parentSuite', value: result.suite[0] }, // Add the first element as the parent suite
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

            if (result.skipped) {
                test.status = Status.SKIPPED;
                test.statusDetails = {
                    message: 'Test skipped',
                    trace: 'Test execution was skipped by either \'xdescribe\' or \'xit\'',
                };
            } else if (result.success) {
                test.status = Status.PASSED;
            } else {
                test.status = Status.FAILED;
                test.statusDetails = {
                    message: 'Test failed. See the stack trace for details',
                    trace: result.log.join('\n'),
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

    function getFrameworkName() {
        return 'jasmine';
    }
}

KarmaAllureReporter.$inject = ['baseReporterDecorator', 'config.allureReporter', 'logger'];

module.exports = KarmaAllureReporter;