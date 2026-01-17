/**
 * @what fetchNow()の戻り値がdateToIsoString()で変換されているか検証
 * @why fetchNow().toISOString()はUTCになりJSTにならないため、必ずdateToIsoString()を使用
 * @failure fetchNow().toISOString()を検出した場合にエラー
 *
 * @concept 時刻取得パターン
 *
 * UseCase層では`fetchNow()`の戻り値を必ず`dateToIsoString()`でISO 8601文字列に変換する。
 *
 * **理由:**
 * - **タイムゾーンの一貫性**: `toISOString()`はUTCになるが、`dateToIsoString()`はJSTに変換
 * - **テスト容易性**: `buildFetchNowDummy()`で固定時刻を注入可能
 * - **一貫性**: 全UseCaseで同じパターンを使用
 *
 * @example-good
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // ✅ dateToIsoString()で変換
 *     const now = dateToIsoString(this.#props.fetchNow());
 *
 *     const newProject = Project.from({
 *       // ...
 *       createdAt: now,
 *       updatedAt: now,
 *     });
 *
 *     return Result.ok(newProject);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput) {
 *     // ❌ toISOString()を直接使用
 *     const now = this.#props.fetchNow().toISOString();  // ❌ UTCになる
 *
 *     // ❌ new Date()を直接使用
 *     const now = new Date().toISOString();  // ❌ テスト不可能
 *
 *     return Result.ok(project);
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // CallExpression（メソッド呼び出し）をチェック
    if (!ts.isCallExpression(node)) return;

    // PropertyAccessExpression（obj.method()形式）かチェック
    if (!ts.isPropertyAccessExpression(node.expression)) return;

    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    const methodName = node.expression.name.text;

    // toISOString()メソッドの呼び出しをチェック
    if (methodName !== "toISOString") return;

    // fetchNow().toISOString()パターンを検出
    const objectExpression = node.expression.expression;

    // fetchNow()呼び出しかチェック
    if (ts.isCallExpression(objectExpression)) {
      if (
        ts.isPropertyAccessExpression(objectExpression.expression) &&
        ts.isIdentifier(objectExpression.expression.expression) &&
        ts.isIdentifier(objectExpression.expression.name)
      ) {
        const propertyAccess = objectExpression.expression;

        // 型ガード: expressionがIdentifierであることを確認
        if (!ts.isIdentifier(propertyAccess.expression)) return;

        const objectName = propertyAccess.expression.text;
        const propertyName = propertyAccess.name.text;

        // this.#props.fetchNow().toISOString()パターン
        if (
          (objectName === "props" || objectName.startsWith("#props")) &&
          propertyName === "fetchNow"
        ) {
          ctx.report(
            node,
            "fetchNow()の戻り値に対してtoISOString()を直接呼び出しています。\n" +
              "■ ❌ Bad: const now = this.#props.fetchNow().toISOString();\n" +
              "■ ✅ Good: const now = dateToIsoString(this.#props.fetchNow());\n" +
              "■ 理由: toISOString()はUTCになりますが、dateToIsoString()はJSTに変換します。"
          );
          return;
        }
      }
    }

    // new Date().toISOString()パターンを検出
    if (ts.isNewExpression(objectExpression)) {
      if (
        ts.isIdentifier(objectExpression.expression) &&
        objectExpression.expression.text === "Date"
      ) {
        ctx.report(
          node,
          "new Date().toISOString()を使用しています。\n" +
            "■ ❌ Bad: const now = new Date().toISOString();\n" +
            "■ ✅ Good: const now = dateToIsoString(this.#props.fetchNow());\n" +
            "■ 理由: テスト不可能になり、タイムゾーンも制御できません。"
        );
      }
    }
  },
});
