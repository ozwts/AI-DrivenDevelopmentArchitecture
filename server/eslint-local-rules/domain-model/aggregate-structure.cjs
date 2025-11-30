/**
 * アグリゲート構造チェック
 *
 * アグリゲートディレクトリ（domain/model/{aggregate}/）に対し、
 * 必須ファイルが存在するかを検証:
 *
 * 必須ファイル:
 * - {aggregate}.entity.ts
 * - {aggregate}.entity.dummy.ts
 * - {aggregate}.entity.small.test.ts
 * - {aggregate}.repository.ts
 * - {aggregate}.repository.dummy.ts
 *
 * 参照: guardrails/policy/server/domain-model/10-domain-model-overview.md
 */

"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Aggregate directory must have required files",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingFile:
        "Aggregate '{{aggregate}}' is missing required file: {{expectedFile}}. See: 10-domain-model-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model 配下のみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // テスト・ダミーは除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    // Entityファイル（{name}.entity.ts）のみを起点にチェック
    if (!filename.endsWith(".entity.ts")) {
      return {};
    }

    const dir = path.dirname(filename);
    const aggregate = path.basename(dir);
    const entityName = path.basename(filename, ".entity.ts");

    // アグリゲートルートのみチェック（子エンティティは除外）
    if (entityName !== aggregate) {
      return {};
    }

    const files = fs.readdirSync(dir);

    // 必須ファイル一覧
    const requiredFiles = [
      `${aggregate}.entity.ts`,
      `${aggregate}.entity.dummy.ts`,
      `${aggregate}.entity.small.test.ts`,
      `${aggregate}.repository.ts`,
      `${aggregate}.repository.dummy.ts`,
    ];

    return {
      Program(node) {
        for (const expectedFile of requiredFiles) {
          if (!files.includes(expectedFile)) {
            context.report({
              node,
              messageId: "missingFile",
              data: { aggregate, expectedFile },
            });
          }
        }
      },
    };
  },
};
