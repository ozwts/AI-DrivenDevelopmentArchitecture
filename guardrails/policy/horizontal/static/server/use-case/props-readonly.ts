/**
 * @what Props型のreadonly修飾子チェック
 * @why 依存の不変性を保証し、意図しない状態変更を防ぐため
 * @failure Props型のプロパティにreadonlyが指定されていない場合にエラー
 *
 * @concept Props型のreadonly強制
 *
 * UseCaseのProps型は、すべてのプロパティを`readonly`にする必要がある。
 *
 * **理由:**
 * - **不変性保証**: DIコンテナから注入された依存が変更されないことを保証
 * - **予測可能性**: 実行時にProps型が変更されないことが明確
 * - **スレッドセーフティ**: 複数箇所から参照されても安全
 *
 * @example-good
 * ```typescript
 * export type CreateProjectUseCaseProps = {
 *   readonly projectRepository: ProjectRepository;
 *   readonly logger: Logger;
 *   readonly fetchNow: FetchNow;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ readonlyなし
 * export type CreateProjectUseCaseProps = {
 *   projectRepository: ProjectRepository;  // ❌
 *   logger: Logger;  // ❌
 *   fetchNow: FetchNow;  // ❌
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // Props型エイリアスをチェック
    if (!ts.isTypeAliasDeclaration(node)) return;

    const typeName = node.name.text;
    if (!typeName.endsWith("UseCaseProps")) return;

    // 型リテラルをチェック
    if (!ts.isTypeLiteralNode(node.type)) return;

    // 各プロパティシグネチャをチェック
    for (const member of node.type.members) {
      if (!ts.isPropertySignature(member)) continue;

      // readonlyが指定されているかチェック
      const hasReadonly = member.modifiers?.some(
        (mod) => mod.kind === ts.SyntaxKind.ReadonlyKeyword
      );

      if (hasReadonly !== true) {
        let propName = "";
        if (member.name !== undefined && ts.isIdentifier(member.name)) {
          propName = member.name.text;
        }
        ctx.report(
          member,
          `Props型 "${typeName}" のプロパティ "${propName}" に readonly 修飾子を追加してください。\n` +
            "■ 全てのProps型プロパティは readonly にする必要があります。\n" +
            "■ readonly projectRepository: ProjectRepository;"
        );
      }
    }
  },
});
