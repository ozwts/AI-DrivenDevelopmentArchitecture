/**
 * UseCase関連ファイル存在要件チェック
 *
 * use-case/ 内のUseCaseファイルに対して:
 * - テストファイルが存在すること（.small.test.ts）
 *
 * 参照: guardrails/policy/server/use-case/30-testing-overview.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "UseCase must have corresponding test file",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      missingTestFile:
        "UseCase must have a Small Test file '{{expectedTestFile}}'. See: guardrails/policy/server/use-case/30-testing-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // use-case/ ディレクトリ内のファイルのみ
    if (!filename.includes("/use-case/")) {
      return {};
    }

    // テスト・ダミー・sharedは除外
    if (
      filename.includes(".test.") ||
      filename.includes(".dummy.") ||
      filename.includes("/shared/")
    ) {
      return {};
    }

    // interfaces.tsは除外
    if (filename.endsWith("interfaces.ts")) {
      return {};
    }

    // -use-case.tsで終わるファイルのみ対象
    if (!filename.endsWith("-use-case.ts")) {
      return {};
    }

    return {
      Program(node) {
        const dir = path.dirname(filename);
        const basename = path.basename(filename, ".ts");

        // 期待されるテストファイル名
        const expectedTestFile = `${basename}.small.test.ts`;
        const testFilePath = path.join(dir, expectedTestFile);

        if (!fs.existsSync(testFilePath)) {
          context.report({
            node,
            messageId: "missingTestFile",
            data: { expectedTestFile },
          });
        }
      },
    };
  },
};
