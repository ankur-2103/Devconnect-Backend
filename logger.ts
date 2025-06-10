// src/logger.ts
import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ]
});

// Override console methods to log via Winston
console.log = (...args: unknown[]) => logger.info(args.map(String).join(' '));
console.info = (...args: unknown[]) => logger.info(args.map(String).join(' '));
console.warn = (...args: unknown[]) => logger.warn(args.map(String).join(' '));
console.error = (...args: unknown[]) => logger.error(args.map(String).join(' '));

export default logger;
