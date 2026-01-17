/**
 * @what UseCase層でthrow文が使用されていないことを検証
 * @why UseCase層では例外を投げず、Result型でエラーを表現するため
 * @failure throw文を検出した場合にエラー
 *
 * @concept throw禁止
 *
 * UseCase層では`throw`文を使用せず、`Result.err()`でエラーを返す。
 *
 * **理由:**
 * - **明示的なエラーハンドリング**: throwは呼び出し元に予期しないエラーを強制する
 * - **型安全性**: Result型により、成功/失敗の両方のケースを型で表現
 * - **一貫性**: 全てのUseCaseが同じエラーハンドリングパターンを使用
 *
 * @example-good
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // ✅ Result.err()でエラーを返す
 *     if (nameResult.isErr()) {
 *       return Result.err(nameResult.error);
 *     }
 *
 *     return Result.ok(project);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput) {
 *     // ❌ throw文を使用
 *     if (!input.name) {
 *       throw new Error("Name is required");  // ❌
 *     }
 *
 *     return project;
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // throw文を検出
    if (!ts.isThrowStatement(node)) return;

    // テストファイル、ダミーファイル、sharedディレクトリは除外
    const { fileName } = ctx.sourceFile;
    if (
      fileName.includes(".test.") ||
      fileName.includes(".dummy.") ||
      fileName.includes("/shared/")
    ) {
      return;
    }

    // interfaces.tsは除外
    if (fileName.endsWith("interfaces.ts")) {
      return;
    }

    ctx.report(
      node,
      "UseCase層ではthrow文ではなく、Result.err()でエラーを返してください。\n" +
        "■ ❌ Bad: throw new Error(\"エラーメッセージ\");\n" +
        "■ ✅ Good: return Result.err(new DomainError(\"エラーメッセージ\"));\n" +
        "■ 理由: Result型により、エラーハンドリングが型安全かつ明示的になります。"
    );
  },
});
