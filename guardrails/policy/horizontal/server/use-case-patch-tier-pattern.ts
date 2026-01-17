/**
 * @what PATCH更新のTier判定パターンの検証
 * @why Tierの分類を明確にし、クリア可否を適切に実装するため
 * @failure 以下のパターンを検出: (1) 'in'演算子のみでundefinedチェックなし (2) Tier分類コメントがない
 *
 * @concept PATCH更新のTier判定
 *
 * PATCH更新では、3つのTierでフィールドを分類し、それぞれ適切なチェックを実施する。
 *
 * | Tier | 分類             | クリア可否 | チェックパターン                         |
 * |------|------------------|------------|------------------------------------------|
 * | 1    | Required         | クリア不可 | `'field' in input && input.field !== undefined` |
 * | 2    | Special Case     | クリア可   | `'field' in input`                       |
 * | 3    | Optional         | クリア可   | `'field' in input`                       |
 *
 * **理由:**
 * - **Tier 1（Required）**: 必須フィールドはnullを送信してクリアできない
 * - **Tier 2（Special Case）**: 特殊ケース（例: 期限をクリア）はnullを送信してクリア可
 * - **Tier 3（Optional）**: オプショナルフィールドはnullを送信してクリア可
 *
 * @example-good
 * ```typescript
 * // Tier 1（Required）- クリア不可
 * .map((t: Todo) =>
 *   'title' in input && input.title !== undefined  // ✅ undefinedチェックあり
 *     ? t.retitle(input.title, now)
 *     : t
 * )
 *
 * // Tier 2/3（Special Case/Optional）- クリア可
 * .map((t: Todo) =>
 *   'dueDate' in input  // ✅ undefinedチェック不要（クリア可）
 *     ? t.reschedule(input.dueDate, now)
 *     : t
 * )
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: Tier分類が不明確
 * .map((t: Todo) =>
 *   'title' in input  // ❌ Tier 1なのにundefinedチェックなし
 *     ? t.retitle(input.title, now)
 *     : t
 * )
 *
 * // ❌ Bad: Tier分類コメントがない
 * .map((t: Todo) =>
 *   'dueDate' in input && input.dueDate !== undefined  // ❌ Tier 3なのにundefinedチェックあり
 *     ? t.reschedule(input.dueDate, now)
 *     : t
 * )
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

/**
 * 'field' in input パターンを検出
 */
const isInOperatorPattern = (node: ts.Node): boolean => {
  if (!ts.isBinaryExpression(node)) return false;
  if (node.operatorToken.kind !== ts.SyntaxKind.InKeyword) return false;

  // 左辺が文字列リテラル、右辺がinput（またはinput関連の識別子）
  if (!ts.isStringLiteral(node.left)) return false;
  if (!ts.isIdentifier(node.right)) return false;

  return node.right.text === "input" || node.right.text.includes("input");
};

/**
 * 'field' in input && input.field !== undefined パターンを検出
 */
const hasUndefinedCheck = (node: ts.Node): boolean => {
  if (!ts.isBinaryExpression(node)) return false;
  if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken)
    return false;

  // 左辺が 'field' in input
  if (!isInOperatorPattern(node.left)) return false;

  // 右辺が input.field !== undefined パターンか
  const { right } = node;
  if (!ts.isBinaryExpression(right)) return false;

  if (
    right.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken &&
    right.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsToken
  ) {
    return false;
  }

  // input.field !== undefined の形式
  if (ts.isPropertyAccessExpression(right.left)) {
    if (ts.isIdentifier(right.right) && right.right.text === "undefined") {
      return true;
    }
  }

  // undefined !== input.field の形式
  if (ts.isPropertyAccessExpression(right.right)) {
    if (ts.isIdentifier(right.left) && right.left.text === "undefined") {
      return true;
    }
  }

  return false;
};

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // 'field' in input パターンを検出
    if (!isInOperatorPattern(node)) return;

    // このnodeが && の左辺かチェック
    const { parent } = node;
    if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      parent.left === node
    ) {
      // && の右辺がundefinedチェックかチェック
      if (hasUndefinedCheck(parent)) {
        // Tier 1パターン（'in' && !== undefined）
        // 正しいパターンなので警告なし
        return;
      }

      // && はあるがundefinedチェックでない場合
      ctx.report(
        parent,
        "PATCH更新で'in'演算子と&&を使用していますが、undefinedチェックがありません。\n" +
          "■ ❌ Bad: 'field' in input && input.field !== null  // nullチェックではなくundefinedチェック\n" +
          "■ ✅ Good (Tier 1): 'field' in input && input.field !== undefined  // クリア不可\n" +
          "■ ✅ Good (Tier 2/3): 'field' in input  // クリア可\n" +
          "■ 理由: Tier 1（Required）フィールドはundefinedチェックが必須です。Tier 2/3なら&&は不要です。"
      );
      return;
    }

    // 'in'演算子のみ（undefinedチェックなし）
    // これがTier 2/3（Special Case/Optional）なのか、Tier 1の誤りなのかを判断するため、
    // フィールド名を取得してヒントを提供する
    if (ts.isBinaryExpression(node) && ts.isStringLiteral(node.left)) {
      const fieldName = node.left.text;

      ctx.report(
        node,
        `PATCH更新で'in'演算子のみ使用（undefinedチェックなし）: "${fieldName}"\n` +
          "■ Tier 1（Required）の場合: undefinedチェックを追加してください\n" +
          `  ✅ Good: '${fieldName}' in input && input.${fieldName} !== undefined\n` +
          "■ Tier 2/3（Special Case/Optional）の場合: このままで正しいです（クリア可）\n" +
          `  ✅ Good: '${fieldName}' in input\n` +
          "■ アクション: Tierの分類を確認し、コメントで明記してください\n" +
          "  例: // Tier 1（Required）: title は必須フィールド（クリア不可）\n" +
          `  例: // Tier 3（Optional）: ${fieldName} はオプショナル（クリア可）`
      );
    }
  },
});
