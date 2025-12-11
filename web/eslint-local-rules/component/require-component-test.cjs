/**
 * コンポーネントテスト必須ルール
 *
 * components/ ディレクトリ内の .tsx ファイルには
 * 対応する .ct.test.tsx ファイルが必要
 *
 * 参照: guardrails/policy/web/component/30-test-patterns.md
 *       - ファイル配置: {component}.ct.test.tsx
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Component files in components/ directory must have corresponding .ct.test.tsx file",
      category: "Component",
      recommended: true,
    },
    schema: [],
    messages: {
      missingTest:
        "Component '{{componentName}}' is missing test file '{{expectedTestFile}}'. See: component/30-test-patterns.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // .tsx ファイルのみ対象
    if (!filename.endsWith(".tsx")) {
      return {};
    }

    // テストファイル自体は除外
    if (
      filename.includes(".test.") ||
      filename.includes(".spec.") ||
      filename.includes(".ct.test.")
    ) {
      return {};
    }

    // route.tsx, _layout.tsx は除外（ルートファイル）
    const basename = path.basename(filename);
    if (basename === "route.tsx" || basename === "_layout.tsx") {
      return {};
    }

    // components/ ディレクトリ内のファイルのみ対象
    if (!filename.includes("/components/")) {
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
