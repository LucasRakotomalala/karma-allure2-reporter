import { pid } from 'node:process';
import { Stage, Status } from 'allure-js-commons';
import {
  createDefaultWriter,
  ReporterRuntime,
  getEnvironmentLabels,
  getLanguageLabel,
  getFrameworkLabel,
  getHostLabel,
  getThreadLabel,
} from 'allure-js-commons/sdk/reporter';
import { extractMetadataFromString } from 'allure-js-commons/sdk';
import { Browser, KarmaAllure2ReporterConfig, KarmaTestResult } from './model';
import { getDefaultAllureResultsDir, getDefaultFrameworkName } from './utils';

function KarmaAllure2Reporter(baseReporterDecorator: any, config: KarmaAllure2ReporterConfig, logger: any): void {
  baseReporterDecorator(this);

  const log = logger.create('allure2-reporter');

  const { resultsDir = getDefaultAllureResultsDir(), customOptions = {}, ...reporterOptions } = config ?? {};
  log.debug('Allure 2 reporter results directory: ', resultsDir);

  const { projectLanguage, testFramework = getDefaultFrameworkName(), packageLabel, parentSuiteLabel } = customOptions;
  log.debug('Allure 2 reporter custom options: ', JSON.stringify(customOptions, undefined, 2));

  const allureRuntime = new ReporterRuntime({
    writer: createDefaultWriter({ resultsDir }),
    ...reporterOptions
  });

  const scopeStack: Array<string> = [];
  let currentTestUuid: string | undefined;

  this.onSpecComplete = (browser: Browser, result: Partial<KarmaTestResult>): void => {
    const { description: resultDescription, suite: resultSuite = [] } = result ?? {};
    const metadata = extractMetadataFromString(resultDescription);

    const testName = resultDescription;
    const packageName = resultSuite.join('.');
    const parentSuite = resultSuite.join(' > ');

    let suiteLabel: string | undefined;
    let subSuiteLabel: string | undefined;

    if (resultSuite.length === 2) {
      suiteLabel = resultSuite[1];
    } else if (resultSuite.length > 2) {
      suiteLabel = resultSuite[1];
      subSuiteLabel = resultSuite.slice(2).join(' > ');
    }

    const globalLabels = getEnvironmentLabels().filter((label) => !!label.value) ?? [];
    const initialLabels = [
      getLanguageLabel(),
      getFrameworkLabel(testFramework),
      getHostLabel(),
      getThreadLabel(`${pid}`)
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
        name: metadata.cleanTitle ?? testName,
        fullName: `${parentSuite} > ${testName}`,
        stage: Stage.RUNNING,
        labels: [
          ...globalLabels,
          ...initialLabels,
          ...metadata.labels ?? [],
          { name: 'browser', value: browser.name },
          { name: 'package', value: `${packageLabel?.prefix ?? ''}${packageName}${packageLabel?.suffix ?? ''}` },
          { name: 'parentSuite', value: `${parentSuiteLabel?.prefix ?? ''}${resultSuite[0]}${parentSuiteLabel?.suffix ?? ''}` }
        ],
        ...metadata.links ?? []
      };

      if (suiteLabel) {
        currentTestResult.labels.push({ name: 'suite', value: suiteLabel });
      }
      if (subSuiteLabel) {
        currentTestResult.labels.push({ name: 'subSuite', value: subSuiteLabel });
      }

      currentTestUuid = allureRuntime.startTest(currentTestResult, scopeStack);
    }

    allureRuntime.updateTest(currentTestUuid, (test) => {
      test.stage = Stage.FINISHED;

      if (result.skipped) {
        test.status = Status.SKIPPED;
        test.statusDetails = {
          message: 'Test skipped',
          trace: 'Test execution was skipped by either \'xdescribe\' or \'xit\''
        };
      } else if (result.success) {
        test.status = Status.PASSED;
      } else {
        test.status = Status.FAILED;
        test.statusDetails = {
          message: 'Test failed. See the stack trace for details',
          trace: result.log?.join('\n') ?? 'No trace available'
        };
      }
    });

    finalizeTest();
  };

  this.onRunComplete = (): void => {
    log.debug('Cleaning up...');
    finalizeScopes();
  };

  function finalizeTest(): void {
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

  function finalizeScopes(): void {
    while (scopeStack.length > 0) {
      const scopeUuid = scopeStack.pop();
      allureRuntime.writeScope(scopeUuid);
    }
  }
}

KarmaAllure2Reporter.$inject = ['baseReporterDecorator', 'config.allureReporter', 'logger'];

export default {
  'reporter:allure': ['type', KarmaAllure2Reporter]
};