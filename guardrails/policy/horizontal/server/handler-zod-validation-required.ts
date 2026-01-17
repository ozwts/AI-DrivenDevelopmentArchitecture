/**
 * @what ハンドラーでのZodバリデーション必須チェック
 * @why OpenAPI定義に基づく型レベルバリデーションを確実に実施するため
 * @failure ハンドラー内でsafeParse/parseを呼び出していない場合にエラー
 *
 * @concept ハンドラーでのZodバリデーション
 *
 * すべてのハンドラーは**Zodスキーマによる入力バリデーション**を実施する必要がある。
 *
 * **バリデーション戦略（MECE原則）:**
 *
 * | 階層 | 責務 | エラー型 |
 * | --- | --- | --- |
 * | Handler層 | 型レベル制約（必須性、型、長さ、形式、enum） | ValidationError（400） |
 * | Domain層 | ドメインルール（ビジネス不変条件） | DomainError（422） |
 * | UseCase層 | ビジネスルール（DB参照を伴う検証） | NotFoundError（404）等 |
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const rawBody: unknown = await c.req.json();
 *
 *     // Zodスキーマによる入力バリデーション
 *     const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
 *     if (!parseResult.success) {
 *       return c.json({ name: "ValidationError", message: formatZodError(parseResult.error) }, 400);
 *     }
 *
 *     const body = parseResult.data; // 型安全なデータ
 *     // ...
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     // ❌ Zodバリデーションなし
 *     const body = await c.req.json();
 *
 *     // ❌ 直接UseCaseに渡す（型安全でない）
 *     const result = await useCase.execute(body);
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

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

      // safeParse または parse の呼び出しがあるかチェック
      const hasSafeParse = /\.safeParse\s*\(/.test(functionText);
      const hasParse = /\.parse\s*\(/.test(functionText);
      const hasValidation = hasSafeParse || hasParse;

      // 入力取得パターンを検出
      const hasReqJson = /c\.req\.json\s*\(/.test(functionText);   // リクエストボディ
      const hasReqQuery = /c\.req\.query\s*\(/.test(functionText); // クエリパラメータ

      // リクエストボディを取得しているのにバリデーションがない場合
      if (hasReqJson && !hasValidation) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" で Zod バリデーションが見つかりません。\n` +
            "■ c.req.json() で取得したボディは .safeParse() で検証してください。\n" +
            "■ バリデーションエラー時は 400 Bad Request を返してください。"
        );
      }

      // クエリパラメータを取得しているのにバリデーションがない場合
      if (hasReqQuery && !hasValidation) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" でクエリパラメータの Zod バリデーションが見つかりません。\n` +
            "■ c.req.query() で取得したパラメータは .safeParse() で検証してください。"
        );
      }
    }
  },
});
