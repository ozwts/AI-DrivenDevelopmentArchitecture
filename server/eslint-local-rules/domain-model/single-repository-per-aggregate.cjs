/**
 * 1集約 = 1リポジトリ強制ルール
 *
 * 1つの集約ディレクトリに複数のリポジトリインターフェースを配置することを禁止。
 * projectRepository と projectMemberRepository のような分割は認めない。
 *
 * 参照: guardrails/policy/server/domain-model/40-aggregate-overview.md
 */

"use strict";

const path = require("path");
const fs = require("fs");

// ディレクトリごとのリポジトリファイル数をキャッシュ
const dirRepositoryCounts = new Map();

/**
 * 指定ディレクトリ内の *-repository.ts ファイル数を取得
 */
function countRepositoriesInDir(dirPath) {
  if (dirRepositoryCounts.has(dirPath)) {
    return dirRepositoryCounts.get(dirPath);
  }

  try {
    const files = fs.readdirSync(dirPath);
    const repositoryFiles = files.filter(
      (f) => f.endsWith("-repository.ts") && !f.endsWith(".test.ts"),
    );
    dirRepositoryCounts.set(dirPath, repositoryFiles);
    return repositoryFiles;
  } catch {
    return [];
  }
}

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Enforce single repository per aggregate directory",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      multipleRepositories:
        "1つの集約ディレクトリに複数のリポジトリが存在します: {{ files }}。1集約 = 1リポジトリの原則に従い、子エンティティ専用リポジトリは作成せず、集約ルートのリポジトリで管理してください。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model/ 配下のリポジトリファイルのみ対象
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    if (!filename.endsWith("-repository.ts")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    const dirPath = path.dirname(filename);
    const repositoryFiles = countRepositoriesInDir(dirPath);

    // 2つ以上のリポジトリがある場合にエラー
    if (repositoryFiles.length > 1) {
      return {
        Program(node) {
          context.report({
            node,
            messageId: "multipleRepositories",
            data: {
              files: repositoryFiles.join(", "),
            },
          });
        },
      };
    }

    return {};
  },
};
