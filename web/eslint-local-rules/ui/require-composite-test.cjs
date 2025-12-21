/**
 * Composite コンポーネントテスト必須ルール
 *
 * ui/composite/ ディレクトリ内の .tsx ファイルには
 * 対応する .ct.test.tsx ファイルが必要
 *
 * 参照: guardrails/policy/web/ui/50-test-pattern.md
 *
 * 判断根拠:
 * - Composite: 状態管理・aria属性制御等のロジックを持つ → テスト必須
 * - Leaf: ロジックがほぼない（CVAでスタイル定義のみ） → テスト不要
 *
 * 除外対象:
 * - index.ts（エクスポートファイル）
 * - *.test.tsx（テストファイル自体）
 * - *.stories.tsx（Storybook）
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Composite component files in ui/composite/ must have corresponding .ct.test.tsx file",
      category: "UI",
      recommended: true,
    },
    schema: [],
    messages: {
      missingTest:
        "Composite component '{{componentName}}' is missing test file '{{expectedTestFile}}'. See: guardrails/policy/web/ui/50-test-pattern.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // ui/composite/ ディレクトリ内のファイルのみ対象
    if (!filename.includes("/ui/composite/")) {
      return {};
    }

    const basename = path.basename(filename);

    // .tsx ファイルのみ対象
    if (!basename.endsWith(".tsx")) {
      return {};
    }

    // index.tsx は除外（エクスポートファイル）
    if (basename === "index.tsx") {
      return {};
    }

    // テストファイル自体は除外
    if (basename.includes(".test.") || basename.includes(".spec.")) {
      return {};
    }

    // Storybookファイルは除外
    if (basename.includes(".stories.")) {
      return {};
    }

    // 対応するテストファイルのパスを計算
    const dir = path.dirname(filename);
    const componentName = basename.replace(".tsx", "");
    const expectedTestFile = `${componentName}.ct.test.tsx`;
    const expectedTestPath = path.join(dir, expectedTestFile);

    // テストファイルの存在チェック
    if (!fs.existsSync(expectedTestPath)) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: "missingTest",
            data: {
              componentName,
              expectedTestFile,
            },
          });
        },
      };
    }

    return {};
  },
};
