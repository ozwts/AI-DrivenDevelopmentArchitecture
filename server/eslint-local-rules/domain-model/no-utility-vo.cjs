/**
 * ユーティリティVO禁止ルール
 *
 * Value Objectのfrom()メソッドが Result<T, never> を返す場合、
 * それは「常に成功する」ことを意味し、VOにする意味がない。
 *
 * VOの本質は「ドメインルールを持つ値」であり、
 * バリデーションがないならtype aliasやBranded Typeで十分。
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Value Object from() method should not return Result<T, never> (always succeeds)",
      category: "DomainModel",
      recommended: true,
    },
    schema: [],
    messages: {
      noUtilityVo:
        "Value Object '{{className}}' has from() returning Result<T, never>. If validation always succeeds, use type alias instead. See: 26-value-object-implementation.md",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // .vo.ts ファイルのみ
    if (!filename.endsWith(".vo.ts")) {
      return {};
    }

    // テストファイル、ダミーファイルは除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    let currentClassName = null;

    return {
      // クラス名を記録
      ClassDeclaration(node) {
        if (node.id && node.id.type === "Identifier") {
          currentClassName = node.id.name;
        }
      },

      "ClassDeclaration:exit"() {
        currentClassName = null;
      },

      // from() メソッドの戻り値型をチェック
      MethodDefinition(node) {
        // static from メソッドのみ
        if (
          !node.static ||
          node.key.type !== "Identifier" ||
          node.key.name !== "from"
        ) {
          return;
        }

        // TypeScript の戻り値型アノテーションをチェック
        const returnType = node.value.returnType;
        if (!returnType || returnType.type !== "TSTypeAnnotation") {
          return;
        }

        const typeAnnotation = returnType.typeAnnotation;

        // Result<T, never> パターンを検出
        if (
          typeAnnotation.type === "TSTypeReference" &&
          typeAnnotation.typeName.type === "Identifier" &&
          typeAnnotation.typeName.name === "Result" &&
          typeAnnotation.typeArguments &&
          typeAnnotation.typeArguments.params.length >= 2
        ) {
          const errorType = typeAnnotation.typeArguments.params[1];

          // 第2型引数が never かチェック
          if (
            errorType.type === "TSNeverKeyword" ||
            (errorType.type === "TSTypeReference" &&
              errorType.typeName.type === "Identifier" &&
              errorType.typeName.name === "never")
          ) {
            context.report({
              node,
              messageId: "noUtilityVo",
              data: { className: currentClassName || "Unknown" },
            });
          }
        }
      },
    };
  },
};
