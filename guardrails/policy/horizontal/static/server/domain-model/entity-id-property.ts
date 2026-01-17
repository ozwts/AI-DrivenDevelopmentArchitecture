/**
 * @what Entityにid: stringプロパティが存在するか検査
 * @why すべてのEntityは識別子（ID）で等価性を判断するため、idプロパティは必須
 * @failure idプロパティを持たないEntityを検出した場合にエラー
 *
 * @concept Entity識別子の原則
 *
 * - **すべてのEntityはidを持つ**: 集約ルート・子エンティティ問わず `id: string` 必須
 * - **複合キー禁止**: 複数フィールドの組み合わせで識別する設計は禁止
 * - **ID生成はリポジトリ**: `todoId()`, `attachmentId()` 等でリポジトリがID生成を担う
 *
 * @example-good
 * ```typescript
 * export class Todo {
 *   readonly id: string;
 *   readonly title: string;
 *   readonly status: TodoStatus;
 *   readonly createdAt: string;
 *   readonly updatedAt: string;
 *
 *   private constructor(props: TodoProps) {
 *     this.id = props.id;
 *     // ...
 *   }
 * }
 *
 * export class ProjectMember {
 *   readonly id: string;        // 子エンティティもIDを持つ
 *   readonly userId: string;    // 別集約への参照
 *   readonly role: MemberRole;
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Todo {
 *   readonly title: string;     // NG: idプロパティがない
 *   readonly status: TodoStatus;
 * }
 *
 * export class ProjectMember {
 *   readonly projectId: string; // NG: idではなく複合キーで識別しようとしている
 *   readonly userId: string;
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isClassDeclaration(node)) return;

    // クラス名を取得
    const className = node.name?.text ?? 'Anonymous';

    // idプロパティを探す
    const hasIdProperty = node.members.some((member) => {
      if (!ts.isPropertyDeclaration(member)) return false;
      if (!ts.isIdentifier(member.name)) return false;
      return member.name.text === 'id';
    });

    if (!hasIdProperty) {
      ctx.report(
        node,
        `Entity "${className}" には id: string プロパティが必要です。すべてのEntityは識別子（ID）を持つ必要があります。`
      );
    }
  },
});
