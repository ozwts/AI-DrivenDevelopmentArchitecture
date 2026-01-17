/**
 * @what UseCase層にドメインロジックが漏れ出していないか検証（貧血ドメインモデルの検出）
 * @why ビジネスロジックがUseCase層に漏れると、重複・保守性低下・テスト困難を招くため
 * @failure 以下のパターンを検出: (1) Entity複数フィールド手動更新 (2) Entity状態値の直接比較
 *
 * @concept Rich Domain Model
 *
 * ビジネスロジックはEntity/Value Objectに集約し、UseCase層はドメインオブジェクトの組み立てに専念する。
 *
 * **問題点（貧血ドメインモデル）**:
 * - ビジネスロジックが分散し、保守性が低下
 * - 同じバリデーションや計算が複数箇所に重複
 * - テストが困難（ロジックの所在が不明確）
 *
 * @example-good
 * ```typescript
 * export class CompleteTodoUseCaseImpl implements CompleteTodoUseCase {
 *   async execute(input: CompleteTodoUseCaseInput): Promise<CompleteTodoUseCaseResult> {
 *     const existing = ...; // 既存Entity取得
 *
 *     // ✅ Entityメソッドで状態遷移（ビジネスルールはEntity内に実装）
 *     const completed = existing.complete(now);
 *     if (completed.isErr()) {
 *       return completed;
 *     }
 *
 *     // 永続化
 *     return Result.ok(completed);
 *   }
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class CompleteTodoUseCaseImpl implements CompleteTodoUseCase {
 *   async execute(input: CompleteTodoUseCaseInput) {
 *     const existing = ...; // 既存Entity取得
 *
 *     // ❌ UseCase層で状態チェック（ドメインロジック漏出）
 *     if (existing.status.value === "COMPLETED") {
 *       return Result.err(new DomainError("すでに完了しています"));
 *     }
 *
 *     // ❌ UseCase層で複数フィールド手動更新
 *     const updated = new Todo({
 *       ...existing,
 *       status: TodoStatus.completed(),
 *       completedAt: now,
 *       updatedAt: now,
 *     });
 *
 *     return Result.ok(updated);
 *   }
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

/**
 * PascalCaseかチェック（EntityやValueObjectの命名規則）
 */
const isPascalCase = (name: string): boolean => /^[A-Z][a-zA-Z0-9]*$/.test(name);

export const policyCheck = createASTChecker({
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.")) {
      return;
    }

    // パターン1: PascalCaseクラスの複数フィールド手動更新を検出
    // new SomeEntity({ ...existing, field1, field2, field3 })
    if (ts.isNewExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        const className = node.expression.text;

        // PascalCaseクラスのみチェック（Entity/ValueObjectの可能性）
        if (!isPascalCase(className)) return;

        // コンストラクタ引数をチェック
        if (
          node.arguments !== undefined &&
          node.arguments.length > 0 &&
          ts.isObjectLiteralExpression(node.arguments[0])
        ) {
          const objLiteral = node.arguments[0];

          // SpreadAssignment（...existing）があるかチェック
          let hasSpread = false;
          let additionalPropertyCount = 0;

          for (const prop of objLiteral.properties) {
            if (ts.isSpreadAssignment(prop)) {
              hasSpread = true;
            } else if (
              ts.isPropertyAssignment(prop) ||
              ts.isShorthandPropertyAssignment(prop)
            ) {
              additionalPropertyCount += 1;
            }
          }

          // ...existingと2つ以上の追加プロパティがある場合、貧血症の兆候
          if (hasSpread && additionalPropertyCount >= 2) {
            ctx.report(
              node,
              `${className}の複数フィールドを手動で更新しています（貧血ドメインモデルの兆候）。\n` +
                `■ ❌ Bad: new ${className}({ ...existing, field1, field2, field3 });\n` +
                "■ ✅ Good: existing.businessMethod(params);\n" +
                "■ 理由: 複数フィールドの連動更新はEntityメソッドに抽出すべきです。"
            );
          }
        }
      }
    }

    // パターン2: xxx.value === "STRING" パターンを検出（ValueObject状態値の直接比較）
    if (ts.isBinaryExpression(node)) {
      const { left, operatorToken, right } = node;

      // === または !== 演算子かチェック
      if (
        operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken &&
        operatorToken.kind !== ts.SyntaxKind.ExclamationEqualsEqualsToken
      ) {
        return;
      }

      // 左辺が xxx.value パターンかチェック
      if (
        ts.isPropertyAccessExpression(left) &&
        ts.isIdentifier(left.name) &&
        left.name.text === "value"
      ) {
        // 右辺が文字列リテラル（大文字）かチェック
        if (ts.isStringLiteral(right)) {
          const stringValue = right.text;

          // 大文字またはSNAKE_CASEの文字列の場合、ValueObject状態値の可能性
          if (/^[A-Z_]+$/.test(stringValue)) {
            ctx.report(
              node,
              `ValueObject状態値を直接比較しています: ".value === "${stringValue}" （貧血ドメインモデルの兆候）。\n` +
                '■ ❌ Bad: if (entity.status.value === "COMPLETED") { ... }\n' +
                "■ ✅ Good: const result = entity.complete(now); if (result.isErr()) { ... }\n" +
                "■ 理由: 状態遷移ルールはEntityメソッドに実装すべきです。"
            );
          }
        }
      }
    }
  },
});
