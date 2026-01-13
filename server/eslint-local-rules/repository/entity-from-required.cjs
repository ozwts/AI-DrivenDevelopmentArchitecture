/**
 * Repository Entity.from()メソッド使用必須ルール
 *
 * Repository層でEntityを生成する際は、`new Entity()`ではなく
 * `Entity.from()`静的メソッドを使用する。
 * これによりバリデーションを経由したEntity生成を強制する。
 *
 * 参照: guardrails/policy/server/repository/10-repository-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Repository should use Entity.from() instead of new Entity()",
      category: "Repository",
      recommended: true,
    },
    schema: [],
    messages: {
      useEntityFrom:
        "Use '{{entityName}}.from()' instead of 'new {{entityName}}()' in repository. Entity.from() ensures proper validation. See: 10-repository-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // repository.ts ファイルのみ（infrastructure/repository/配下）
    if (!filename.includes("/repository/") || !filename.endsWith(".ts")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    // Entity名のパターン（PascalCaseでEntityで終わる、または一般的なEntity名）
    const entityPattern = /^[A-Z][a-zA-Z]*(?:Entity)?$/;

    // インポートされたEntity名を追跡
    const importedEntities = new Set();

    return {
      // Entityのインポートを追跡
      ImportDeclaration(node) {
        if (node.source?.value?.includes("/domain/model/")) {
          node.specifiers?.forEach((spec) => {
            if (spec.imported?.name) {
              const name = spec.imported.name;
              // Entityで終わる名前、またはPascalCaseの名前を追跡
              if (name.endsWith("Entity") || entityPattern.test(name)) {
                importedEntities.add(spec.local?.name || name);
              }
            }
          });
        }
      },

      // new Entity() の使用を検出
      NewExpression(node) {
        const calleeName = node.callee?.name;

        if (!calleeName) {
          return;
        }

        // インポートされたEntityの場合、またはEntityで終わる名前の場合
        if (
          importedEntities.has(calleeName) ||
          calleeName.endsWith("Entity")
        ) {
          context.report({
            node,
            messageId: "useEntityFrom",
            data: { entityName: calleeName },
          });
        }
      },
    };
  },
};
