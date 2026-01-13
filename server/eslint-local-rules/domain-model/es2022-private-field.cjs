/**
 * ES2022プライベートフィールド強制ルール
 *
 * Value Object（.vo.ts）でES2022のプライベートフィールド（#）を使用しているか検証。
 * アンダースコアプレフィックス（_value）は禁止。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Value Object must use ES2022 private fields (#) instead of underscore prefix (_)",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      useEs2022PrivateField:
        "Value Object should use ES2022 private field (#{{fieldName}}) instead of underscore prefix (_{{fieldName}}). See: 26-value-object-implementation.md",
      preferEs2022PrivateField:
        "Consider using ES2022 private field (#) for '{{fieldName}}' in Value Object. See: 26-value-object-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // .vo.ts のみ（テスト・ダミー除外）
    if (
      !filename.endsWith(".vo.ts") ||
      filename.includes(".test.") ||
      filename.includes(".dummy.")
    ) {
      return {};
    }

    return {
      // クラスプロパティのチェック
      PropertyDefinition(node) {
        const keyName = node.key?.name || node.key?.value;

        if (!keyName) return;

        // アンダースコアプレフィックスのプライベートフィールドを検出
        if (
          typeof keyName === "string" &&
          keyName.startsWith("_") &&
          (node.accessibility === "private" || !node.accessibility)
        ) {
          const fieldNameWithoutUnderscore = keyName.substring(1);
          context.report({
            node,
            messageId: "useEs2022PrivateField",
            data: { fieldName: fieldNameWithoutUnderscore },
          });
        }
      },

      // コンストラクタパラメータのチェック
      MethodDefinition(node) {
        if (node.kind !== "constructor") return;

        const params = node.value?.params || [];
        for (const param of params) {
          // パラメータプロパティでアンダースコアを使用している場合
          if (param.type === "TSParameterProperty") {
            const paramName = param.parameter?.name;
            if (paramName && paramName.startsWith("_")) {
              const fieldNameWithoutUnderscore = paramName.substring(1);
              context.report({
                node: param,
                messageId: "useEs2022PrivateField",
                data: { fieldName: fieldNameWithoutUnderscore },
              });
            }
          }
        }
      },
    };
  },
};
