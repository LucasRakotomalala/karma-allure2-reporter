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

export interface LabelAffix {
  prefix: string;
  suffix: string;
}

export interface KarmaAllure2ReporterConfigCustomOptions {
  projectLanguage: string;
  testFramework: string;
  parentSuiteLabel: Partial<LabelAffix>;
  packageLabel: Partial<LabelAffix>;
}

export interface KarmaAllure2ReporterConfig extends ReporterConfig {
  customOptions?: Partial<KarmaAllure2ReporterConfigCustomOptions>;
}