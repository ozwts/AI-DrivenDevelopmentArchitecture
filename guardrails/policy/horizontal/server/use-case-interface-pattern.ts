/**
 * @what UseCaseインターフェース定義パターンチェック
 * @why 全UseCaseで統一されたインターフェース構造を保証するため
 * @failure UseCase基底インターフェースを使用していない場合にエラー
 *
 * @concept UseCaseインターフェースパターン
 *
 * 各UseCaseのインターフェースは必ず`UseCase<TInput, TOutput, TException>`型を使用して定義する。
 *
 * **必須要件:**
 * ```typescript
 * import type { UseCase } from "@/application/use-case/interfaces";
 *
 * export type CreateProjectUseCase = UseCase<
 *   CreateProjectUseCaseInput,
 *   CreateProjectUseCaseOutput,
 *   CreateProjectUseCaseException
 * >;
 * ```
 *
 * **理由:**
 * - **統一性**: 全UseCaseが同じ構造を持つことを保証
 * - **型安全性**: 基底インターフェースにより戻り値の型が統一される
 * - **保守性**: インターフェース変更時に一箇所で対応可能
 *
 * @example-good
 * ```typescript
 * import type { UseCase } from "@/application/use-case/interfaces";
 *
 * export type CreateProjectUseCase = UseCase<
 *   CreateProjectUseCaseInput,
 *   CreateProjectUseCaseOutput,
 *   DomainError | UnexpectedError
 * >;
 *
 * // 実装クラスは必ずインターフェースをimplementsする
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   async execute(input: CreateProjectUseCaseInput): Promise<Result<...>> {
 *     // ...
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ UseCase型を使用せず独自に定義
 * export type CreateProjectUseCase = {
 *   execute(input: CreateProjectUseCaseInput): Promise<CreateProjectUseCaseResult>;
 * };
 *
 * // ❌ implementsなし
 * export class CreateProjectUseCaseImpl {
 *   async execute(input: CreateProjectUseCaseInput): Promise<...> {
 *     // ...
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // 1. UseCase型エイリアスのチェック
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;
      if (!typeName.endsWith("UseCase")) return;
      if (typeName.includes("Input") || typeName.includes("Output") || typeName.includes("Exception") || typeName.includes("Result") || typeName.includes("Props")) return;

      // UseCase<...>パターンかチェック
      if (ts.isTypeReferenceNode(node.type)) {
        const typeRef = node.type;
        if (ts.isIdentifier(typeRef.typeName)) {
          if (typeRef.typeName.text !== "UseCase") {
            ctx.report(
              node,
              `UseCaseインターフェース "${typeName}" は UseCase<TInput, TOutput, TException> 型を使用してください。\n` +
                "■ import type { UseCase } from \"@/application/use-case/interfaces\";\n" +
                "■ export type CreateProjectUseCase = UseCase<Input, Output, Exception>;"
            );
          }
        } else {
          ctx.report(
            node,
            `UseCaseインターフェース "${typeName}" は UseCase<TInput, TOutput, TException> 型を使用してください。\n` +
              "■ import type { UseCase } from \"@/application/use-case/interfaces\";\n" +
              "■ export type CreateProjectUseCase = UseCase<Input, Output, Exception>;"
          );
        }
      } else {
        ctx.report(
          node,
          `UseCaseインターフェース "${typeName}" は UseCase<TInput, TOutput, TException> 型を使用してください。\n` +
            "■ import type { UseCase } from \"@/application/use-case/interfaces\";\n" +
            "■ export type CreateProjectUseCase = UseCase<Input, Output, Exception>;"
        );
      }
    }

    // 2. 実装クラスのimplementsチェック
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text;
      if (className === undefined || !className.endsWith("UseCaseImpl")) return;

      // implementsがあるかチェック
      const hasImplements = node.heritageClauses?.some(
        (clause) => clause.token === ts.SyntaxKind.ImplementsKeyword
      );

      if (hasImplements !== true) {
        ctx.report(
          node,
          `UseCaseImpl クラス "${className}" は対応するインターフェースをimplementsしてください。\n` +
            "■ export class CreateProjectUseCaseImpl implements CreateProjectUseCase { ... }"
        );
      }
    }
  },
});
