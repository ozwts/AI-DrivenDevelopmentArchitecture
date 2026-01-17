/**
 * @what 失敗しうるメソッドがResult型を返しているか検証
 * @why 例外を投げずにResult型で失敗を表現することで、型安全なエラーハンドリングを実現するため
 * @failure Promise<void>やPromise<T>を返すメソッドで、Result型を使用していない場合に警告
 *
 * @concept Result型によるエラーハンドリング
 *
 * ポート層のメソッドで失敗しうる操作は、例外を投げずに`Result<T, E>`型を返す。
 *
 * **理由:**
 * - **型安全性**: エラーケースが型で明示される
 * - **予測可能性**: 呼び出し側がエラーハンドリングを強制される
 * - **純粋性**: 例外による暗黙的な制御フローを避ける
 *
 * @example-good
 * ```typescript
 * // ✅ Good: Result型で失敗を表現
 * export type StorageClient = {
 *   deleteObject(props: { key: string }): Promise<Result<void, UnexpectedError>>;
 *   generatePresignedUploadUrl(props: { key: string }): Promise<Result<string, UnexpectedError>>;
 * };
 *
 * export type AuthClient = {
 *   decodeToken(token: string): Promise<Result<AuthPayload, AuthError>>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 例外を投げる可能性がある
 * export type StorageClient = {
 *   deleteObject(props: { key: string }): Promise<void>;  // 失敗時にthrow
 *   generatePresignedUploadUrl(props: { key: string }): Promise<string>;  // 失敗時にthrow
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

/**
 * 型がResult型を含むかチェック
 */
const containsResultType = (typeNode: ts.TypeNode, sourceFile: ts.SourceFile): boolean => {
  const typeText = typeNode.getText(sourceFile);
  return typeText.includes("Result<");
};

/**
 * Promise<T>のTを取得
 */
const getPromiseInnerType = (typeNode: ts.TypeNode): ts.TypeNode | undefined => {
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName) && typeName.text === "Promise") {
      if (typeNode.typeArguments !== undefined && typeNode.typeArguments.length > 0) {
        return typeNode.typeArguments[0];
      }
    }
  }
  return undefined;
};

// 失敗しうる操作を示すメソッド名パターン
const FALLIBLE_METHOD_PATTERNS = [
  /^delete/i,
  /^remove/i,
  /^create/i,
  /^update/i,
  /^save/i,
  /^generate/i,
  /^decode/i,
  /^verify/i,
  /^authenticate/i,
  /^upload/i,
  /^download/i,
  /^fetch/i,
  /^get/i,  // 外部サービスからのget
];

/**
 * メソッド名が失敗しうる操作を示すかチェック
 */
const isFallibleMethod = (methodName: string): boolean => {
  // Loggerのメソッドは除外（debug, info, warn, error, appendKeys）
  const loggerMethods = ["debug", "info", "warn", "error", "appendKeys"];
  if (loggerMethods.includes(methodName)) {
    return false;
  }

  return FALLIBLE_METHOD_PATTERNS.some((pattern) => pattern.test(methodName));
};

export const policyCheck = createASTChecker({
  filePattern: /\/port\/[^/]+\/index\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.") || fileName.includes("dummy.ts")) {
      return;
    }

    // fetch-nowは関数型なので除外
    if (fileName.includes("/fetch-now/")) {
      return;
    }

    // PropertySignature（型リテラルのメソッドシグネチャ）をチェック
    if (ts.isPropertySignature(node) || ts.isMethodSignature(node)) {
      // メソッド名を取得
      if (!ts.isIdentifier(node.name)) return;
      const methodName = node.name.text;

      // 戻り値の型を取得
      const returnType = node.type;
      if (returnType === undefined) return;

      // Promiseを返すメソッドかチェック
      const innerType = getPromiseInnerType(returnType);
      if (innerType === undefined) return;

      // 失敗しうるメソッドかチェック
      if (!isFallibleMethod(methodName)) return;

      // Result型を含むかチェック
      if (!containsResultType(innerType, ctx.sourceFile)) {
        const returnTypeText = returnType.getText(ctx.sourceFile);
        ctx.report(
          node,
          `失敗しうるメソッド「${methodName}」がResult型を返していません。\n` +
            `■ 現在: ${returnTypeText}\n` +
            `■ ✅ Good: Promise<Result<T, UnexpectedError>>\n` +
            "■ 理由: 例外を投げずにResult型で失敗を表現し、型安全なエラーハンドリングを実現します。"
        );
      }
    }
  },
});
