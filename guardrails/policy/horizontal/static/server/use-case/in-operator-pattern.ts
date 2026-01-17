/**
 * @what PATCH更新でのフィールド存在チェックに"in"演算子を使用しているか検証
 * @why キー未指定と null送信を区別するため、`!== undefined`だけでは不十分
 * @failure `input.field !== undefined`を検出し、`"field" in input`との併用がない場合にエラー
 *
 * @concept PATCH更新の3値セマンティクス
 *
 * PATCH更新では、以下の3つの状態を区別する必要がある:
 * 1. **キー未指定**: プロパティ自体がない → `"field" in input === false`
 * 2. **null送信**: `undefined`を渡す → `input.field === undefined`
 * 3. **値送信**: その値を渡す → `input.field === "value"`
 *
 * `input.field !== undefined` のみでは、「キー未指定」と「null送信」を区別できない。
 *
 * **正しいパターン:**
 * ```typescript
 * if ("title" in input && input.title !== undefined) {
 *   // 値が送信された場合のみ更新
 *   const titleResult = todo.clarify(input.title, now);
 * }
 * ```
 *
 * @example-good
 * ```typescript
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput): Promise<UpdateProjectUseCaseResult> {
 *     // ✅ "field" in input && input.field !== undefined
 *     if ("name" in input && input.name !== undefined) {
 *       const nameResult = existing.rename(input.name, now);
 *       if (nameResult.isErr()) return nameResult;
 *       existing = nameResult.value;
 *     }
 *
 *     if ("description" in input && input.description !== undefined) {
 *       const descResult = existing.updateDescription(input.description, now);
 *       if (descResult.isErr()) return descResult;
 *       existing = descResult.value;
 *     }
 *
 *     return Result.ok(existing);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput) {
 *     // ❌ !== undefined のみ（"in"演算子なし）
 *     if (input.name !== undefined) {  // ❌
 *       existing = existing.rename(input.name, now);
 *     }
 *
 *     // キー未指定とnull送信を区別できない
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // BinaryExpression（input.field !== undefined）をチェック
    if (!ts.isBinaryExpression(node)) return;

    // !== または != のみ対象
    if (
      node.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken &&
      node.operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsToken
    ) {
      return;
    }

    // 右辺が undefined かチェック
    let isUndefinedCheck = false;

    if (ts.isIdentifier(node.right) && node.right.text === "undefined") {
      isUndefinedCheck = true;
    }

    // void 0 (void演算子) もundefinedと同じ
    if (ts.isVoidExpression(node.right)) {
      isUndefinedCheck = true;
    }

    if (!isUndefinedCheck) return;

    // 左辺が input.xxx の形式かチェック
    if (!ts.isPropertyAccessExpression(node.left)) return;
    if (!ts.isIdentifier(node.left.expression)) return;

    const objectName = node.left.expression.text;
    // input, props, data, params などの一般的な入力オブジェクト名
    if (!["input", "props", "data", "params"].includes(objectName)) {
      return;
    }

    const { fileName } = ctx.sourceFile;

    // Update系UseCase（PATCH操作）のみ対象
    if (!fileName.includes("update-")) {
      return;
    }

    // テストファイルは除外
    if (fileName.includes(".test.")) {
      return;
    }

    // プロパティ名を取得
    const fieldName = node.left.name.text;

    // 親ノードをチェック - 既に "field" in input と組み合わされているか
    const { parent } = node;

    // LogicalExpression (&&) の右辺として使われている場合
    if (parent !== undefined && ts.isBinaryExpression(parent)) {
      const parentBinary = parent as ts.BinaryExpression;
      if (parentBinary.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
        const { left } = parentBinary;

        // 左辺が "field" in input の形式かチェック
        if (ts.isBinaryExpression(left) && left.operatorToken.kind === ts.SyntaxKind.InKeyword) {
          if (
            ts.isStringLiteral(left.left) &&
            left.left.text === fieldName &&
            ts.isPropertyAccessExpression(left.right)
          ) {
            // 正しいパターン: "field" in input && input.field !== undefined
            return;
          }
        }
      }
    }

    // "in" 演算子なしで !== undefined を使っている
    ctx.report(
      node,
      `PATCH更新でフィールド存在チェックに "in" 演算子を使用していません: "${fieldName}"\n` +
        "■ \"field\" in input && input.field !== undefined のパターンを使用してください。\n" +
        `■ 正しい例: if ("${fieldName}" in input && input.${fieldName} !== undefined) { ... }`
    );
  },
});
