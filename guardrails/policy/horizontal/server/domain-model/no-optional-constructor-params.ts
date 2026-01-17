/**
 * @what 3-Tier分類：コンストラクタ引数でオプショナル(?)の使用を禁止
 * @why analyzability原則：全フィールドを必須化し、省略不可にすることで明示性を高める
 * @failure コンストラクタのprops引数でオプショナルプロパティ(?)を使用している場合にエラー
 *
 * @concept 3-Tier分類とコンストラクタ
 *
 * | Tier   | フィールド定義        | コンストラクタ                    |
 * |--------|----------------------|----------------------------------|
 * | Tier 1 | `string`             | `string`（必須）                  |
 * | Tier 2 | `string \| undefined` | `string \| undefined`（必須）     |
 * | Tier 3 | `string \| undefined` | `string \| undefined`（必須）     |
 *
 * **核心**: Tier 2/3も `| undefined` で「必須」にする。`?:` は使わない。
 * これにより、undefinedを明示的に渡すことが強制され、渡し忘れを型システムで検出できる。
 *
 * @example-good
 * ```typescript
 * export type TodoProps = {
 *   // Tier 1: Required
 *   id: string;
 *   title: string;
 *   // Tier 2: Special Case - undefinedも必須で渡す
 *   dueDate: string | undefined;
 *   completedAt: string | undefined;
 *   // Tier 3: Optional - undefinedも必須で渡す
 *   description: string | undefined;
 * };
 *
 * // 呼び出し時 - 全フィールドを明示的に渡す
 * Todo.from({
 *   id: '1',
 *   title: 'タスク',
 *   dueDate: undefined,      // Tier 2: 明示的にundefinedを渡す ✅
 *   completedAt: undefined,  // Tier 2: 明示的にundefinedを渡す ✅
 *   description: undefined,  // Tier 3: 明示的にundefinedを渡す ✅
 * });
 * ```
 *
 * @example-bad
 * ```typescript
 * export type TodoProps = {
 *   id: string;
 *   title: string;
 *   dueDate?: string;      // ❌ オプショナル（省略可能）
 *   description?: string;  // ❌ オプショナル（省略可能）
 * };
 *
 * // 呼び出し時 - 渡し忘れがコンパイルエラーにならない ❌
 * Todo.from({
 *   id: '1',
 *   title: 'タスク',
 *   // dueDate を渡し忘れてもエラーにならない
 * });
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    // Props型エイリアスをチェック
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;

      // xxxProps 型かチェック
      if (!typeName.endsWith("Props")) return;

      const typeNode = node.type;

      // オブジェクト型リテラルかチェック
      if (!ts.isTypeLiteralNode(typeNode)) return;

      // 各プロパティをチェック
      for (const member of typeNode.members) {
        if (!ts.isPropertySignature(member)) continue;

        // オプショナル(?)かチェック
        if (member.questionToken !== undefined) {
          const propName = ts.isIdentifier(member.name)
            ? member.name.text
            : "unknown";

          ctx.report(
            member,
            `【3-Tier分類違反】Props型 "${typeName}" のプロパティ "${propName}" がオプショナル(?)です。\n` +
              `■ 修正方法: "${propName}?: T" → "${propName}: T | undefined"\n` +
              "■ 理由: Tier 2/3フィールドも必須引数にすることで、undefinedの明示的な渡しを強制"
          );
        }
      }
    }
  },
});
