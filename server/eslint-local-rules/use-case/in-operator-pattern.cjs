/**
 * PATCH更新でのフィールド存在チェックパターン強制ルール
 *
 * UseCase層でPATCH更新を行う際、フィールドの存在チェックは
 * `input.field !== undefined` ではなく `"field" in input` を使用すべき。
 *
 * 理由:
 * - キー未指定: プロパティ自体がない → `"field" in input === false`
 * - null送信: undefinedを渡す → `input.field === undefined`
 * - 値送信: その値を渡す → `input.field === "value"`
 *
 * `!== undefined` のみでは「キー未指定」と「null送信」を区別できない。
 *
 * 参照: guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "PATCH field existence check should use 'in' operator, not just !== undefined",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      useInOperator:
        "Use '\"{{field}}\" in input' pattern for PATCH field existence check, not just '!== undefined'. See: 11-use-case-implementation.md",
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
    // list-, get-, delete-, register-, create- などは対象外
    const basename = filename.split("/").pop() || "";
    if (!basename.includes("update-")) {
      return {};
    }

    return {
      // input.field !== undefined パターンを検出
      BinaryExpression(node) {
        // !== undefined または !== void 0 のチェック
        if (node.operator !== "!==" && node.operator !== "!=") {
          return;
        }

        // 右辺が undefined かチェック
        const isUndefinedCheck =
          (node.right.type === "Identifier" &&
            node.right.name === "undefined") ||
          (node.right.type === "UnaryExpression" &&
            node.right.operator === "void");

        if (!isUndefinedCheck) {
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

        // 親ノードをチェック - 既に "field" in input と組み合わされているか
        const parent = node.parent;

        // LogicalExpression (&&) の右辺として使われている場合
        if (parent && parent.type === "LogicalExpression") {
          const left = parent.left;

          // 左辺が "field" in input の形式かチェック
          if (
            left.type === "BinaryExpression" &&
            left.operator === "in" &&
            left.left.type === "Literal" &&
            left.left.value === fieldName
          ) {
            // 正しいパターン: "field" in input && input.field !== undefined
            return;
          }
        }

        // "in" 演算子なしで !== undefined を使っている
        context.report({
          node,
          messageId: "useInOperator",
          data: { field: fieldName },
        });
      },
    };
  },
};
