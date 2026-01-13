/**
 * 子エンティティ親ID禁止ルール
 *
 * 子エンティティ（集約ルート以外のエンティティ）が親IDフィールドを持つことを禁止。
 * 子エンティティは集約ルートを通じてのみアクセスされるため、親IDは不要。
 *
 * 検出対象:
 * - todoId, projectId など {parent}Id という名前のプロパティ
 * - 親ディレクトリ名と一致するIDフィールド
 *
 * 参照: guardrails/policy/server/domain-model/40-aggregate-overview.md
 */

"use strict";

const path = require("path");

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Child entity should not contain parent ID field (access through aggregate root)",
      category: "Aggregate",
      recommended: true,
    },
    schema: [],
    messages: {
      noParentIdInChild:
        "Child entity '{{childName}}' should not have parent ID field '{{fieldName}}'. Access child entities through aggregate root. See: 40-aggregate-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model 配下のみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // .entity.ts ファイルのみ（テスト・ダミー・VO・リポジトリ除外）
    if (
      !filename.endsWith(".entity.ts") ||
      filename.includes(".test.") ||
      filename.includes(".dummy.")
    ) {
      return {};
    }

    // ディレクトリ構造から集約名とエンティティ名を取得
    const dir = path.dirname(filename);
    const aggregateName = path.basename(dir); // 例: todo
    const entityFileName = path.basename(filename, ".entity.ts"); // 例: attachment

    // 集約ルートは除外（ディレクトリ名と同じ名前のエンティティ）
    if (entityFileName === aggregateName) {
      return {};
    }

    // 子エンティティの場合、親IDフィールドをチェック
    const parentIdFieldName = `${aggregateName}Id`; // 例: todoId

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Anonymous";
        const classBody = node.body.body;

        for (const member of classBody) {
          if (member.type !== "PropertyDefinition") continue;

          const fieldName = member.key?.name || member.key?.value;
          if (!fieldName) continue;

          // 親IDフィールドを検出
          if (fieldName === parentIdFieldName || fieldName === "parentId") {
            context.report({
              node: member,
              messageId: "noParentIdInChild",
              data: { childName: className, fieldName },
            });
          }
        }
      },
    };
  },
};
