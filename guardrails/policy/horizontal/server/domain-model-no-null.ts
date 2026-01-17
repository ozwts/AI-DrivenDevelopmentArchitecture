/**
 * @what Entity/Value Objectでnull型アノテーションを使用していないか検査
 * @why nullとundefinedの混在は複雑性を増すため、undefinedに統一する
 * @failure `| null`型アノテーションを持つプロパティを検出した場合にエラー
 *
 * @concept undefinedへの統一
 *
 * - **nullとundefinedの混在禁止**: 複雑性を減らすためundefinedに統一
 * - **Optional表現**: `T | undefined`で「値がないこと」を表現
 * - **TypeScriptとの親和性**: strictNullChecksと整合的
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   readonly dueDate: string | undefined;  // undefinedを使用
 *   readonly description: string | undefined;
 * }
 *
 * export type TodoProps = {
 *   dueDate: string | undefined;
 *   completedAt: string | undefined;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   readonly dueDate: string | null;  // NG: nullを使用
 * }
 *
 * export type TodoProps = {
 *   dueDate: string | null;  // NG: undefinedを使うべき
 * };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    // 型アノテーションを持つノードを検出
    if (!ts.isUnionTypeNode(node)) return;

    // Union型の中にnullがあるかチェック
    for (const type of node.types) {
      if (ts.isLiteralTypeNode(type) && type.literal.kind === ts.SyntaxKind.NullKeyword) {
        ctx.report(
          node,
          "null型の使用は禁止されています。undefinedを使用してください。"
        );
        return;
      }
    }
  },
});
