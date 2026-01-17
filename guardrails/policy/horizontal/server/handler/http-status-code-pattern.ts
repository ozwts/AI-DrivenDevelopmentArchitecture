/**
 * @what HTTPステータスコードの適切な使用チェック
 * @why 一貫したHTTPステータスコードの使用によりAPIの予測可能性を高めるため
 * @failure 不適切なHTTPステータスコードを使用している場合にエラー
 *
 * @concept HTTPステータスコードの使用規則
 *
 * **操作別ステータスコード:**
 *
 * | 操作          | 成功時         | 主なエラー                    |
 * | ------------- | -------------- | ----------------------------- |
 * | POST（作成）  | 201 Created    | 400, 409, 422                 |
 * | GET（取得）   | 200 OK         | 404                           |
 * | GET（リスト） | 200 OK         | -                             |
 * | PATCH（更新） | 200 OK         | 400, 403, 404, 422            |
 * | DELETE        | 204 No Content | 404                           |
 *
 * **エラー型とステータスコードのマッピング:**
 *
 * | エラー型          | HTTPステータス            |
 * | ----------------- | ------------------------- |
 * | ValidationError   | 400 Bad Request           |
 * | DomainError       | 422 Unprocessable Entity  |
 * | ForbiddenError    | 403 Forbidden             |
 * | NotFoundError     | 404 Not Found             |
 * | ConflictError     | 409 Conflict              |
 * | UnexpectedError   | 500 Internal Server Error |
 *
 * @example-good
 * ```typescript
 * // POST: 201 Created
 * return c.json(responseData, 201);
 *
 * // GET: 200 OK
 * return c.json(responseData, 200);
 *
 * // DELETE: 204 No Content
 * return c.body(null, 204);
 *
 * // エラー: 適切なステータスコード
 * return c.json({ name: "ValidationError", ... }, 400);
 * return c.json({ name: "NotFoundError", ... }, 404);
 * return c.json({ name: "DomainError", ... }, 422);
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ POST で 200 を返す
 * return c.json(responseData, 200);  // 201 が正しい
 *
 * // ❌ DELETE で 200 を返す
 * return c.json({ success: true }, 200);  // 204 が正しい
 *
 * // ❌ バリデーションエラーで 500 を返す
 * return c.json({ error: "Invalid input" }, 500);  // 400 が正しい
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

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

      // ハンドラータイプを判定
      const isCreateHandler = /^build(Create|Register)/.test(varName);
      const isDeleteHandler = /^buildDelete/.test(varName);

      // 初期化子を取得
      const {initializer} = declaration;
      if (initializer === undefined) continue;

      // 関数全体のテキストを取得
      const functionText = initializer.getText();

      // 1. Create/Register ハンドラーで 200 を返していないかチェック
      if (isCreateHandler) {
        // 成功時のレスポンスをチェック
        const hasWrongStatus = /return\s+c\.json\s*\([^,]+,\s*200\s*\)/.test(functionText);
        const hasCorrectStatus = /return\s+c\.json\s*\([^,]+,\s*201\s*\)/.test(functionText);

        if (hasWrongStatus && !hasCorrectStatus) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" で POST 成功時に 200 を返しています。\n` +
              "■ リソース作成成功時は 201 Created を返してください。"
          );
        }
      }

      // 2. Delete ハンドラーで 200 を返していないかチェック
      if (isDeleteHandler) {
        const hasJsonReturn = /return\s+c\.json\s*\([^,]+,\s*200\s*\)/.test(functionText);
        const hasCorrectStatus = /c\.body\s*\(\s*null\s*,\s*204\s*\)/.test(functionText);

        if (hasJsonReturn && !hasCorrectStatus) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" で DELETE 成功時に 200 を返しています。\n` +
              "■ 削除成功時は 204 No Content を返してください。\n" +
              "■ c.body(null, 204) を使用してください。"
          );
        }
      }

      // 3. エラーで 500 を返していないかチェック（ValidationError等）
      const hasValidationWith500 = /ValidationError[^}]*500/.test(functionText);
      if (hasValidationWith500) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" で ValidationError に 500 を返しています。\n` +
            "■ ValidationError は 400 Bad Request を返してください。"
        );
      }
    }
  },
});
