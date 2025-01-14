import { ReporterConfig } from 'allure-js-commons/sdk/reporter';

export interface KarmaAllure2ReporterConfig extends ReporterConfig {
  customOptions?: {
    projectLanguage?: string;
    testFramework?: string;
  };
}