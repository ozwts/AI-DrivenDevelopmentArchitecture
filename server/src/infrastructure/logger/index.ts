import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import type { Logger, AdditionalData } from "@/domain/support/logger";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/**
 * AWS Lambda Powertools Logger implementation
 */
export class LoggerImpl implements Logger {
  #logger: PowertoolsLogger;

  constructor({
    logLevel,
    serviceName,
  }: {
    logLevel?: LogLevel;
    serviceName: string;
  }) {
    this.#logger = new PowertoolsLogger({
      logLevel: logLevel ?? "DEBUG",
      serviceName,
    });
  }

  debug(message: string, data?: AdditionalData): void {
    if (data === undefined) {
      this.#logger.debug(message);
    } else if (data instanceof Error) {
      this.#logger.debug(message, data);
    } else {
      this.#logger.debug(message, data);
    }
  }

  info(message: string, data?: AdditionalData): void {
    if (data === undefined) {
      this.#logger.info(message);
    } else if (data instanceof Error) {
      this.#logger.info(message, data);
    } else {
      this.#logger.info(message, data);
    }
  }

  warn(message: string, data?: AdditionalData): void {
    if (data === undefined) {
      this.#logger.warn(message);
    } else if (data instanceof Error) {
      this.#logger.warn(message, data);
    } else {
      this.#logger.warn(message, data);
    }
  }

  error(message: string, data?: AdditionalData): void {
    if (data === undefined) {
      this.#logger.error(message);
    } else if (data instanceof Error) {
      this.#logger.error(message, data);
    } else {
      this.#logger.error(message, data);
    }
  }

  appendKeys(options: Record<string, unknown>): void {
    this.#logger.appendKeys(options);
  }
}
