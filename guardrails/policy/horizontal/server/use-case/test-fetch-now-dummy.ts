/**
 * @what テストでbuildFetchNowDummyを使用することを強制
 * @why 時刻モックを統一的に実装し、fetchNow実装変更時の修正を1箇所に集約するため
 * @failure テストファイルでfetchNowをインラインで作成している場合にエラー
 *
 * @concept buildFetchNowDummy使用の強制
 *
 * **理由**:
 * - buildFetchNowDummyを使わないと、fetchNowの実装が変わった時にすべてのテストを修正する必要がある
 * - テストで統一的なパターンを使うことで、保守性を高める
 *
 * @example-good
 * ```typescript
 * import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
 *
 * const fixedDate = new Date("2024-01-01T00:00:00+09:00");
 * const fetchNow = buildFetchNowDummy(fixedDate);
 *
 * const useCase = new CreateProjectUseCaseImpl({
 *   projectRepository: dummyRepository,
 *   fetchNow,  // ✅
 * });
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: インラインでfetchNowを作成
 * const useCase = new CreateProjectUseCaseImpl({
 *   projectRepository: dummyRepository,
 *   fetchNow: () => new Date("2024-01-01"),  // ❌
 * });
 *
 * // ❌ Bad: 直接関数を定義
 * const fetchNow = () => new Date("2024-01-01T00:00:00.000Z");  // ❌
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

/**
 * fetchNow関数がインラインで定義されているかチェック
 */
const isInlineFetchNowDefinition = (node: ts.Node): boolean => {
  // ArrowFunction または FunctionExpression
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    // bodyがnew Date(...)かチェック
    const { body } = node;
    if (body === undefined) return false;

    // () => new Date(...) パターン
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ts.isNewExpression(body)) {
      if (
        ts.isIdentifier(body.expression) &&
        body.expression.text === "Date"
      ) {
        return true;
      }
    }

    // () => { return new Date(...); } パターン
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (ts.isBlock(body)) {
      const { statements } = body;
      if (statements.length === 1 && ts.isReturnStatement(statements[0])) {
        const returnExpr = statements[0].expression;
        if (
          returnExpr !== undefined &&
          ts.isNewExpression(returnExpr) &&
          ts.isIdentifier(returnExpr.expression) &&
          returnExpr.expression.text === "Date"
        ) {
          return true;
        }
      }
    }
  }

  return false;
};

export const policyCheck = createASTChecker({
  // テストファイルのみをチェック
  filePattern: /\.test\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // application/use-case 配下のテストファイルのみ対象
    if (!fileName.includes("/application/use-case/")) return;

    // PropertyAssignment: fetchNow: () => ...
    if (ts.isPropertyAssignment(node)) {
      if (
        ts.isIdentifier(node.name) &&
        node.name.text === "fetchNow" &&
        isInlineFetchNowDefinition(node.initializer)
      ) {
        ctx.report(
          node,
          "テストでfetchNowをインラインで定義しています。\n" +
            "■ ❌ Bad: fetchNow: () => new Date(\"2024-01-01\")\n" +
            "■ ✅ Good: fetchNow: buildFetchNowDummy(new Date(\"2024-01-01\"))\n" +
            "■ 理由: buildFetchNowDummyを使うことで、fetchNow実装変更時の修正を1箇所に集約できます。\n" +
            "■ import { buildFetchNowDummy } from \"@/application/port/fetch-now/dummy\";"
        );
      }
    }

    // VariableDeclaration: const fetchNow = () => ...
    if (ts.isVariableDeclaration(node)) {
      if (
        ts.isIdentifier(node.name) &&
        node.name.text === "fetchNow" &&
        node.initializer !== undefined &&
        isInlineFetchNowDefinition(node.initializer)
      ) {
        ctx.report(
          node,
          "テストでfetchNowをインラインで定義しています。\n" +
            "■ ❌ Bad: const fetchNow = () => new Date(\"2024-01-01\")\n" +
            "■ ✅ Good: const fetchNow = buildFetchNowDummy(new Date(\"2024-01-01\"))\n" +
            "■ 理由: buildFetchNowDummyを使うことで、fetchNow実装変更時の修正を1箇所に集約できます。\n" +
            "■ import { buildFetchNowDummy } from \"@/application/port/fetch-now/dummy\";"
        );
      }
    }
  },
});
