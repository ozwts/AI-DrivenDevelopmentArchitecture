/**
 * @what Small TestでbeforeEachを使用しないことを強制
 * @why テストケースごとに新しいインスタンスを生成し、テストの独立性を保つため
 * @failure Small TestでbeforeEachを使用している場合にエラー
 *
 * @concept beforeEach禁止（Small Testのみ）
 *
 * **理由**:
 * - beforeEachで共有インスタンスを作ると、テスト間で状態が共有されるリスクがある
 * - テストケースごとに明示的にインスタンスを生成することで、独立性を保つ
 * - テストが失敗した時に、原因の特定が容易になる
 *
 * **注**: Medium TestではbeforeAllでリソース初期化することは許容される（DB接続等）
 *
 * @example-good
 * ```typescript
 * describe("CreateProjectUseCase", () => {
 *   test("プロジェクトを作成できる", async () => {
 *     // ✅ テストケースごとに新しいインスタンス生成
 *     const useCase = new CreateProjectUseCaseImpl({
 *       projectRepository: new ProjectRepositoryDummy(),
 *       fetchNow: buildFetchNowDummy(new Date()),
 *     });
 *
 *     const result = await useCase.execute({ name: "test" });
 *     expect(result.success).toBe(true);
 *   });
 * });
 * ```
 *
 * @example-bad
 * ```typescript
 * describe("CreateProjectUseCase", () => {
 *   let useCase: CreateProjectUseCase;
 *
 *   // ❌ Bad: beforeEachで共有インスタンスを作成
 *   beforeEach(() => {
 *     useCase = new CreateProjectUseCaseImpl({
 *       projectRepository: new ProjectRepositoryDummy(),
 *       fetchNow: buildFetchNowDummy(new Date()),
 *     });
 *   });
 *
 *   test("プロジェクトを作成できる", async () => {
 *     const result = await useCase.execute({ name: "test" });
 *     expect(result.success).toBe(true);
 *   });
 * });
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  // Small Testファイルのみをチェック
  filePattern: /\.small\.test\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // application/use-case 配下のSmall Testのみ対象
    if (!fileName.includes("/application/use-case/")) return;

    // beforeEach呼び出しを検出
    if (!ts.isCallExpression(node)) return;

    if (
      ts.isIdentifier(node.expression) &&
      node.expression.text === "beforeEach"
    ) {
      ctx.report(
        node,
        "Small TestでbeforeEachを使用しています。\n" +
          "■ ❌ Bad: beforeEach(() => { useCase = new ...UseCaseImpl({ ... }); });\n" +
          "■ ✅ Good: 各testケース内で直接インスタンスを生成\n" +
          "  test(\"...\", async () => {\n" +
          "    const useCase = new ...UseCaseImpl({ ... });\n" +
          "    // ...\n" +
          "  });\n" +
          "■ 理由: テストケースごとに新しいインスタンスを生成することで、テストの独立性を保ちます。\n" +
          "■ 注: Medium TestではbeforeAllでDB接続等のリソース初期化は許容されます。"
      );
    }
  },
});
