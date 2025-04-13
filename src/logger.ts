import { stdout } from 'node:process';

class Logger {
  /**
   * Creates an instance of Logger.
   * @param name - An optional identifier for the logger instance.
   */
  constructor(private name: string = '') {}

  /**
   * Generates a formatted timestamp in 'YY-MM-DD HH:MM:SS TZ' format.
   * @returns A formatted date string.
   */
  now(): string {
    const d = new Date();
    return (
      d
        .toLocaleString('fr-CA', {
          dateStyle: 'short',
        })
        .substring(2) +
      ' ' +
      d
        .toLocaleString('en-IN', {
          timeZoneName: 'short',
          hourCycle: 'h24',
        })
        .split(', ')[1]
    );
  }

  /**
   * Writes a log message with the specified tag and styles.
   * @param tag - The log level tag (e.g., INFO, ERROR).
   * @param msg - The message to log.
   */
  write(tag: string, msg: string): void {
    stdout.write(`[${this.now()}] ${tag} (${this.name}): ${msg}\n`);
  }

  /** Logs an informational message. */
  info(msg: string): void {
    this.write('INFO', msg);
  }

  /** Logs an HTTP-related message. */
  http(msg: string): void {
    this.write('HTTP', msg);
  }

  /** Logs a success message. */
  success(msg: string): void {
    this.write('SUCCESS', msg);
  }

  /** Logs an error message. */
  error(msg: string): void {
    this.write('ERROR', msg);
  }

  /** Logs a warning message. */
  warn(msg: string): void {
    this.write('WARN', msg);
  }
}

export { Logger };
