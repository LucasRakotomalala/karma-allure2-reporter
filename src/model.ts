import { ReporterConfig } from 'allure-js-commons/sdk/reporter';

export interface Browser {
  name: string;

  [key: string]: unknown;
}

export interface KarmaTestResult {
  description: string;
  suite: Array<string>;
  log: Array<string>;
  success: boolean;
  skipped: boolean;

  [key: string]: unknown;
}

export interface KarmaAllure2ReporterConfig extends ReporterConfig {
  customOptions?: {
    projectLanguage?: string;
    testFramework?: string;
    parentSuitePrefix?: string;
  };
}