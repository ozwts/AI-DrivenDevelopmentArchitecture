/**
 * ドメインモデルファイル存在要件チェック
 *
 * Entity/Value Objectに対応するテスト・ダミーファイルの存在を検証:
 * - Entity: {name}.ts → {name}.small.test.ts, {name}.dummy.ts
 * - Value Object: {name}.vo.ts → {name}.vo.small.test.ts, {name}.vo.dummy.ts
 *
 * 参照: guardrails/policy/server/domain-model/50-test-overview.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Entity/Value Object must have corresponding test and dummy files",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingTestFile:
        "{{type}} '{{className}}' must have test file: {{expectedFile}}. See: guardrails/policy/server/domain-model/50-test-overview.md",
      missingDummyFile:
        "{{type}} '{{className}}' must have dummy file: {{expectedFile}}. See: guardrails/policy/server/domain-model/22-entity-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model のみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テスト・ダミー・リポジトリは除外
    if (
      filename.includes(".test.") ||
      filename.includes(".dummy.") ||
      filename.endsWith(".repository.ts")
    ) {
      return {};
    }

    if (!filename.endsWith(".ts")) {
      return {};
    }

    const dir = path.dirname(filename);
    const basename = path.basename(filename, ".ts");
    const isValueObject = filename.endsWith(".vo.ts");
    const type = isValueObject ? "Value Object" : "Entity";

    const expectedTestFile = `${basename}.small.test.ts`;
    const expectedDummyFile = `${basename}.dummy.ts`;

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Anonymous";

        const testFilePath = path.join(dir, expectedTestFile);
        if (!fs.existsSync(testFilePath)) {
          context.report({
            node,
            messageId: "missingTestFile",
            data: { type, className, expectedFile: expectedTestFile },
          });
        }

        const dummyFilePath = path.join(dir, expectedDummyFile);
        if (!fs.existsSync(dummyFilePath)) {
          context.report({
            node,
            messageId: "missingDummyFile",
            data: { type, className, expectedFile: expectedDummyFile },
          });
        }
      },
    };
  },
};
