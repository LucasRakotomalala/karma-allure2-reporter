'use strict';

const { Stage, Status } = require('allure-js-commons');

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

    const { resultsDir = 'allure-results', ...restOptions } = config.allureReporter || {};

    const allureRuntime = new ReporterRuntime({
        writer: createDefaultWriter({ resultsDir }),
        ...restOptions
    });

    let currentTestUuid = undefined;
    const scopeStack = [];

    this.onSpecComplete = function (browser, result) {
        log.debug('Spec complete: ', result);

        const testName = result.description; // Represents the `it` test name
        const parentSuite = result.suite.join(' - '); // Concatenated `describe` texts separated by '-'
        const packageName = result.suite.join('.'); // Concatenated `describe` texts separated by '.'

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

            currentTestUuid = allureRuntime.startTest(
                {
                    name: testName,
                    fullName: `${parentSuite} ${testName}`,
                    stage: Stage.RUNNING,
                    labels: [
                        ...globalLabels,
                        ...initialLabels,
                        { name: 'browser', value: browser.name }, // Add the browser label
                        { name: 'package', value: packageName }, // Add the package name label
                        { name: 'parentSuite', value: parentSuite }, // Add the parent suite label
                        { name: 'suite', value: testName }, // Add the suite label
                    ],
                },
                scopeStack
            );
        }

        // Update the test status and details
        allureRuntime.updateTest(currentTestUuid, (test) => {
            test.stage = Stage.FINISHED;

            if (result.skipped) {
                test.status = Status.SKIPPED;
                test.statusDetails = {
                    message: 'Test skipped',
                };
            } else if (result.success) {
                test.status = Status.PASSED;
            } else {
                test.status = Status.FAILED;
                test.statusDetails = {
                    message: result.log.join('\n'),
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
        return 'jasmine'; // Returns the name of the testing framework
    }
}

KarmaAllureReporter.$inject = ['baseReporterDecorator', 'config', 'logger'];

module.exports = KarmaAllureReporter;