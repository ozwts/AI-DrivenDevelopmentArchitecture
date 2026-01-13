/**
 * パラメータプロパティ禁止ルール
 *
 * Value Object（.vo.ts）でパラメータプロパティの使用を禁止。
 * `private constructor(private readonly value)` ではなく、
 * ES2022プライベートフィールドとコンストラクタボディを使用する。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Value Object must not use parameter properties in constructor",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      noParameterProperty:
        "Value Object should not use parameter property '{{paramName}}'. Use ES2022 private field (#) with constructor body instead. See: 26-value-object-implementation.md",
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
      MethodDefinition(node) {
        if (node.kind !== "constructor") return;

        const params = node.value?.params || [];
        for (const param of params) {
          // パラメータプロパティを検出
          if (param.type === "TSParameterProperty") {
            const paramName = param.parameter?.name || "unknown";
            context.report({
              node: param,
              messageId: "noParameterProperty",
              data: { paramName },
            });
          }
        }
      },
    };
  },
};
