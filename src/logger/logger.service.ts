/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import chalk from 'chalk';
import { createLogger, format, Logger, transports } from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: Logger;
  private readonly timeFormat: string;

  constructor() {
    this.timeFormat = 'DD/MM/YYYY, HH:mm:ss';

    this.logger = createLogger({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: format.combine(
        format.timestamp({
          format: this.timeFormat,
        }),
        format.errors({ stack: true }),
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(({ context, message, level, timestamp }) => {
              const strApp = chalk.green('[NEST] -');
              const strContext = chalk.yellow(`[${context}]`);
              return `${strApp} ${timestamp} ${level} ${strContext} ${message}`;
            }),
          ),
        }),
        this.dailyRotateTransport('info'),
        this.dailyRotateTransport('error'),
      ],
    });
  }

  dailyRotateTransport(level: string) {
    return new transports.DailyRotateFile({
      level,
      dirname: `logs/${level}`,
      filename: `%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: format.combine(
        format.timestamp({
          format: this.timeFormat,
        }),
        format.json(),
      ),
    });
  }

  error(message: string, context: string) {
    this.logger.log('error', message, { context });
  }

  warn(message: string, context: string) {
    this.logger.log('warn', message, { context });
  }

  log(message: string, context: string) {
    this.logger.log('info', message, { context });
  }

  debug(message: string, context: string) {
    this.logger.log('debug', message, { context });
  }

  fatal(message: string, context: string) {
    this.logger.log('fatal', message, { context });
  }

  verbose(message: string, context: string) {
    this.logger.log('verbose', message, { context });
  }
}
