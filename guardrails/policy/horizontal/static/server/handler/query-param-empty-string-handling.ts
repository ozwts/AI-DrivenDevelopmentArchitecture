/**
 * @what クエリパラメータの空文字列ハンドリングチェック
 * @why 空文字列をundefinedに正規化し、バリデーションとビジネスロジックの一貫性を保つため
 * @failure クエリパラメータを取得後に空文字列チェックなしで使用している場合にエラー
 *
 * @concept クエリパラメータの空文字列ハンドリング
 *
 * クエリパラメータは**空文字列をundefinedに正規化**してから使用する。
 *
 * **背景:**
 * - `?status=` のように値が空の場合、Honoは空文字列 `""` を返す
 * - 空文字列はZodバリデーションで失敗する可能性がある
 * - ビジネスロジックでは「未指定」として扱うべき
 *
 * **パターン:**
 *
 * ```typescript
 * const statusParam = c.req.query("status");
 *
 * // 空文字列チェックと個別バリデーション
 * if (statusParam !== undefined && statusParam !== "") {
 *   const parseResult = schemas.TodoStatus.safeParse(statusParam);
 *   if (!parseResult.success) {
 *     return c.json({ name: "ValidationError", ... }, 400);
 *   }
 * }
 *
 * // undefinedに正規化
 * const status =
 *   statusParam !== undefined && statusParam !== ""
 *     ? (statusParam as TodoStatus)
 *     : undefined;
 * ```
 *
 * @example-good
 * ```typescript
 * const statusParam = c.req.query("status");
 *
 * // 空文字列チェック
 * if (statusParam !== undefined && statusParam !== "") {
 *   // バリデーション
 * }
 *
 * // undefinedに正規化
 * const status = statusParam !== "" ? statusParam : undefined;
 * ```
 *
 * @example-bad
 * ```typescript
 * const status = c.req.query("status");
 *
 * // ❌ 空文字列チェックなしで直接使用
 * const result = await useCase.execute({ status });
 *
 * // ❌ 空文字列チェックなしでバリデーション
 * const parseResult = schemas.TodoStatus.safeParse(status);
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    // エクスポートされた変数宣言をチェック
    if (!ts.isVariableStatement(node)) return;

    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Handlerで終わる名前のみチェック
      if (!varName.endsWith('Handler')) continue;

      // 初期化子を取得
      const initializer = declaration.initializer;
      if (!initializer) continue;

      // 関数全体のテキストを取得
      const functionText = initializer.getText();

      // c.req.query() を使用しているかチェック
      const queryUsageMatch = functionText.match(/c\.req\.query\s*\(\s*["'](\w+)["']\s*\)/g);
      if (!queryUsageMatch) continue;

      // 各クエリパラメータについてチェック
      for (const usage of queryUsageMatch) {
        const paramNameMatch = usage.match(/["'](\w+)["']/);
        if (!paramNameMatch) continue;

        const paramName = paramNameMatch[1];

        // 空文字列チェックパターンがあるか確認
        const hasEmptyStringCheck =
          // statusParam !== "" パターン
          new RegExp(`${paramName}\\w*\\s*!==\\s*["']\\s*["']`).test(functionText) ||
          // statusParam === "" パターン（if文で除外）
          new RegExp(`${paramName}\\w*\\s*===\\s*["']\\s*["']`).test(functionText) ||
          // .trim() パターン
          new RegExp(`${paramName}\\w*\\.trim\\s*\\(\\)`).test(functionText);

        // 空文字列チェックがない場合に警告
        if (!hasEmptyStringCheck) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" でクエリパラメータ "${paramName}" の空文字列チェックが見つかりません。\n` +
              `■ c.req.query() は空文字列を返す可能性があります。\n` +
              `■ パターン: if (param !== undefined && param !== "") { ... }\n` +
              `■ 正規化: const value = param !== "" ? param : undefined;`
          );
        }
      }
    }
  },
});
