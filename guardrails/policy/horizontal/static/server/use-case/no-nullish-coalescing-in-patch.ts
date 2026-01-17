/**
 * @what PATCH更新で??演算子（nullish coalescing）を使用していないか検証
 * @why ??演算子では3値セマンティクス（キー未指定/null送信/値送信）を区別できないため
 * @failure `input.field ?? existing.field`パターンを検出した場合にエラー
 *
 * @concept PATCH更新での??演算子禁止
 *
 * PATCH更新では、`??`演算子を使用せず、`"field" in input`で存在チェックを行う。
 *
 * **理由:**
 * - `??`は「nullまたはundefined」を判定するが、3値セマンティクスでは不十分
 * - キー未指定: プロパティ自体がない → `"field" in input === false`
 * - null送信: `undefined`を渡す → `input.field === undefined`
 * - 値送信: その値を渡す → `input.field === "value"`
 *
 * `??`を使うと、「キー未指定」の場合に既存値を使ってしまい、意図した動作にならない。
 *
 * **正しいパターン:**
 * ```typescript
 * let updated = existing;
 * if ("title" in input && input.title !== undefined) {
 *   updated = updated.clarify(input.title, now);
 * }
 * ```
 *
 * @example-good
 * ```typescript
 * export class UpdateProjectUseCaseImpl implements UpdateProjectUseCase {
 *   async execute(input: UpdateProjectUseCaseInput): Promise<UpdateProjectUseCaseResult> {
 *     let existing = getResult.value;
 *
 *     // ✅ "field" in input で存在チェック
 *     if ("name" in input && input.name !== undefined) {
 *       const nameResult = existing.rename(input.name, now);
 *       if (nameResult.isErr()) return nameResult;
 *       existing = nameResult.value;
 *     }
 *
 *     if ("color" in input && input.color !== undefined) {
 *       const colorResult = existing.changeColor(input.color, now);
 *       if (colorResult.isErr()) return colorResult;
 *       existing = colorResult.value;
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
 *     // ❌ ??演算子を使用
 *     const name = input.name ?? existing.name;  // ❌
 *     const color = input.color ?? existing.color;  // ❌
 *
 *     // キー未指定の場合も既存値が使われてしまう
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // BinaryExpression（??演算子）をチェック
    if (!ts.isBinaryExpression(node)) return;

    // ??演算子のみ対象
    if (node.operatorToken.kind !== ts.SyntaxKind.QuestionQuestionToken) {
      return;
    }

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
    const capitalizedField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);

    ctx.report(
      node,
      `PATCH更新で ?? 演算子を使用しています: "${fieldName}"\n` +
        "■ ?? 演算子では3値セマンティクス（キー未指定/null送信/値送信）を区別できません。\n" +
        "■ \"field\" in input && input.field !== undefined のパターンを使用してください。\n" +
        `■ 正しい例: if ("${fieldName}" in input && input.${fieldName} !== undefined) { updated = updated.update${capitalizedField}(input.${fieldName}); }`
    );
  },
});
