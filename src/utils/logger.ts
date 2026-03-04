import fs from "node:fs";
import path from "node:path";
import winston from "winston";

/**
 * Creates a Winston logger instance with console and file transports.
 *
 * @param context - Optional context string to include in all log messages
 * @returns Configured Winston logger instance
 */
export function createLogger(context?: string): winston.Logger {
  // Ensure logs directory exists
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Get log level from environment or default to 'info'
  const logLevel = process.env.LOG_LEVEL || "info";

  // Create format with context
  const format = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // Console format with colors
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
      const contextStr = context ? `[${context}] ` : "";
      const metaStr = Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata)}` : "";
      return `${timestamp} ${level}: ${contextStr}${message}${metaStr}`;
    }),
  );

  // File format (JSON)
  const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
  );

  // Create transports
  const transports: winston.transport[] = [
    // Console transport with colorized output
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
    }),
    // File transport with daily rotation
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      level: logLevel,
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ];

  // Create logger
  const logger = winston.createLogger({
    level: logLevel,
    format,
    transports,
    defaultMeta: context ? { context } : {},
  });

  return logger;
}
