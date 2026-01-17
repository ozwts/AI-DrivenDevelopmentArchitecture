/**
 * @what 必ず成功するValue Objectの作成を禁止（Result<T, never>禁止）
 * @why バリデーションがないならVO化は不要。必ず成功するfrom()は無駄な抽象化
 * @failure from()メソッドの戻り値型が Result<T, never> の場合にエラー
 *
 * @concept Value Object化の判断基準（3-Tier）
 *
 * | Tier   | 基準                             | VO化   | 例                                   |
 * |--------|----------------------------------|--------|--------------------------------------|
 * | Tier 1 | 単一VO内で完結する不変条件を持つ | 必須   | `TodoStatus`（完了済みは変更不可）   |
 * | Tier 2 | ドメインルールを持つ             | 推奨   | `Email`（会社ドメインのみ）、`Money` |
 * | Tier 3 | 型レベル制約のみ                 | 不要   | `title: string`（OpenAPIで表現可能） |
 *
 * **このチェックはTier 3を検出**: `Result<T, never>` = バリデーションなし = VO化不要
 *
 * @example-good
 * ```typescript
 * // バリデーションがあるValue Object
 * export class TodoStatus {
 *   static from(props: TodoStatusProps): Result<TodoStatus, DomainError> {
 *     if (!validStatuses.includes(props.status)) {
 *       return Result.err(new DomainError("無効なステータス"));
 *     }
 *     return Result.ok(new TodoStatus(props.status));
 *   }
 * }
 *
 * // バリデーションがないならVO化しない
 * export class Todo {
 *   readonly title: string;  // プリミティブ型のまま ✅
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * // 必ず成功するValue Object（VO化不要）
 * export class TodoTitle {
 *   static from(props: { value: string }): Result<TodoTitle, never> {
 *     return Result.ok(new TodoTitle(props.value)); // ❌ 必ず成功
 *   }
 * }
 *
 * // 型エイリアスでneverを使用
 * type CreateResult = Result<TodoTitle, never>;
 * export class TodoTitle {
 *   static from(props: TodoTitleProps): CreateResult {
 *     return Result.ok(new TodoTitle(props.value)); // ❌ 必ず成功
 *   }
 * }
 * ```
 */

import * as ts from 'typescript';
import createCheck from '../../check-builder';

export default createCheck({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isMethodDeclaration(node)) return;

    // from メソッドかチェック
    if (!ts.isIdentifier(node.name) || node.name.text !== 'from') return;

    // static メソッドかチェック
    const isStatic = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.StaticKeyword
    );
    if (!isStatic) return;

    // 戻り値型をチェック
    const returnType = node.type;
    if (!returnType) return;

    // 戻り値型がResult<T, never>かチェック
    const hasNeverError = checkForNeverInResult(returnType);

    if (hasNeverError) {
      ctx.report(
        node,
        `from()メソッドの戻り値型が "Result<T, never>" になっています。` +
          `これは必ず成功するValue Objectを意味します。` +
          `バリデーションがないならVO化せず、プリミティブ型のまま使用してください。`
      );
    }
  },
});

/**
 * Result<T, never> パターンを検出
 */
function checkForNeverInResult(typeNode: ts.TypeNode): boolean {
  // Promise<Result<T, never>> の場合
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName) && typeName.text === 'Promise') {
      const typeArgs = typeNode.typeArguments;
      if (typeArgs && typeArgs.length > 0) {
        return checkForNeverInResult(typeArgs[0]);
      }
    }
  }

  // Result<T, never> の場合
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName;
    if (ts.isIdentifier(typeName) && typeName.text === 'Result') {
      const typeArgs = typeNode.typeArguments;
      if (typeArgs && typeArgs.length >= 2) {
        const errorType = typeArgs[1];
        // never型かチェック
        if (errorType.kind === ts.SyntaxKind.NeverKeyword) {
          return true;
        }
      }
    }
  }

  return false;
}
