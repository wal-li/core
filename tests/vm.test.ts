import { runScript } from '../src/vm';

// Mock the Worker class used in the executeScript method
jest.mock('worker_threads', () => ({
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    postMessage: jest.fn(),
    terminate: jest.fn(),
  })),
}));

describe('Vm', () => {
  let workerMock: any;

  beforeEach(() => {
    workerMock = {
      on: jest.fn(),
      postMessage: jest.fn(),
      terminate: jest.fn(),
    };

    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock Worker to return the mock worker instance
    require('worker_threads').Worker.mockImplementation(() => workerMock);
  });

  test('should execute script successfully', async () => {
    // Mock the message event to simulate successful execution
    workerMock.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        callback(['success', 'Executed successfully']);
      }
    });

    const result = await runScript('some script', { data: 'test' });

    expect(result).toBe('Executed successfully');
    expect(workerMock.terminate).not.toHaveBeenCalled();
  });

  test('should handle script errors', async () => {
    // Mock the message event to simulate script error
    workerMock.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        callback(['error', new Error('Execution failed')]);
      }
    });

    await expect(runScript('some script', { data: 'test' })).rejects.toThrow('Execution failed');
  });

  test('should timeout execution if it exceeds the limit', async () => {
    // Mock the message event to simulate no response, causing a timeout
    workerMock.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        // No message, so the timeout will be triggered
      }
    });

    const timeout = 100; // Set a shorter timeout for the test
    await expect(runScript('some script', { data: 'test' }, timeout)).rejects.toThrow('Code execution timed out');
  });

  test('should terminate worker if the script exceeds the timeout', async () => {
    const timeout = 100; // Set a shorter timeout for the test

    // Mock the message event to simulate no response, causing a timeout
    workerMock.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        // No message, so the timeout will be triggered
      }
    });

    await expect(runScript('some script', { data: 'test' }, timeout)).rejects.toThrow('Code execution timed out');

    expect(workerMock.terminate).toHaveBeenCalled();
  });

  test('should reject if worker exits with a non-zero code', async () => {
    // Mock worker exit event with non-zero exit code
    workerMock.on.mockImplementation((event, callback) => {
      if (event === 'exit') {
        callback(1); // Non-zero exit code
      }
    });

    await expect(runScript('some script', { data: 'test' })).rejects.toThrow('Worker stopped with exit code 1');
  });
});
