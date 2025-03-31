import { colors } from './colors';
import { stdout } from 'node:process';
import { ColorCode } from './enums';

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
   * @param styles - An array of color codes for formatting.
   * @param msg - The message to log.
   */
  write(tag: string, styles: ColorCode[], msg: string): void {
    stdout.write(
      colors.grey('[', this.now(), '] ') +
        colors.style(styles, [tag]) +
        ' ' +
        (this.name ? colors.grey('(', this.name, ')') : '') +
        ': ' +
        colors.white(msg) +
        '\n',
    );
  }

  /** Logs an informational message. */
  info(msg: string): void {
    this.write('INFO', [ColorCode.cyan, ColorCode.bold], msg);
  }

  /** Logs an HTTP-related message. */
  http(msg: string): void {
    this.write('HTTP', [ColorCode.cyan, ColorCode.bold], msg);
  }

  /** Logs a success message. */
  success(msg: string): void {
    this.write('SUCCESS', [ColorCode.green, ColorCode.bold], msg);
  }

  /** Logs an error message. */
  error(msg: string): void {
    this.write('ERROR', [ColorCode.red, ColorCode.bold], msg);
  }

  /** Logs a warning message. */
  warn(msg: string): void {
    this.write('WARN', [ColorCode.yellow, ColorCode.bold], msg);
  }
}

export { Logger };
