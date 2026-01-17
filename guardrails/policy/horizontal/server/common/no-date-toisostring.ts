/**
 * @what Date.toISOString()の使用を禁止
 * @why toISOString()はUTC固定のため、日本時間として統一的に扱うには不適切
 * @failure Date.toISOString()を使用している場合にエラー
 *
 * @concept 日本時間での統一的な時刻フォーマット
 *
 * **理由**:
 * - toISOString()はUTC固定のため、日本時間(Asia/Tokyo)として統一的に扱うには不適切
 * - date-util.toIsoString()は日本時間でフォーマット
 * - プロジェクト全体で時刻フォーマットを統一するため
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: toISOString()を使用（UTC固定）
 * const now = new Date();
 * const isoString = now.toISOString();
 * ```
 *
 * @example-good
 * ```typescript
 * // ✅ Good: date-util.toIsoString()を使用（日本時間）
 * import { toIsoString } from "@/util/date-util";
 *
 * const now = fetchNow();
 * const isoString = toIsoString(now);
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // date-util.ts 自体は除外
    if (fileName.endsWith("date-util.ts")) return;

    // テストファイルは除外
    if (fileName.includes(".test.")) return;

    // .toISOString() の検出
    if (!ts.isCallExpression(node)) return;

    if (
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.name) &&
      node.expression.name.text === "toISOString"
    ) {
      ctx.report(
        node,
        "toISOString()の使用は禁止されています。\n" +
          "■ ❌ Bad: date.toISOString()  // UTC固定\n" +
          "■ ✅ Good: toIsoString(date)  // 日本時間\n" +
          "■ 理由: toISOString()はUTC固定のため、日本時間(Asia/Tokyo)として統一的に扱うには不適切です。\n" +
          "■ import { toIsoString } from \"@/util/date-util\";"
      );
    }
  },
});
