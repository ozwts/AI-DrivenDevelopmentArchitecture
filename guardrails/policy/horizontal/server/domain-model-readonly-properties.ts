/**
 * @what Entity/Value Objectのプロパティがreadonlyで宣言されているか検査
 * @why mutableなプロパティは不変性を破壊し、予期しない副作用を生むため
 * @failure readonly修飾子がないEntityプロパティを検出した場合にエラー
 *
 * @concept 不変性（Immutability）
 *
 * - **すべてのプロパティはreadonly**: mutableな状態変更を禁止
 * - **更新は新インスタンス**: 更新メソッドは新しいインスタンスを返す
 * - **副作用の排除**: 予測可能で追跡しやすいコード
 * - **並行処理安全**: 共有状態による競合を防止
 *
 * @example-good
 * ```typescript
 * export class UserEntity {
 *   readonly id: UserId;
 *   readonly name: UserName;
 *   readonly email: Email;
 *   readonly createdAt: Date;
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class UserEntity {
 *   id: UserId;           // NG: readonly修飾子がない
 *   public name: UserName; // NG: publicでもreadonlyが必要
 *   readonly email: Email; // OK
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;

      const hasReadonly = member.modifiers?.some(
        m => m.kind === ts.SyntaxKind.ReadonlyKeyword
      );

      if (hasReadonly !== true && member.name !== undefined && ts.isIdentifier(member.name)) {
        ctx.report(member, `プロパティ "${member.name.text}" にreadonly修飾子がありません。`);
      }
    }
  }
});
