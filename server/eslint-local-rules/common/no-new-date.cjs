/**
 * new Date() 禁止ルール
 *
 * プロジェクト全体で new Date() の使用を禁止。
 * 代わりに fetchNow() と @/util/date-util を使用する。
 *
 * 理由:
 * - 日本時間 (Asia/Tokyo) として統一的に扱うため
 * - テスト時のモック可能性を確保するため
 *
 * 許可される代替手段:
 * - fetchNow(): 現在時刻の取得
 * - @/util/date-util: 日時変換・フォーマット
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow new Date() in favor of fetchNow() and date-util",
      category: "Common",
      recommended: true,
    },
    schema: [],
    messages: {
      noNewDate:
        "new Date() の使用は禁止されています。現在時刻の取得には fetchNow() を、日時の変換には @/util/date-util を使用してください。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // date-util.ts 自体は除外（dayjsラッパーなのでDateを使う必要がある）
    if (filename.endsWith("date-util.ts")) {
      return {};
    }

    // fetch-now/ 配下は除外（fetchNow実装自体はnew Date()を使う）
    if (filename.includes("/fetch-now/")) {
      return {};
    }

    // di-container/ は除外（fetchNowの登録でnew Date()を使う）
    if (filename.includes("/di-container/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    return {
      // new Date() の検出
      NewExpression(node) {
        if (node.callee?.name === "Date") {
          context.report({
            node,
            messageId: "noNewDate",
          });
        }
      },
    };
  },
};
