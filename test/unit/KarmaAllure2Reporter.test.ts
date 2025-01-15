import { ReporterRuntime, createDefaultWriter } from 'allure-js-commons/sdk/reporter';
import KarmaAllure2ReporterPlugin from '../../src/index';
import { TestResult } from 'allure-js-commons';
import { Browser, KarmaAllure2ReporterConfig, KarmaTestResult } from '../../src/model';

const KarmaAllure2Reporter = KarmaAllure2ReporterPlugin['reporter:allure'][1] as typeof KarmaAllure2Reporter;

jest.mock('allure-js-commons/sdk/reporter', () => ({
  ReporterRuntime: jest.fn(),
  createDefaultWriter: jest.fn(() => jest.fn()),
  getEnvironmentLabels: jest.fn(() => [{ name: 'os', value: 'Linux' }]),
  getLanguageLabel: jest.fn(() => ({ name: 'language', value: 'javascript' })),
  getFrameworkLabel: jest.fn(() => ({ name: 'framework', value: 'jasmine' })),
  getHostLabel: jest.fn(() => ({ name: 'host', value: 'localhost' })),
  getThreadLabel: jest.fn(() => ({ name: 'thread', value: '12345' }))
}));

describe('KarmaAllure2Reporter', () => {
  let baseReporterDecorator: jest.Mock;
  let config: KarmaAllure2ReporterConfig;
  let logger: { create: jest.Mock };
  let allureRuntimeMock: jest.Mocked<ReporterRuntime>;

  beforeEach(() => {
    // Mock ReporterRuntime instance
    allureRuntimeMock = {
      startScope: jest.fn(),
      startTest: jest.fn(),
      updateTest: jest.fn(),
      stopTest: jest.fn(),
      writeTest: jest.fn(),
      writeScope: jest.fn()
    } as unknown as jest.Mocked<ReporterRuntime>;

    // Replace ReporterRuntime constructor to return our mock
    (ReporterRuntime as jest.Mock).mockImplementation(() => allureRuntimeMock);

    baseReporterDecorator = jest.fn();
    config = { resultsDir: 'allure-results' };
    logger = {
      create: jest.fn(() => ({ debug: jest.fn() }))
    };
  });

  describe('Initialization', () => {
    it('should initialize allure runtime with default config', () => {
      new KarmaAllure2Reporter(baseReporterDecorator, {}, logger);

      expect(ReporterRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          writer: expect.any(Function)
        })
      );

      expect(createDefaultWriter).toHaveBeenCalledWith({ resultsDir: 'allure-results' });
    });

    it('should use custom results directory if provided', () => {
      const customConfig = { resultsDir: 'custom-results' };
      new KarmaAllure2Reporter(baseReporterDecorator, customConfig, logger);

      expect(ReporterRuntime).toHaveBeenCalledWith(
        expect.objectContaining({
          writer: expect.any(Function)
        })
      );

      expect(createDefaultWriter).toHaveBeenCalledWith({ resultsDir: 'custom-results' });
    });
  });

  describe('onSpecComplete', () => {
    let reporter: any;
    let browserMock: Browser;
    let resultMock: KarmaTestResult;

    beforeEach(() => {
      reporter = new KarmaAllure2Reporter(baseReporterDecorator, config, logger);

      browserMock = { name: 'Chrome' };
      resultMock = {
        description: 'should pass',
        suite: ['My Suite'],
        log: [],
        success: true,
        skipped: false
      };
    });

    it('should start a new test on spec complete', () => {
      allureRuntimeMock.startScope.mockReturnValue('scope-uuid');
      allureRuntimeMock.startTest.mockReturnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.startScope).toHaveBeenCalledTimes(1);
      expect(allureRuntimeMock.startTest).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'should pass',
          fullName: 'My Suite > should pass',
          stage: 'running'
        }),
        expect.any(Array)
      );
    });

    it('should update test status as passed', () => {
      allureRuntimeMock.startTest.mockReturnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', expect.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.mock.calls[0][1];
      const test = {} as TestResult;
      updateCallback(test);
      expect(test.status).toEqual('passed');
      expect(test.stage).toEqual('finished');
    });

    it('should update test status as skipped', () => {
      resultMock.success = false;
      resultMock.skipped = true;
      allureRuntimeMock.startTest.mockReturnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', expect.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.mock.calls[0][1];
      const test = {} as TestResult;
      updateCallback(test);
      expect(test.status).toEqual('skipped');
      expect(test.stage).toEqual('finished');
      expect(test.statusDetails.message).toEqual('Test skipped');
      expect(test.statusDetails.trace).toEqual('Test execution was skipped by either \'xdescribe\' or \'xit\'');
    });

    it('should update test status as failed', () => {
      resultMock.success = false;
      resultMock.skipped = false;
      resultMock.log = ['Test error'];
      allureRuntimeMock.startTest.mockReturnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', expect.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.mock.calls[0][1];
      const test = {} as TestResult;
      updateCallback(test);
      expect(test.status).toEqual('failed');
      expect(test.stage).toEqual('finished');
      expect(test.statusDetails.message).toEqual('Test failed. See the stack trace for details');
      expect(test.statusDetails.trace).toEqual('Test error');
    });
  });

  describe('onRunComplete', () => {
    it('should finalize all scopes', () => {
      const reporter = new KarmaAllure2Reporter(baseReporterDecorator, config, logger);
      reporter.onRunComplete();

      expect(allureRuntimeMock.writeScope).toHaveBeenCalledTimes(0);
    });
  });
});