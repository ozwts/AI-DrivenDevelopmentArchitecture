/**
 * @what ハンドラーでのビジネスロジック禁止チェック
 * @why ハンドラーを薄いアダプターに保ち、ビジネスロジックをUseCase/Domain層に委譲するため
 * @failure ハンドラー内でビジネスロジックを実装している兆候がある場合にエラー
 *
 * @concept ハンドラーでのビジネスロジック禁止
 *
 * ハンドラーは**薄いアダプター**であり、以下を実施しない:
 *
 * | 禁止事項 | 委譲先 |
 * |----------|--------|
 * | ビジネスロジック | UseCase層 |
 * | ドメインルール | Domain層（Value Object/Entity） |
 * | データベースアクセス | Repository層 |
 * | 複雑な計算 | UseCase層またはDomain層 |
 * | 状態管理 | Entity層 |
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     // ハンドラーの責務: 入力取得 → バリデーション → UseCase呼び出し → レスポンス変換
 *     const rawBody: unknown = await c.req.json();
 *     const parseResult = schemas.CreateProjectParams.safeParse(rawBody);
 *     if (!parseResult.success) {
 *       return c.json({ name: "ValidationError", ... }, 400);
 *     }
 *
 *     const result = await useCase.execute(parseResult.data);
 *     if (!result.isOk()) {
 *       return handleError(result.error, c, logger);
 *     }
 *
 *     return c.json(convertToProjectResponse(result.data), 201);
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const rawBody = await c.req.json();
 *
 *     // ❌ ビジネスロジックをハンドラーで実装
 *     if (rawBody.color === "#000000") {
 *       return c.json({ name: "ValidationError", message: "黒は使用できません" }, 400);
 *     }
 *
 *     // ❌ 複雑な計算
 *     const priority = calculatePriority(rawBody.dueDate, rawBody.importance);
 *
 *     // ❌ new Date() で日時生成
 *     const createdAt = new Date().toISOString();
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

// ビジネスロジックの兆候パターン
const BUSINESS_LOGIC_PATTERNS = [
  { pattern: /new\s+Date\s*\(\)/, message: "new Date() の呼び出し。日時はUseCase層で生成してください。" },
  { pattern: /Date\.now\s*\(\)/, message: "Date.now() の呼び出し。日時はUseCase層で生成してください。" },
  { pattern: /Math\.(floor|ceil|round|random)/, message: "Math関数の呼び出し。計算はUseCase層で実施してください。" },
  { pattern: /\.filter\s*\([^)]*=>/, message: "filterによるデータ操作。ビジネスロジックはUseCase層で実施してください。" },
  { pattern: /\.reduce\s*\([^)]*=>/, message: "reduceによる集計処理。ビジネスロジックはUseCase層で実施してください。" },
  { pattern: /\.sort\s*\([^)]*=>/, message: "sortによる並び替え。ビジネスロジックはUseCase層で実施してください。" },
];

// 許可されるパターン（誤検知防止）
const ALLOWED_PATTERNS = [
  /convertTo\w+Response.*\.filter/, // レスポンス変換でのフィルタリングは許可
  /formatZodError/,                 // Zodエラーフォーマットは許可
];

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

      // 許可されたパターンを含む場合はスキップ
      const isAllowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(functionText));

      // ビジネスロジックパターンをチェック
      for (const { pattern, message } of BUSINESS_LOGIC_PATTERNS) {
        if (pattern.test(functionText)) {
          // 許可されたパターンと重複する場合はスキップ
          if (isAllowed) continue;

          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" でビジネスロジックの兆候が検出されました。\n` +
              `■ ${message}\n` +
              "■ ハンドラーは薄いアダプターに保ち、ロジックはUseCase層に委譲してください。"
          );
        }
      }
    }
  },
});
