/**
 * @what Value Objectのプライベートフィールドに意味のある名前を必須化
 * @why `#value`のような汎用的な名前はドメインの意味を失い、可読性を低下させる
 * @failure 汎用的なフィールド名（#value, #val, #data等）を使用している場合にエラー
 *
 * @concept 意味のあるフィールド名
 *
 * VOのプライベートフィールドはドメイン固有の名前を持つべき。
 * `#value` ではなく `#email`, `#amount`, `#status` のように具体的な名前を使用する。
 *
 * @example-good
 * ```typescript
 * export class Email {
 *   readonly #email: string;  // ✅ ドメイン固有の名前
 * }
 *
 * export class Money {
 *   readonly #amount: number;  // ✅ ドメイン固有の名前
 *   readonly #currency: string;
 * }
 *
 * export class TodoStatus {
 *   readonly #status: TodoStatusValue;  // ✅ ドメイン固有の名前
 * }
 * ```
 *
 * @example-bad
 * ```typescript
 * export class Email {
 *   readonly #value: string;  // ❌ 汎用的な名前
 * }
 *
 * export class Money {
 *   readonly #val: number;    // ❌ 汎用的な名前
 *   readonly #data: string;   // ❌ 汎用的な名前
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

// 禁止する汎用的なフィールド名
const GENERIC_NAMES = ["value", "val", "data", "_value", "_val"];

export const policyCheck = createASTChecker({
  filePattern: /\.vo\.ts$/,

  visitor: (node, ctx) => {
    if (!ts.isPropertyDeclaration(node)) return;

    const propertyName = node.name;

    // ES2022プライベートフィールド（#field）をチェック
    if (ts.isPrivateIdentifier(propertyName)) {
      const name = propertyName.text.toLowerCase();

      if (GENERIC_NAMES.includes(name)) {
        ctx.report(
          node,
          `プライベートフィールド "#${propertyName.text}" は汎用的な名前です。` +
            "ドメイン固有の意味のある名前（#email, #amount, #status等）を使用してください。"
        );
      }
    }
  },
});
