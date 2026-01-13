/**
 * グローバルcomponents/ディレクトリ禁止ルール
 *
 * app/components/ のようなグローバルなコンポーネントディレクトリは禁止。
 * コンポーネントはコロケーション原則に従い、使用場所の近くに配置する:
 * - ルート内 → routes/{feature}/components/
 * - 親子共有 → routes/{feature}/_shared/components/
 * - 3+横断 → features/{feature}/components/
 * - 純粋UI → lib/ui/
 *
 * 参照: guardrails/policy/web/route/30-shared-placement.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Prohibit global app/components/ directory - use colocation instead",
      category: "Route",
      recommended: true,
    },
    schema: [],
    messages: {
      noGlobalComponents:
        "Do not place components in 'app/components/'. Use colocation: routes/{feature}/components/, _shared/components/, features/, or lib/ui/. See: 30-shared-placement.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // app/components/ 配下のファイルを検出
    // 許可されるパターン:
    // - routes/**/components/ (ルート内コンポーネント)
    // - routes/**/_shared/components/ (親子共有)
    // - routes/**/_layout/ (レイアウト)
    // - features/**/components/ (クロスルート共有)
    // - lib/ui/ (純粋UI)

    // 禁止パターン: app/components/ (グローバル)
    if (
      filename.includes("/app/components/") &&
      !filename.includes("/routes/") &&
      !filename.includes("/features/") &&
      !filename.includes("/lib/")
    ) {
      context.report({
        loc: { line: 1, column: 0 },
        messageId: "noGlobalComponents",
      });
    }

    return {};
  },
};
