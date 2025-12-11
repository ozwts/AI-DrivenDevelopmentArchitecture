/**
 * リポジトリ関連ファイル存在要件チェック
 *
 * infrastructure/repository/ 内のリポジトリ実装ファイルに対して:
 * - Medium Testファイルが存在すること（.medium.test.ts）
 *
 * 参照: guardrails/policy/server/repository/40-test-patterns.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Repository must have corresponding medium test file",
      category: "Repository",
      recommended: true,
    },
    schema: [],
    messages: {
      missingMediumTestFile:
        "Repository '{{repositoryName}}' must have a Medium Test file '{{expectedTestFile}}'. See: guardrails/policy/server/repository/40-test-patterns.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // infrastructure/repository/ ディレクトリ内のファイルのみ
    if (!filename.includes("/infrastructure/repository/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // .tsファイルのみ対象
    if (!filename.endsWith(".ts")) {
      return {};
    }

    // -repository.tsで終わるファイルのみ対象
    if (!filename.endsWith("-repository.ts")) {
      return {};
    }

    return {
      Program(node) {
        const dir = path.dirname(filename);
        const basename = path.basename(filename, ".ts");

        // 期待されるテストファイル名
        const expectedTestFile = `${basename}.medium.test.ts`;
        const testFilePath = path.join(dir, expectedTestFile);

        if (!fs.existsSync(testFilePath)) {
          context.report({
            node,
            messageId: "missingMediumTestFile",
            data: {
              repositoryName: basename,
              expectedTestFile,
            },
          });
        }
      },
    };
  },
};
