/**
 * エラーメッセージ定数
 */
export const unexpectedErrorMessage = "予期せぬエラーが発生しました";
export const notFoundErrorMessage = "リソースが見つかりませんでした";
export const validationErrorMessage = "入力値が不正です";
export const conflictErrorMessage = "データが競合しています";
export const forbiddenErrorMessage = "アクセスが拒否されました";
export const domainErrorMessage = "ドメインエラーが発生しました";

export class UnexpectedError extends Error {
  constructor(message?: string) {
    super(message ?? unexpectedErrorMessage);
    this.name = "UnexpectedError";
  }
}

export class NotFoundError extends Error {
  constructor(message?: string) {
    super(message ?? notFoundErrorMessage);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message?: string) {
    super(message ?? validationErrorMessage);
    this.name = "ValidationError";
  }
}

export class ConflictError extends Error {
  constructor(message?: string) {
    super(message ?? conflictErrorMessage);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends Error {
  constructor(message?: string) {
    super(message ?? forbiddenErrorMessage);
    this.name = "ForbiddenError";
  }
}

export class DomainError extends Error {
  constructor(message?: string) {
    super(message ?? domainErrorMessage);
    this.name = "DomainError";
  }
}
