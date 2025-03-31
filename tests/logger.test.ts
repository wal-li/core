import { Logger } from '../src/logger';

describe('Logger', () => {
  let logger: Logger;
  let stdoutSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new Logger('TestLogger');
    stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('should log an info message', () => {
    logger.info('This is an info message');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('INFO');
  });

  it('should log an HTTP message', () => {
    logger.http('This is an HTTP message');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('HTTP');
  });

  it('should log a success message', () => {
    logger.success('Operation successful');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('SUCCESS');
  });

  it('should log an error message', () => {
    logger.error('An error occurred');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('ERROR');
  });

  it('should log a warning message', () => {
    logger.warn('This is a warning');
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy.mock.calls[0][0]).toContain('WARN');
  });
});
