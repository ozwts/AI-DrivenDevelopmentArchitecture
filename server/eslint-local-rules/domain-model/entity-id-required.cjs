/**
 * Entity idプロパティ必須ルール
 *
 * Entityクラスは`readonly id: string`プロパティを持つ必要がある。
 * DDDにおいてEntityは一意の識別子で識別される。
 *
 * 参照: guardrails/policy/server/domain-model/20-entity-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Entity must have readonly id: string property",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingIdProperty:
        "Entity '{{className}}' must have 'readonly id: string' property. See: 20-entity-overview.md",
      idNotReadonly:
        "Entity '{{className}}' id property must be readonly. See: 20-entity-overview.md",
      idNotString:
        "Entity '{{className}}' id property must be of type string. See: 20-entity-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .entity.ts ファイルのみ
    if (!filename.endsWith(".entity.ts")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    return {
      ClassDeclaration(node) {
        const className = node.id?.name || "Unknown";
        const classBody = node.body?.body || [];

        // idプロパティを探す
        const idProperty = classBody.find(
          (member) =>
            member.type === "PropertyDefinition" && member.key?.name === "id",
        );

        if (!idProperty) {
          context.report({
            node,
            messageId: "missingIdProperty",
            data: { className },
          });
          return;
        }

        // readonlyチェック
        if (!idProperty.readonly) {
          context.report({
            node: idProperty,
            messageId: "idNotReadonly",
            data: { className },
          });
        }

        // 型チェック（string）
        const typeAnnotation = idProperty.typeAnnotation?.typeAnnotation;
        if (
          typeAnnotation &&
          typeAnnotation.type !== "TSStringKeyword"
        ) {
          context.report({
            node: idProperty,
            messageId: "idNotString",
            data: { className },
          });
        }
      },
    };
  },
};
