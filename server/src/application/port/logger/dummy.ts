import type { Logger, AdditionalData } from ".";

export class LoggerDummy implements Logger {
  debug(_message: string, _additionalData?: AdditionalData): void {
    // No-op for testing
  }

  info(_message: string, _additionalData?: AdditionalData): void {
    // No-op for testing
  }

  warn(_message: string, _additionalData?: AdditionalData): void {
    // No-op for testing
  }

  error(_message: string, _additionalData?: AdditionalData): void {
    // No-op for testing
  }

  appendKeys(_params: Record<string, unknown>): void {
    // No-op for testing
  }
}
