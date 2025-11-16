/* eslint-disable class-methods-use-this */
import type { Logger, AdditionalData } from ".";

export class LoggerDummy implements Logger {
  debug(_message: string, _additionalData?: AdditionalData): void {}

  info(_message: string, _additionalData?: AdditionalData): void {}

  warn(_message: string, _additionalData?: AdditionalData): void {}

  error(_message: string, _additionalData?: AdditionalData): void {}

  appendKeys(_: { [key: string]: unknown }): void {}
}
