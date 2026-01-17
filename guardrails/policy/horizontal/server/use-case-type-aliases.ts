/**
 * @what UseCaseに必要な型エイリアス（Input/Output/Exception/Props/Result）が定義されているか検証
 * @why UseCaseの型構造を標準化し、型安全性を保証するため
 * @failure 必須の型エイリアスが欠けている場合にエラー
 *
 * @concept UseCase型エイリアスの完全性
 *
 * 各UseCaseImplクラスに対して、以下の型エイリアスが必須:
 * - `{Action}{Entity}UseCaseInput`: executeメソッドの入力型
 * - `{Action}{Entity}UseCaseOutput`: 成功時の出力型
 * - `{Action}{Entity}UseCaseException`: 失敗時のエラー型
 * - `{Action}{Entity}UseCaseProps`: DI依存型
 * - `{Action}{Entity}UseCaseResult`: Result型エイリアス
 *
 * **理由:**
 * - **型の明示化**: 各UseCaseの入出力とエラー型が明確
 * - **保守性**: 型定義が一箇所に集約され、変更が容易
 * - **一貫性**: 全UseCaseが同じ型構造を持つ
 *
 * @example-good
 * ```typescript
 * // ✅ 全ての型エイリアスが定義されている
 * export type CreateProjectUseCaseInput = {
 *   name: string;
 *   description: string | undefined;
 *   color: string;
 * };
 *
 * export type CreateProjectUseCaseOutput = {
 *   project: Project;
 * };
 *
 * export type CreateProjectUseCaseException =
 *   | DomainError
 *   | UnexpectedError;
 *
 * export type CreateProjectUseCaseProps = {
 *   readonly projectRepository: ProjectRepository;
 *   readonly logger: Logger;
 *   readonly fetchNow: FetchNow;
 * };
 *
 * export type CreateProjectUseCaseResult = Result<
 *   CreateProjectUseCaseOutput,
 *   CreateProjectUseCaseException
 * >;
 *
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   // ...
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ 型エイリアスが不足している
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase {
 *   // Input/Output/Exception/Props/Result型が定義されていない
 *   async execute(input: any): Promise<any> {  // ❌
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
    // SourceFileレベルでチェック（全体を見る必要があるため）
    if (!ts.isSourceFile(node)) return;

    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // interfaces.tsは除外
    if (fileName.endsWith("interfaces.ts")) {
      return;
    }

    // 定義されている型エイリアスとクラスを収集
    const definedTypes = new Set<string>();
    const useCaseImplClasses: ts.ClassDeclaration[] = [];

    ts.forEachChild(node, (child) => {
      // 型エイリアスを収集
      if (ts.isTypeAliasDeclaration(child) && ts.isIdentifier(child.name)) {
        definedTypes.add(child.name.text);
      }

      // UseCaseImplクラスを収集
      if (ts.isClassDeclaration(child) && child.name !== undefined) {
        const className = child.name.text;
        if (className.endsWith("UseCaseImpl")) {
          useCaseImplClasses.push(child);
        }
      }
    });

    // 各UseCaseImplクラスに対して型エイリアスの存在をチェック
    for (const classDecl of useCaseImplClasses) {
      if (classDecl.name === undefined) continue;
      const className = classDecl.name.text;

      // CreateProjectUseCaseImpl -> CreateProject
      const baseName = className.replace(/UseCaseImpl$/, "UseCase");

      // 必須の型エイリアス
      const requiredTypes = [
        { suffix: "Input", description: "入力型" },
        { suffix: "Output", description: "出力型" },
        { suffix: "Exception", description: "エラー型" },
        { suffix: "Props", description: "依存型" },
        { suffix: "Result", description: "Result型エイリアス" },
      ];

      for (const { suffix, description } of requiredTypes) {
        const typeName = baseName + suffix;
        if (!definedTypes.has(typeName)) {
          ctx.report(
            classDecl,
            `UseCaseImpl "${className}" に対応する ${description} "${typeName}" が定義されていません。\n` +
              "■ 以下の型エイリアスを定義してください:\n" +
              `  - ${baseName}Input: executeメソッドの入力型\n` +
              `  - ${baseName}Output: 成功時の出力型\n` +
              `  - ${baseName}Exception: 失敗時のエラー型\n` +
              `  - ${baseName}Props: DI依存型\n` +
              `  - ${baseName}Result: Result<Output, Exception>`
          );
          break; // 一つでも欠けていたらまとめて報告
        }
      }
    }
  },
});
