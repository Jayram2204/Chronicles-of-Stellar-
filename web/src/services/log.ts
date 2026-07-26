type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel =
  import.meta.env.MODE === 'production' ? 'warn' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function format(level: LogLevel, tag: string, message: string): string {
  const ts = new Date().toISOString().slice(11, 23);
  return `[${ts}] [${level.toUpperCase()}] [${tag}] ${message}`;
}

export function createLogger(tag: string) {
  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) console.debug(format('debug', tag, message), ...args);
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) console.info(format('info', tag, message), ...args);
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) console.warn(format('warn', tag, message), ...args);
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) console.error(format('error', tag, message), ...args);
    },
  };
}
