/**
 * @what DIコンテナで型（インターフェース）とImpl（実装）のimportが対になっているか検証
 * @why Composition Rootは型に依存し、実装をインスタンス化する唯一の場所であるため
 * @failure 型のみimport、Implのみimport、型を`import type`で書いていない場合に警告
 *
 * @concept Composition Rootのimportパターン
 *
 * DIコンテナ登録ファイルでは、型（インターフェース）と実装（Impl）を対でimportする。
 *
 * **ルール:**
 * - 型は `import type { X }` で書く
 * - 実装は `import { XImpl }` で書く
 * - 両者は必ず対で存在する
 *
 * @example-good
 * ```typescript
 * // ✅ Good: 型とImplを分けてimport
 * import type { CreateProjectUseCase } from "@/application/use-case/project/create-project-use-case";
 * import { CreateProjectUseCaseImpl } from "@/application/use-case/project/create-project-use-case";
 *
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }));
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: 型のみimport（Implがない）
 * import { CreateProjectUseCase } from "@/application/use-case/project/create-project-use-case";
 *
 * container
 *   .bind<CreateProjectUseCase>(serviceId.CREATE_PROJECT_USE_CASE)
 *   .toDynamicValue((ctx) => new CreateProjectUseCase({ ... })); // 型をnewしようとしてエラー
 *
 * // ❌ Bad: Implのみimport（型がない）
 * import { CreateProjectUseCaseImpl } from "@/application/use-case/project/create-project-use-case";
 *
 * container
 *   .bind(serviceId.CREATE_PROJECT_USE_CASE) // 型引数がない
 *   .toDynamicValue((ctx) => new CreateProjectUseCaseImpl({ ... }));
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// UseCaseとRepositoryのパターン
const TYPE_IMPL_PATTERNS = [
  { type: /^(\w+)UseCase$/, impl: /^(\w+)UseCaseImpl$/ },
  { type: /^(\w+)Repository$/, impl: /^(\w+)RepositoryImpl$/ },
];

/**
 * 名前がImplクラスかどうか判定
 */
const isImplClass = (name: string): boolean =>
  name.endsWith("Impl") || name.endsWith("UseCaseImpl") || name.endsWith("RepositoryImpl");

/**
 * 名前が型（インターフェース相当）かどうか判定
 */
const isInterfaceType = (name: string): boolean => {
  for (const pattern of TYPE_IMPL_PATTERNS) {
    if (pattern.type.test(name)) {
      return true;
    }
  }
  return false;
};

/**
 * 対応するImplクラス名を取得
 */
const getImplName = (typeName: string): string => `${typeName}Impl`;

export const policyCheck = createASTChecker({
  filePattern: /register-.*-container\.ts$|di-container\/.*\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // service-id.tsは除外
    if (fileName.endsWith("service-id.ts")) {
      return;
    }

    // ImportDeclarationをチェック
    if (ts.isImportDeclaration(node)) {
      const importClause = node.importClause;
      if (importClause === undefined) return;

      const namedBindings = importClause.namedBindings;
      if (namedBindings === undefined || !ts.isNamedImports(namedBindings)) return;

      const isTypeOnlyImport = importClause.isTypeOnly;

      for (const specifier of namedBindings.elements) {
        const importedName = specifier.name.text;

        // Implをimportしているが、import typeで書いている場合
        if (isImplClass(importedName) && isTypeOnlyImport) {
          ctx.report(
            specifier,
            `Implクラス（${importedName}）を import type でimportしています。\n` +
              "■ ❌ Bad: import type { CreateProjectUseCaseImpl } from ...\n" +
              "■ ✅ Good: import { CreateProjectUseCaseImpl } from ...\n" +
              "■ 理由: Implクラスはインスタンス化するため、import type ではなく import で書く必要があります。"
          );
        }

        // 型（インターフェース）をimportしているが、import typeで書いていない場合
        // specifier.isTypeOnlyはnamed import内の個別のtype指定（import { type X } from ...）
        const isSpecifierTypeOnly = (specifier as { isTypeOnly?: boolean }).isTypeOnly === true;
        if (isInterfaceType(importedName) && !isTypeOnlyImport && !isSpecifierTypeOnly) {
          ctx.report(
            specifier,
            `型（${importedName}）を import type で書いていません。\n` +
              `■ ❌ Bad: import { ${importedName} } from ...\n` +
              `■ ✅ Good: import type { ${importedName} } from ...\n` +
              "■ 理由: 型は import type で書くことで、ランタイムに影響しないことを明示します。"
          );
        }
      }
    }

    // NewExpressionをチェック - 型をnewしようとしていないか
    if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const className = node.expression.text;

        // 型（インターフェース）をnewしようとしている場合
        if (isInterfaceType(className) && !isImplClass(className)) {
          const expectedImpl = getImplName(className);
          ctx.report(
            node,
            `型（${className}）をnewしようとしています。\n` +
              `■ ❌ Bad: new ${className}({ ... })\n` +
              `■ ✅ Good: new ${expectedImpl}({ ... })\n` +
              "■ 理由: 型はインスタンス化できません。Implクラスをimportしてnewしてください。"
          );
        }
      }
    }
  },
});
