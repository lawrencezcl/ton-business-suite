import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

// Get log level from environment or default to info
const getLogLevel = (): string => {
  return process.env.LOG_LEVEL || 'info';
};

// Create logger factory function
export function createLogger(serviceName: string): winston.Logger {
  const logger = winston.createLogger({
    level: getLogLevel(),
    format: logFormat,
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.Console(),
    ],
    rejectionHandlers: [
      new winston.transports.Console(),
    ],
  });

  // Add file transports in production
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    logger.add(
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  }

  return logger;
}

// Default logger for shared modules
export const defaultLogger = createLogger('ton-business');

export default createLogger;