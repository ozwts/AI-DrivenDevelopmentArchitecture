/**
 * @what Entityのメソッド名がドメインの言葉を使用しているか検査（set*, change*, update*は禁止）
 * @why メソッド名はビジネス上の意図を表現すべきであり、汎用的な動詞は意図を曖昧にするため
 * @failure set*, change*, update*で始まるメソッドを検出した場合にエラー
 *
 * @concept ユビキタス言語によるメソッド命名
 *
 * - **ドメインの言葉**: `approve`, `complete`, `cancel`, `clarify`, `reschedule`等を使用
 * - **汎用動詞禁止**: `set*`, `change*`, `update*`はビジネス意図が不明瞭
 * - **例外**: Tier 3フィールド（単なるオプション値）は`with{Field}()`を許容
 * - **ビジネス契約との一致**: `contracts/business/`の用語と対応させる
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   // ドメインの言葉を使用
 *   approve(updatedAt: string): Todo { ... }           // 承認する
 *   reject(reason: string, updatedAt: string): Todo { ... }  // 却下する
 *   complete(completedAt: string): Result<Todo, DomainError> { ... }  // 完了する
 *   cancel(updatedAt: string): Todo { ... }           // キャンセルする
 *   assign(userId: string, updatedAt: string): Todo { ... }  // 担当者をアサインする
 *   clarify(description: string): Todo { ... }        // 説明を明確化する
 *   reschedule(dueDate: string): Todo { ... }         // 期限を再設定する
 *
 *   // Tier 3フィールド（単なるオプション値）はwith{Field}()を許容
 *   withMemo(memo: string | undefined, updatedAt: string): Todo { ... }
 * }
 *
 * export class TodoStatus {
 *   // 状態チェックメソッド
 *   isCompleted(): boolean { ... }
 *   isTodo(): boolean { ... }
 *   canTransitionTo(newStatus: TodoStatus): Result<void, DomainError> { ... }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   // NG: 汎用的な動詞を使用
 *   setStatus(status: TodoStatus): void { ... }          // ❌ 何をしているか不明
 *   changeStatus(status: TodoStatus): void { ... }       // ❌ ビジネス意図が不明
 *   updateDescription(description: string): Todo { ... } // ❌ clarifyなどを使う
 *   setDueDate(dueDate: string): Todo { ... }           // ❌ rescheduleなどを使う
 *   updateTitle(title: string): Todo { ... }            // ❌ renameなどを使う
 *
 *   // NG: 汎用updateメソッド
 *   update(props: Partial<TodoProps>): Todo { ... }     // ❌ 個別メソッドを使う
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// 禁止するメソッド名パターン
const FORBIDDEN_METHOD_PATTERNS = [
  /^set[A-Z]/,      // setStatus, setTitle, etc.
  /^change[A-Z]/,   // changeStatus, changeTitle, etc.
  /^update[A-Z]/,   // updateStatus, updateTitle, etc.
  /^update$/,       // 汎用updateメソッド
];

// 例外: 許可するメソッド名
const ALLOWED_METHODS = [
  "setup",          // セットアップは許可
  "settings",       // 設定関連は許可
  "setter",         // setterという名前は許可（ただし実際にはgetterを使うべき）
];

export const policyCheck = createASTChecker({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isMethodDeclaration(node)) return;
    if (!ts.isIdentifier(node.name)) return;

    const methodName = node.name.text;

    // 例外リストにあれば許可
    if (ALLOWED_METHODS.includes(methodName)) return;

    // 禁止パターンにマッチするかチェック
    for (const pattern of FORBIDDEN_METHOD_PATTERNS) {
      if (pattern.test(methodName)) {
        ctx.report(
          node,
          `メソッド "${methodName}" は汎用的な動詞を使用しています。ドメインの言葉（approve, complete, cancel, clarify, reschedule等）を使用してください。`
        );
        return;
      }
    }
  },
});
