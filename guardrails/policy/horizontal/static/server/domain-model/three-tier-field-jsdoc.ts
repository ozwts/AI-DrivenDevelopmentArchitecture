/**
 * @what 3-Tier分類に基づくフィールドのJSDocコメント必須化
 * @why Entityフィールドは必須性とundefinedの意味で3段階に分類され、Tier 2/3は意味を明示すべき
 * @failure `| undefined` 型のフィールドにJSDocコメントがない場合にエラー
 *
 * @concept 3-Tier分類
 *
 * | Tier   | 分類         | フィールド定義        | undefinedの意味      | 例                   |
 * |--------|--------------|----------------------|---------------------|----------------------|
 * | Tier 1 | Required     | `string`             | -                   | id, title, status    |
 * | Tier 2 | Special Case | `string \| undefined` | ビジネス上の意味     | dueDate, completedAt |
 * | Tier 3 | Optional     | `string \| undefined` | 単に未設定          | description, memo    |
 *
 * **Tier 2 (Special Case)**: undefinedが「期限なし」「未完了」等のビジネス状態を表す
 * **Tier 3 (Optional)**: undefinedは単に「値が設定されていない」を意味する
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   // Tier 1: Required - 常に値が必要
 *   readonly id: string;
 *   readonly title: string;
 *   readonly status: TodoStatus;
 *
 *   // Tier 2: Special Case - undefinedがビジネス上の意味を持つ
 *   /**
 *    * 期限日
 *    * - 値あり: 期限が設定されている
 *    * - undefined: 「期限なし」を意味する（明示的な業務状態）
 *    *\/
 *   readonly dueDate: string | undefined;
 *
 *   /**
 *    * 完了日時
 *    * - 値あり: 完了済み
 *    * - undefined: 「未完了」を意味する（明示的な業務状態）
 *    *\/
 *   readonly completedAt: string | undefined;
 *
 *   // Tier 3: Optional - undefinedは単に「未設定」
 *   /**
 *    * 説明
 *    * TODOの詳細説明。設定は任意。
 *    *\/
 *   readonly description: string | undefined;
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *   // ❌ Tier 2/3の区別がつかない - JSDocでundefinedの意味を明示すべき
 *   readonly dueDate: string | undefined;
 *   readonly completedAt: string | undefined;
 *   readonly description: string | undefined;
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isPropertyDeclaration(node)) return;
    if (!ts.isIdentifier(node.name)) return;

    const propName = node.name.text;
    const typeNode = node.type;

    if (!typeNode) return;

    // Union型で undefined を含むかチェック
    let hasUndefined = false;

    if (ts.isUnionTypeNode(typeNode)) {
      for (const type of typeNode.types) {
        if (type.kind === ts.SyntaxKind.UndefinedKeyword) {
          hasUndefined = true;
          break;
        }
      }
    }

    if (!hasUndefined) return;

    // JSDocコメントがあるかチェック
    const sourceFile = node.getSourceFile();
    const sourceText = sourceFile.getFullText();
    const nodeStart = node.getFullStart();

    // ノードの前のテキストを取得してJSDocを探す
    const leadingComments = ts.getLeadingCommentRanges(sourceText, nodeStart);

    let hasJsDoc = false;
    if (leadingComments) {
      for (const comment of leadingComments) {
        const commentText = sourceText.substring(comment.pos, comment.end);
        // JSDoc形式（/** で始まる）かチェック
        if (commentText.startsWith('/**')) {
          hasJsDoc = true;
          break;
        }
      }
    }

    if (!hasJsDoc) {
      ctx.report(
        node,
        `【3-Tier分類違反】プロパティ "${propName}" は "| undefined" 型（Tier 2またはTier 3）ですが、JSDocがありません。\n` +
          `■ Tier 2 (Special Case): undefinedがビジネス状態を表す場合\n` +
          `  例: /** 期限日 - undefined: 「期限なし」を意味する */\n` +
          `■ Tier 3 (Optional): undefinedが単に「未設定」の場合\n` +
          `  例: /** 説明 - 設定は任意 */`
      );
    }
  },
});
