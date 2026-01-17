/**
 * @what ハンドラーでの出力バリデーション必須チェック
 * @why OpenAPI仕様との不一致を検出し、開発時のバグを早期発見するため
 * @failure ハンドラー内でレスポンスのZodバリデーションを実施していない場合にエラー
 *
 * @concept ハンドラーでの出力バリデーション
 *
 * すべてのハンドラーは**Zodスキーマによる出力バリデーション**を実施する必要がある。
 *
 * **目的:**
 * - OpenAPI仕様との不一致を検出
 * - 開発時のバグ検出
 * - 型安全なレスポンスを保証
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const result = await useCase.execute(data);
 *
 *     const responseData = convertToProjectResponse(result.data);
 *
 *     // 出力バリデーション
 *     const responseParseResult = schemas.ProjectResponse.safeParse(responseData);
 *     if (!responseParseResult.success) {
 *       logger.error("レスポンスバリデーションエラー", {
 *         errors: responseParseResult.error.errors,
 *       });
 *       return c.json({ name: "UnexpectedError", ... }, 500);
 *     }
 *
 *     return c.json(responseParseResult.data, 200);
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const result = await useCase.execute(data);
 *
 *     // ❌ 出力バリデーションなし
 *     return c.json(result.data, 200);
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    // エクスポートされた変数宣言をチェック
    if (!ts.isVariableStatement(node)) return;

    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (hasExport !== true) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Handlerで終わる名前のみチェック
      if (!varName.endsWith("Handler")) continue;

      // 初期化子を取得
      const {initializer} = declaration;
      if (initializer === undefined) continue;

      // 関数全体のテキストを取得
      const functionText = initializer.getText();

      // DELETEハンドラーはレスポンスボディがない（204）
      const isDeleteHandler = /^buildDelete/.test(varName);
      if (isDeleteHandler) continue;

      // safeParse呼び出しが2回あるかチェック（入力 + 出力）
      const safeParseMatches = functionText.match(/\.safeParse\s*\(/g);
      const safeParseCount = safeParseMatches !== null ? safeParseMatches.length : 0;

      // c.json() の呼び出しをカウント（成功時のレスポンス）
      const hasSuccessResponse = /return\s+c\.json\s*\(/.test(functionText);

      // 成功レスポンスがあるのに出力バリデーションがない場合
      if (hasSuccessResponse && safeParseCount < 2) {
        // レスポンスバリデーションのパターンをチェック
        const hasResponseValidation =
          /Response\.safeParse/.test(functionText) ||
          /responseParseResult/.test(functionText) ||
          /ResponseSchema\.safeParse/.test(functionText);

        if (!hasResponseValidation) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" で出力バリデーションが見つかりません。\n` +
              "■ レスポンスデータは .safeParse() で検証してください。\n" +
              "■ OpenAPI仕様との不一致を早期検出できます。"
          );
        }
      }
    }
  },
});
