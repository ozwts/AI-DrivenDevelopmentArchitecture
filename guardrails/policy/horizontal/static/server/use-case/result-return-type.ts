/**
 * @what UseCaseのexecute()メソッドがResult型を返すことを検証
 * @why 明示的なエラーハンドリングを強制し、throwを使わない設計を保証するため
 * @failure execute()メソッドの戻り値がResult型でない場合にエラー
 *
 * @concept execute()メソッドのResult型戻り値
 *
 * UseCaseの`execute()`メソッドは必ず`Result<T, E>`型（または`Promise<Result<T, E>>`）を返す必要がある。
 *
 * **理由:**
 * - **型安全性**: 成功/失敗の両方のケースを型システムで表現
 * - **エラーハンドリングの強制**: Result型により、呼び出し元が必ずエラーチェックを行う
 * - **一貫性**: 全UseCaseが同じ戻り値パターンを使用
 *
 * @example-good
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   // ✅ Promise<Result<T, E>>を返す
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // ...
 *     return Result.ok(project);
 *   }
 * }
 *
 * // または型エイリアスを使用
 * export type CreateProjectUseCaseResult = Result<
 *   CreateProjectUseCaseOutput,
 *   CreateProjectUseCaseException
 * >;
 *
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult> {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   // ❌ Result型以外を返す
 *   async execute(input: CreateProjectUseCaseInput): Promise<Project> {  // ❌
 *     // ...
 *     return project;
 *   }
 * }
 *
 * export class GetProjectUseCaseImpl implements GetProjectUseCase {
 *   // ❌ 戻り値の型アノテーションがない
 *   async execute(input: GetProjectUseCaseInput) {  // ❌
 *     // ...
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

/**
 * 型がResultを含むかチェック（再帰的）
 *
 * 以下をResult型として認識:
 * - 直接の Result<T, E>
 * - *Result で終わる型エイリアス（命名規約: XxxUseCaseResult = Result<T, E>）
 * - Promise<Result<T, E>>
 */
const containsResultType = (typeNode: ts.TypeNode): boolean => {
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = ts.isIdentifier(typeNode.typeName) ? typeNode.typeName.text : "";

    // 直接Result型
    if (typeName === "Result") {
      return true;
    }

    // 命名規約: *Result で終わる型エイリアス
    if (typeName.endsWith("Result")) {
      return true;
    }

    // Promise<...> の場合は内部を再帰チェック
    if (typeName === "Promise" && typeNode.typeArguments !== undefined) {
      return typeNode.typeArguments.some(containsResultType);
    }
  }

  return false;
};

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // executeメソッドのみチェック
    if (!ts.isMethodDeclaration(node)) return;

    const methodName = node.name !== undefined && ts.isIdentifier(node.name) ? node.name.text : "";
    if (methodName !== "execute") return;

    // テストファイル、ダミーファイルは除外
    const { fileName } = ctx.sourceFile;
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // 戻り値の型アノテーションを取得
    const returnType = node.type;

    // 戻り値の型が指定されていない
    if (returnType === undefined) {
      ctx.report(
        node,
        "execute()メソッドに戻り値の型アノテーションがありません。\n" +
          "■ Promise<Result<T, E>> または XxxUseCaseResult 型を指定してください。\n" +
          "■ 例: async execute(input: Input): Promise<Result<Output, Error>> { ... }"
      );
      return;
    }

    // 型がResultを含むかチェック
    if (!containsResultType(returnType)) {
      const typeText = returnType.getText(ctx.sourceFile);
      ctx.report(
        node,
        `execute()メソッドの戻り値が Result 型ではありません: "${typeText}"\n` +
          "■ Promise<Result<T, E>> または *Result で終わる型エイリアスを使用してください。\n" +
          "■ 例: Promise<CreateProjectUseCaseResult>"
      );
    }
  },
});
