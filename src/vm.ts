import { Worker } from 'worker_threads';

/**
 * Executes a script in a virtual machine (VM) context using a worker thread.
 * The script is executed with the provided context data, and the result is returned asynchronously.
 * If the script execution exceeds the specified timeout, the operation is aborted.
 *
 * @param {string} script - The script to be executed in the VM context.
 * @param {any} contextData - The data to be provided to the script's execution context.
 * @param {number} [timeout=10000] - The maximum time (in milliseconds) to allow the script to run before timing out. Default is 10000ms (10 seconds).
 *
 * @returns {Promise<any>} A promise that resolves with the result of the script execution or rejects with an error.
 *
 * @throws {Error} Throws an error if the worker encounters an error, if the script execution exceeds the timeout, or if the worker exits with a non-zero exit code.
 */
function runScript(script: string, contextData: any, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      `
        const vm = require('node:vm');
        const { parentPort, workerData } = require("node:worker_threads");

        const context = Object.create({
          exports: { handler: () => {} },
          clearInterval,
          clearTimeout,
          setInterval,
          setTimeout,
          structuredClone,
          atob,
          btoa,
          fetch,
          crypto
        });
        
        vm.createContext(context);

        vm.runInContext(workerData.script, context);

        Promise.resolve(context.exports.handler(workerData.contextData))
          .then(data => parentPort.postMessage(['success', data]))
          .catch(err => parentPort.postMessage(['error', err]));
      `,
      { eval: true, workerData: { script, contextData } },
    );

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('Code execution timed out'));
    }, timeout);

    let isResolved = false;

    const finished = () => {
      clearTimeout(timer);
      if (isResolved) return true;
      isResolved = true;
      return false;
    };

    worker.on('message', ([status, data]) => {
      if (finished()) return;

      if (status === 'success') resolve(data);
      else reject(data);
    });

    worker.on('error', (err) => {
      if (finished()) return;

      reject(err);
    });

    worker.on('exit', (code) => {
      if (finished()) return;

      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      else resolve(undefined);
    });
  });
}

export { runScript };
