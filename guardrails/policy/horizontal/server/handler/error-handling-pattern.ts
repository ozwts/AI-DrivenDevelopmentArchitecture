/**
 * @what ハンドラーでのエラーハンドリングパターンチェック
 * @why UseCase/Domain層から返されたエラーを適切なHTTPステータスコードに変換するため
 * @failure handleError関数を使用していない、またはResult型チェックがない場合にエラー
 *
 * @concept エラーハンドリングパターン
 *
 * ハンドラーは**Result型チェック**と**handleError関数**でエラーを処理する。
 *
 * **エラー型とHTTPステータスコードのマッピング:**
 *
 * | エラー型          | HTTPステータス            | 発生場所         |
 * | ----------------- | ------------------------- | ---------------- |
 * | ValidationError   | 400 Bad Request           | Handler層        |
 * | DomainError       | 422 Unprocessable Entity  | Domain層         |
 * | ForbiddenError    | 403 Forbidden             | UseCase層        |
 * | NotFoundError     | 404 Not Found             | UseCase層        |
 * | ConflictError     | 409 Conflict              | UseCase層        |
 * | UnexpectedError   | 500 Internal Server Error | 全層             |
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const result = await useCase.execute(data);
 *
 *     // Result型チェック
 *     if (!result.isOk()) {
 *       return handleError(result.error, c, logger);
 *     }
 *
 *     // undefinedチェック（オプショナルな戻り値）
 *     if (result.data === undefined) {
 *       return c.json({ name: "NotFoundError", message: "..." }, 404);
 *     }
 *
 *     return c.json(result.data, 200);
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
 *     // ❌ Result型チェックなし
 *     return c.json(result.data, 200);
 *
 *     // ❌ handleError関数を使用していない
 *     if (!result.isOk()) {
 *       return c.json({ error: result.error.message }, 500);
 *     }
 *   };
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

      // 初期化子を取得
      const {initializer} = declaration;
      if (initializer === undefined) continue;

      // 関数全体のテキストを取得
      const functionText = initializer.getText();

      // UseCase.execute() を呼び出しているかチェック
      const hasUseCaseExecute = /\.execute\s*\(/.test(functionText);
      if (!hasUseCaseExecute) continue;

      // Result型チェック（.isOk() または .isErr()）があるかチェック
      const hasResultCheck = /\.isOk\s*\(\)/.test(functionText) || /\.isErr\s*\(\)/.test(functionText);

      if (!hasResultCheck) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" で Result 型チェックが見つかりません。\n` +
            "■ UseCase.execute() の結果は .isOk() または .isErr() でチェックしてください。\n" +
            "■ エラー時は handleError() 関数を使用してHTTPステータスに変換してください。"
        );
      }

      // handleError関数を使用しているかチェック
      const hasHandleError = /handleError\s*\(/.test(functionText);

      if (hasResultCheck && !hasHandleError) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" で handleError 関数が使用されていません。\n` +
            "■ Result型のエラーは handleError() で適切なHTTPステータスに変換してください。\n" +
            "■ 独自のエラーハンドリングは handleError() に集約してください。"
        );
      }
    }
  },
});
