import { runScript } from '../src/vm';

describe('Vm', () => {
  it('should execute script successfully', async () => {
    const result = await runScript('exports.handler = ({ data }) => data;', { data: 'test' });

    expect(result).toBe('test');
  });

  it('should handle script errors', async () => {
    await expect(runScript('some script', { data: 'test' })).rejects.toThrow();
  });

  it('should timeout execution if it exceeds the limit', async () => {
    const timeout = 100; // Set a shorter timeout for the test
    await expect(
      runScript(
        'exports.handler = async () => await new Promise((resolve) => setTimeout(resolve, 1000));',
        {},
        timeout,
      ),
    ).rejects.toThrow('Code execution timed out');
  });
});
