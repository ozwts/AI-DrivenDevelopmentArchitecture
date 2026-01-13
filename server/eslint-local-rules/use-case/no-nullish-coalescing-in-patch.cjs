/**
 * PATCH更新での??演算子使用禁止ルール
 *
 * UseCase層でPATCH更新を行う際、フィールドの存在チェックは
 * `??`演算子ではなく`"field" in input`を使用すべき。
 *
 * 理由:
 * - `??`は「nullまたはundefined」を判定するが、3値セマンティクスでは不十分
 * - キー未指定: プロパティ自体がない → `"field" in input === false`
 * - null送信: undefinedを渡す → `input.field === undefined`
 * - 値送信: その値を渡す → `input.field === "value"`
 *
 * `??`を使うと「キー未指定」と「null送信」を区別できない。
 *
 * 参照: guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "PATCH updates should not use ?? operator, use 'in' operator instead",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      noNullishCoalescing:
        "Avoid using '??' operator for PATCH field handling. Use '\"{{field}}\" in input' pattern instead. See: 11-use-case-implementation.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // use-case/ 配下のみ
    if (!filename.includes("/use-case/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // Update系UseCase（PATCH操作）のみ対象
    const basename = filename.split("/").pop() || "";
    if (!basename.includes("update-")) {
      return {};
    }

    return {
      // input.field ?? existing.field パターンを検出
      LogicalExpression(node) {
        if (node.operator !== "??") {
          return;
        }

        // 左辺が input.xxx の形式かチェック
        if (
          node.left.type !== "MemberExpression" ||
          node.left.object.type !== "Identifier"
        ) {
          return;
        }

        const objectName = node.left.object.name;
        // input, props, data などの一般的な入力オブジェクト名
        if (!["input", "props", "data", "params"].includes(objectName)) {
          return;
        }

        // プロパティ名を取得
        let fieldName;
        if (node.left.property.type === "Identifier") {
          fieldName = node.left.property.name;
        } else if (node.left.property.type === "Literal") {
          fieldName = String(node.left.property.value);
        } else {
          return;
        }

        context.report({
          node,
          messageId: "noNullishCoalescing",
          data: { field: fieldName },
        });
      },
    };
  },
};
