import type { ZodError } from "zod";

/**
 * Zodバリデーションエラーをフォーマットしてエラーメッセージを作成する
 *
 * @param zodError Zodエラーオブジェクト
 * @returns フォーマットされたエラーメッセージ
 */
export const formatZodError = (zodError: ZodError): string =>
  zodError.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
