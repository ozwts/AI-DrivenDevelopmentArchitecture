/**
 * @what UseCase命名規則チェック
 * @why 一貫した命名規則によりコードの可読性と予測可能性を高めるため
 * @failure 命名規則に従っていない型・クラスがある場合にエラー
 *
 * @concept UseCase命名規則
 *
 * | 対象 | パターン | 例 |
 * |------|---------|-----|
 * | ファイル名 | `{action}-{entity}-use-case.ts` | `create-project-use-case.ts` |
 * | テストファイル | `{action}-{entity}-use-case.small.test.ts` | `create-project-use-case.small.test.ts` |
 * | 実装クラス | `{Action}{Entity}UseCaseImpl` | `CreateProjectUseCaseImpl` |
 * | インターフェース | `{Action}{Entity}UseCase` | `CreateProjectUseCase` |
 * | Input型 | `{Action}{Entity}UseCaseInput` | `CreateProjectUseCaseInput` |
 * | Output型 | `{Action}{Entity}UseCaseOutput` | `CreateProjectUseCaseOutput` |
 * | Exception型 | `{Action}{Entity}UseCaseException` | `CreateProjectUseCaseException` |
 * | Result型 | `{Action}{Entity}UseCaseResult` | `CreateProjectUseCaseResult` |
 * | Props型 | `{Action}{Entity}UseCaseProps` | `CreateProjectUseCaseProps` |
 *
 * @example-good
 * ```typescript
 * // create-project-use-case.ts
 * export type CreateProjectUseCaseInput = { ... };
 * export type CreateProjectUseCaseOutput = { ... };
 * export type CreateProjectUseCaseException = DomainError | UnexpectedError;
 * export type CreateProjectUseCaseResult = Result<...>;
 * export type CreateProjectUseCaseProps = { ... };
 * export type CreateProjectUseCase = UseCase<...>;
 * export class CreateProjectUseCaseImpl implements CreateProjectUseCase { ... }
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ サフィックスが不正
 * export type CreateProjectInput = { ... };  // UseCaseInputが正しい
 * export type CreateProjectOutput = { ... };  // UseCaseOutputが正しい
 *
 * // ❌ Implサフィックスがない
 * export class CreateProjectUseCase implements CreateProjectUseCase { ... }
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { createASTChecker } from "../../ast-checker";

// UseCase関連型のサフィックスパターン
const TYPE_SUFFIXES = {
  Input: "UseCaseInput",
  Output: "UseCaseOutput",
  Exception: "UseCaseException",
  Result: "UseCaseResult",
  Props: "UseCaseProps",
  Interface: "UseCase",
};

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;

    // テストファイルは除外
    if (filePath.includes(".test.")) return;

    // 1. 型エイリアスの命名チェック
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;

      // UseCase関連型のチェック
      if (typeName.includes("Input") && !typeName.endsWith(TYPE_SUFFIXES.Input)) {
        ctx.report(
          node,
          `Input型 "${typeName}" は {Action}{Entity}UseCaseInput 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseInput"
        );
      }

      if (typeName.includes("Output") && !typeName.endsWith(TYPE_SUFFIXES.Output)) {
        ctx.report(
          node,
          `Output型 "${typeName}" は {Action}{Entity}UseCaseOutput 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseOutput"
        );
      }

      if (typeName.includes("Exception") && !typeName.endsWith(TYPE_SUFFIXES.Exception)) {
        ctx.report(
          node,
          `Exception型 "${typeName}" は {Action}{Entity}UseCaseException 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseException"
        );
      }

      if (typeName.includes("Result") && !typeName.endsWith(TYPE_SUFFIXES.Result)) {
        ctx.report(
          node,
          `Result型 "${typeName}" は {Action}{Entity}UseCaseResult 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseResult"
        );
      }

      if (typeName.includes("Props") && !typeName.endsWith(TYPE_SUFFIXES.Props)) {
        ctx.report(
          node,
          `Props型 "${typeName}" は {Action}{Entity}UseCaseProps 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseProps"
        );
      }
    }

    // 2. クラス名の命名チェック
    if (ts.isClassDeclaration(node)) {
      const className = node.name?.text;
      if (className === undefined) return;

      // UseCaseImplで終わるかチェック
      if (className.includes("UseCase") && !className.endsWith("UseCaseImpl")) {
        ctx.report(
          node,
          `UseCaseクラス "${className}" は {Action}{Entity}UseCaseImpl 形式で命名してください。\n` +
            "■ 例: CreateProjectUseCaseImpl"
        );
      }
    }

    // 3. ファイル名との整合性チェック
    if (ts.isSourceFile(node)) {
      const fileName = path.basename(filePath, ".ts");
      const expectedPattern = /^[a-z]+-[a-z]+-use-case$/;

      if (!expectedPattern.test(fileName)) {
        ctx.report(
          node,
          `UseCaseファイル名 "${fileName}.ts" は {action}-{entity}-use-case.ts 形式で命名してください。\n` +
            "■ 例: create-project-use-case.ts"
        );
      }
    }
  },
});
