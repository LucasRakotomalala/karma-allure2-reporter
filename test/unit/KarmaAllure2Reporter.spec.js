const mockery = require('mockery');

describe('KarmaAllureReporter', () => {
  let baseReporterDecorator, config, logger, ReporterRuntime, allureRuntimeMock, Reporter;

  beforeEach(() => {
    mockery.enable({ useCleanCache: true });
    mockery.warnOnUnregistered(false);

    // Mock allure-js-commons dependencies
    ReporterRuntime = jasmine.createSpy('ReporterRuntime');
    allureRuntimeMock = jasmine.createSpyObj('allureRuntime', [
      'startScope',
      'startTest',
      'updateTest',
      'stopTest',
      'writeTest',
      'writeScope',
    ]);

    ReporterRuntime.and.returnValue(allureRuntimeMock);

    mockery.registerMock('allure-js-commons/sdk/reporter', {
      ReporterRuntime,
      createDefaultWriter: jasmine.createSpy('createDefaultWriter').and.returnValue(() => {}),
      getEnvironmentLabels: jasmine.createSpy('getEnvironmentLabels').and.returnValue([
        { name: 'os', value: 'Linux' },
      ]),
      getLanguageLabel: jasmine.createSpy('getLanguageLabel').and.returnValue({ name: 'language', value: 'JavaScript' }),
      getFrameworkLabel: jasmine.createSpy('getFrameworkLabel').and.returnValue({ name: 'framework', value: 'karma' }),
      getHostLabel: jasmine.createSpy('getHostLabel').and.returnValue({ name: 'host', value: 'localhost' }),
      getThreadLabel: jasmine.createSpy('getThreadLabel').and.returnValue({ name: 'thread', value: '12345' }),
    });

    Reporter = require(`${process.cwd()}/src/KarmaAllure2Reporter.js`);
  });

  afterEach(() => {
    mockery.deregisterAll();
    mockery.disable();
  });

  beforeEach(() => {
    baseReporterDecorator = jasmine.createSpy('decorator');
    config = { allureReporter: { resultsDir: 'allure-results' } };
    logger = { create: jasmine.createSpy('logger').and.returnValue(jasmine.createSpyObj('log', ['debug'])) };
  });

  describe('onSpecComplete', () => {
    let reporter, browserMock, resultMock;

    beforeEach(() => {
      reporter = new Reporter(baseReporterDecorator, config, logger);

      browserMock = { name: 'Chrome' };
      resultMock = {
        description: 'should pass',
        suite: ['My Suite'],
        log: [],
        success: true,
        skipped: false,
      };
    });

    it('should start a new test on spec complete', () => {
      allureRuntimeMock.startScope.and.returnValue('scope-uuid');
      allureRuntimeMock.startTest.and.returnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.startScope).toHaveBeenCalledTimes(1);
      expect(allureRuntimeMock.startTest).toHaveBeenCalledWith(
        jasmine.objectContaining({
          name: 'should pass',
          fullName: 'My Suite should pass',
          stage: 'running',
        }),
        jasmine.any(Array)
      );
    });

    it('should update test status as passed', () => {
      allureRuntimeMock.startTest.and.returnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', jasmine.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.calls.argsFor(0)[1];
      const test = {};
      updateCallback(test);
      expect(test.status).toEqual('passed');
      expect(test.stage).toEqual('finished');
    });

    it('should update test status as skipped', () => {
      resultMock.success = false;
      resultMock.skipped = true;
      allureRuntimeMock.startTest.and.returnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', jasmine.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.calls.argsFor(0)[1];
      const test = {};
      updateCallback(test);
      expect(test.status).toEqual('skipped');
      expect(test.stage).toEqual('finished');
    });

    it('should update test status as failed', () => {
      resultMock.success = false;
      resultMock.skipped = false;
      resultMock.log = ['Test error'];
      allureRuntimeMock.startTest.and.returnValue('test-uuid');

      reporter.onSpecComplete(browserMock, resultMock);

      expect(allureRuntimeMock.updateTest).toHaveBeenCalledWith('test-uuid', jasmine.any(Function));
      const updateCallback = allureRuntimeMock.updateTest.calls.argsFor(0)[1];
      const test = {};
      updateCallback(test);
      expect(test.status).toEqual('failed');
      expect(test.stage).toEqual('finished');
      expect(test.statusDetails.message).toEqual('Test error');
    });
  });
});