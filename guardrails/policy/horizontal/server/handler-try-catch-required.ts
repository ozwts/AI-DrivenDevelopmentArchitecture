/**
 * @what ハンドラー関数内でのtry-catch必須チェック
 * @why 予期しない例外をキャッチし、適切なエラーレスポンスを返すため
 * @failure ハンドラー関数内にtry-catchがない場合にエラー
 *
 * @concept ハンドラーでのtry-catch必須
 *
 * すべてのハンドラー関数は `try-catch` で囲む必要がある。
 * これにより、予期しない例外が発生した場合でも適切な500エラーレスポンスを返せる。
 *
 * **理由:**
 * - 予期しない例外をキャッチし、500エラーを返す
 * - エラー情報をログに記録する
 * - Lambda関数がクラッシュすることを防ぐ
 *
 * @example-good
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const logger = container.get<Logger>(serviceId.LOGGER);
 *
 *     try {
 *       // ハンドラーロジック
 *       const result = await useCase.execute(data);
 *       return c.json(result.data, 200);
 *     } catch (error) {
 *       logger.error("ハンドラーで予期せぬエラーをキャッチ", error as Error);
 *       return c.json({ name: "UnexpectedError", message: "..." }, 500);
 *     }
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildCreateProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     // ❌ try-catchがない
 *     const result = await useCase.execute(data);
 *     return c.json(result.data, 200);
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

/**
 * アロー関数チェーンから内側のasync関数を探す
 */
const findInnerAsyncFunction = (node: ts.Node): ts.ArrowFunction | undefined => {
  if (ts.isArrowFunction(node)) {
    const {body} = node;

    // ボディがさらにアロー関数の場合、再帰的に探す
    if (ts.isArrowFunction(body)) {
      return findInnerAsyncFunction(body);
    }

    // asyncキーワードがある場合はこの関数を返す
    const isAsync = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.AsyncKeyword
    );
    if (isAsync === true) {
      return node;
    }

    // ボディがブロックの場合、この関数を返す
    if (ts.isBlock(body)) {
      return node;
    }
  }

  return undefined;
};

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

      // 初期化子を取得（アロー関数チェーン）
      const {initializer} = declaration;
      if (initializer === undefined) continue;

      // 内側の関数を探す（buildXxxHandler = ({ container }) => async (c) => { ... }）
      const innerFunction = findInnerAsyncFunction(initializer);
      if (innerFunction === undefined) continue;

      // 関数ボディをチェック
      const {body} = innerFunction;
      if (body === undefined || !ts.isBlock(body)) continue;

      // try-catchがあるかチェック
      const hasTryCatch = body.statements.some((stmt) => ts.isTryStatement(stmt));

      if (!hasTryCatch) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" に try-catch がありません。\n` +
            "■ 予期しない例外をキャッチするため、try-catch で囲んでください。\n" +
            "■ catch節で logger.error() を呼び出し、500エラーを返してください。"
        );
      }
    }
  },
});
