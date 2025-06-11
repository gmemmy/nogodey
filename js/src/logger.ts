export type Meta = Record<string, any>;

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Creates a structured log entry and outputs it as JSON
 */
function log(level: string, meta: Meta, message: string): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  console.log(JSON.stringify(entry));
}

/**
 * Logs an info level message with optional metadata
 */
export function info(meta: Meta, message: string): void {
  log('info', meta, message);
}

/**
 * Logs a warning level message with optional metadata
 */
export function warn(meta: Meta, message: string): void {
  log('warn', meta, message);
}

/**
 * Logs an error level message with optional metadata
 */
export function error(meta: Meta, message: string): void {
  log('error', meta, message);
}

/**
 * Timer utility for measuring operation duration
 */
export class Timer {
  private readonly name: string;
  private readonly start: number;

  constructor(name: string) {
    this.name = name;
    this.start = Date.now();
  }

  /**
   * Log the duration since the timer was started
   */
  observe(): void {
    const duration = Date.now() - this.start;
    info(
      { 
        [`${this.name}_duration_ms`]: duration,
        operation: this.name,
      },
      'timer completed'
    );
  }
}

/**
 * Create and start a new timer
 */
export function startTimer(name: string): Timer {
  return new Timer(name);
}

/**
 * Convenience function for timing async operations
 */
export async function timeAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  const timer = startTimer(name);
  try {
    const result = await operation();
    timer.observe();
    return result;
  } catch (error) {
    timer.observe();
    throw error;
  }
} 