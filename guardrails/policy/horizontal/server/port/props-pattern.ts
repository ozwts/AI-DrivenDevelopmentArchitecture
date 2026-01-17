/**
 * @what ポートのメソッド引数でPropsパターン（オブジェクト引数）を使用しているか検証
 * @why 位置引数は順序に依存し、可読性と拡張性が低いため
 * @failure 複数の位置引数を持つメソッドを検出した場合に警告
 *
 * @concept Propsパターン
 *
 * ポート層のメソッド引数では、2つ以上のパラメータがある場合はPropsパターン（オブジェクト引数）を使用する。
 *
 * **理由:**
 * - **可読性**: プロパティ名で意図が明確
 * - **拡張性**: 新しいパラメータを追加しやすい
 * - **順序非依存**: 引数の順序を覚える必要がない
 *
 * @example-good
 * ```typescript
 * // ✅ Good: Propsパターン
 * export type StorageClient = {
 *   generatePresignedUploadUrl(props: {
 *     key: string;
 *     contentType: string;
 *     expiresIn?: number;
 *   }): Promise<Result<string, UnexpectedError>>;
 *
 *   deleteObject(props: { key: string }): Promise<Result<void, UnexpectedError>>;
 * };
 *
 * // ✅ Good: 単一引数は許可
 * export type AuthClient = {
 *   decodeToken(token: string): Promise<Result<AuthPayload, AuthError>>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 複数の位置引数
 * export type StorageClient = {
 *   generatePresignedUploadUrl(
 *     key: string,
 *     contentType: string,
 *     expiresIn?: number
 *   ): Promise<Result<string, UnexpectedError>>;
 *
 *   copyObject(
 *     sourceKey: string,
 *     destinationKey: string
 *   ): Promise<Result<void, UnexpectedError>>;
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\/port\/[^/]+\/index\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.") || fileName.includes("dummy.ts")) {
      return;
    }

    // MethodSignature（type内のメソッドシグネチャ）をチェック
    if (ts.isMethodSignature(node)) {
      // メソッド名を取得
      if (!ts.isIdentifier(node.name)) return;
      const methodName = node.name.text;

      // パラメータ数をチェック
      const params = node.parameters;
      if (params.length <= 1) return; // 0または1つのパラメータは許可

      // 2つ以上のパラメータがある場合は警告
      const paramNames = params.map((p) => {
        if (ts.isIdentifier(p.name)) {
          return p.name.text;
        }
        return "unknown";
      });

      ctx.report(
        node,
        `メソッド「${methodName}」が複数の位置引数を持っています（${params.length}個: ${paramNames.join(", ")}）。\n` +
          `■ ❌ Bad: ${methodName}(${paramNames.join(", ")})\n` +
          `■ ✅ Good: ${methodName}(props: { ${paramNames.join("; ")} })\n` +
          "■ 理由: Propsパターン（オブジェクト引数）を使用して、可読性と拡張性を向上させてください。"
      );
    }

    // PropertySignature（関数型のプロパティ）もチェック
    if (ts.isPropertySignature(node) && node.type !== undefined) {
      // メソッド名を取得
      if (!ts.isIdentifier(node.name)) return;
      const methodName = node.name.text;

      // 型が関数型かチェック
      if (ts.isFunctionTypeNode(node.type)) {
        const params = node.type.parameters;
        if (params.length <= 1) return; // 0または1つのパラメータは許可

        // 2つ以上のパラメータがある場合は警告
        const paramNames = params.map((p) => {
          if (ts.isIdentifier(p.name)) {
            return p.name.text;
          }
          return "unknown";
        });

        ctx.report(
          node,
          `メソッド「${methodName}」が複数の位置引数を持っています（${params.length}個: ${paramNames.join(", ")}）。\n` +
            `■ ❌ Bad: ${methodName}(${paramNames.join(", ")})\n` +
            `■ ✅ Good: ${methodName}(props: { ${paramNames.join("; ")} })\n` +
            "■ 理由: Propsパターン（オブジェクト引数）を使用して、可読性と拡張性を向上させてください。"
        );
      }
    }
  },
});
