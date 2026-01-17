/**
 * @what new Date()の使用を禁止
 * @why 日本時間として統一的に扱い、テスト時のモック可能性を確保するため
 * @failure new Date()を使用している場合にエラー
 *
 * @concept 時刻取得の統一とテスタビリティ
 *
 * **理由**:
 * - 日本時間(Asia/Tokyo)として統一的に扱うため
 * - テスト時のモック可能性を確保するため
 * - プロジェクト全体で時刻取得方法を統一するため
 *
 * **許可される代替手段**:
 * - fetchNow(): 現在時刻の取得
 * - @/util/date-util: 日時変換・フォーマット
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: new Date()を使用
 * const now = new Date();
 * const tomorrow = new Date(Date.now() + 86400000);
 * ```
 *
 * @example-good
 * ```typescript
 * // ✅ Good: fetchNow()を使用（現在時刻）
 * const now = fetchNow();
 *
 * // ✅ Good: date-utilを使用（日時操作）
 * import { addDays } from "@/util/date-util";
 * const tomorrow = addDays(fetchNow(), 1);
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // date-util.ts 自体は除外（dayjsラッパーなのでDateを使う必要がある）
    if (fileName.endsWith("date-util.ts")) return;

    // fetch-now/ 配下は除外（fetchNow実装自体はnew Date()を使う）
    if (fileName.includes("/fetch-now/")) return;

    // di-container/ は除外（fetchNowの登録でnew Date()を使う）
    if (fileName.includes("/di-container/")) return;

    // テストファイルは除外
    if (fileName.includes(".test.")) return;

    // Dummyファイルは除外（テストデータ生成でnew Date()を使うことがある）
    if (fileName.includes(".dummy.")) return;

    // new Date() の検出
    if (!ts.isNewExpression(node)) return;

    if (ts.isIdentifier(node.expression) && node.expression.text === "Date") {
      ctx.report(
        node,
        "new Date()の使用は禁止されています。\n" +
          "■ ❌ Bad: const now = new Date();\n" +
          "■ ✅ Good: const now = fetchNow();  // 現在時刻の取得\n" +
          "■ ✅ Good: import { addDays } from \"@/util/date-util\";  // 日時操作\n" +
          "■ 理由:\n" +
          "  - 日本時間(Asia/Tokyo)として統一的に扱うため\n" +
          "  - テスト時のモック可能性を確保するため"
      );
    }
  },
});
