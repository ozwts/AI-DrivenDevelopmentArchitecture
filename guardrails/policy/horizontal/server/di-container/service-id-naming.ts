/**
 * @what サービスID（DIコンテナの識別子）の命名規則を検証
 * @why 一貫した命名規則により、依存関係の解決が予測可能になるため
 * @failure 命名規則に従っていないサービスIDを検出した場合に警告
 *
 * @concept サービスID命名規則
 *
 * サービスIDは以下の命名規則に従う（文字列リテラル、as const）。
 *
 * | カテゴリ | パターン | 例 |
 * |---------|---------|-----|
 * | 環境変数 | `{VARIABLE_NAME}` | `USERS_TABLE_NAME` |
 * | ユーティリティ | `{NAME}` | `LOGGER`, `FETCH_NOW` |
 * | リポジトリ | `{ENTITY}_REPOSITORY` | `USER_REPOSITORY` |
 * | ユースケース | `{ACTION}_{ENTITY}_USE_CASE` | `CREATE_PROJECT_USE_CASE` |
 * | UoWランナー | `{ACTION}_{ENTITY}_UOW_RUNNER` | `DELETE_PROJECT_UOW_RUNNER` |
 *
 * @example-good
 * ```typescript
 * // ✅ Good: 命名規則に従い、文字列リテラルで定義
 * export const serviceId = {
 *   USER_REPOSITORY: "USER_REPOSITORY",
 *   CREATE_PROJECT_USE_CASE: "CREATE_PROJECT_USE_CASE",
 *   DELETE_PROJECT_UOW_RUNNER: "DELETE_PROJECT_UOW_RUNNER",
 *   LOGGER: "LOGGER",
 *   USERS_TABLE_NAME: "USERS_TABLE_NAME",
 * } as const;
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 命名規則に従っていない
 * export const serviceId = {
 *   userRepo: "userRepo",  // camelCase
 *   CreateProjectUseCase: "CreateProjectUseCase",  // PascalCase
 *   UserRepoImpl: "UserRepoImpl",  // Implは付けない
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /service-id\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // PropertyAssignment（オブジェクトリテラルのプロパティ）をチェック
    if (ts.isPropertyAssignment(node)) {
      // プロパティ名を取得
      let propertyName: string | undefined;
      if (ts.isIdentifier(node.name)) {
        propertyName = node.name.text;
      } else if (ts.isStringLiteral(node.name)) {
        propertyName = node.name.text;
      }

      if (propertyName === undefined) return;

      // SCREAMING_SNAKE_CASEでない場合
      if (!/^[A-Z][A-Z0-9_]*$/.test(propertyName)) {
        ctx.report(
          node,
          `サービスID「${propertyName}」がSCREAMING_SNAKE_CASEではありません。\n` +
            `■ ❌ Bad: ${propertyName}\n` +
            `■ ✅ Good: ${propertyName.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}\n` +
            "■ 理由: サービスIDは一貫してSCREAMING_SNAKE_CASEで命名します。"
        );
        return;
      }

      // IMPLが含まれている場合
      if (propertyName.includes("IMPL")) {
        ctx.report(
          node,
          `サービスID「${propertyName}」にIMPLが含まれています。\n` +
            `■ ❌ Bad: ${propertyName}\n` +
            `■ ✅ Good: ${propertyName.replace(/_?IMPL/g, "")}\n` +
            "■ 理由: サービスIDは型（インターフェース）を表すため、IMPLは含めません。"
        );
        return;
      }

      // 値が文字列リテラルかチェック
      if (ts.isStringLiteral(node.initializer)) {
        const value = node.initializer.text;

        // プロパティ名と値が一致するかチェック
        if (value !== propertyName) {
          ctx.report(
            node,
            `サービスID「${propertyName}」とその値「${value}」が一致しません。\n` +
              `■ ❌ Bad: ${propertyName}: "${value}"\n` +
              `■ ✅ Good: ${propertyName}: "${propertyName}"\n` +
              "■ 理由: プロパティ名と値は一致させることで、一貫性を保ちます。"
          );
        }
      }
    }
  },
});
