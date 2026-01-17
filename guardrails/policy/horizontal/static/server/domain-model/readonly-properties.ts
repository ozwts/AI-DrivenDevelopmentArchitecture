/**
 * @what Entity/Value Objectのプロパティがreadonlyで宣言されているか検査
 * @why mutableなプロパティは不変性を破壊し、予期しない副作用を生むため
 * @failure readonly修飾子がないEntityプロパティを検出した場合にエラー
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    for (const member of node.members) {
      if (!ts.isPropertyDeclaration(member)) continue;

      const hasReadonly = member.modifiers?.some(
        m => m.kind === ts.SyntaxKind.ReadonlyKeyword
      );

      if (!hasReadonly && member.name && ts.isIdentifier(member.name)) {
        ctx.report(member, `プロパティ "${member.name.text}" にreadonly修飾子がありません。`);
      }
    }
  }
});
