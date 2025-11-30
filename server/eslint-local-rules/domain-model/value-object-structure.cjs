/**
 * Value Object構造要件チェック
 *
 * .vo.ts ファイル:
 * - privateコンストラクタ
 * - コンストラクタパラメータがreadonly
 * - {ClassName}Props型エイリアス
 * - static from() メソッド（Result型を返す）
 * - equals() メソッド
 * - toString() メソッド
 *
 * 参照: guardrails/policy/server/domain-model/26-value-object-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Value Object must have private constructor, Props type, from(), equals(), toString()",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingPrivateConstructor:
        "Value Object must have a private constructor. See: 26-value-object-implementation.md",
      constructorParamNotReadonly:
        "Value Object constructor parameter '{{paramName}}' must be readonly. See: 26-value-object-implementation.md",
      missingPropsType:
        "Value Object '{{className}}' must have '{{className}}Props' type alias. See: 26-value-object-implementation.md",
      missingFromMethod:
        "Value Object must have a static from() method. See: 26-value-object-implementation.md",
      fromMethodNotReturningResult:
        "Value Object from() must return Result type, not '{{returnType}}'. See: 26-value-object-implementation.md",
      missingEqualsMethod:
        "Value Object must have an equals() method. See: 26-value-object-implementation.md",
      missingToStringMethod:
        "Value Object must have a toString() method. See: 26-value-object-implementation.md",
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

    const definedPropsTypes = new Set();

    return {
      TSTypeAliasDeclaration(node) {
        if (node.id?.name?.endsWith("Props")) {
          definedPropsTypes.add(node.id.name);
        }
      },

      ClassDeclaration(node) {
        const className = node.id?.name || "Anonymous";
        const classBody = node.body.body;

        let hasPrivateConstructor = false;
        let hasFromMethod = false;
        let hasEqualsMethod = false;
        let hasToStringMethod = false;

        for (const member of classBody) {
          // private constructor
          if (
            member.type === "MethodDefinition" &&
            member.kind === "constructor"
          ) {
            if (member.accessibility === "private") {
              hasPrivateConstructor = true;

              // パラメータのreadonly
              const params = member.value?.params || [];
              for (const param of params) {
                if (param.type === "TSParameterProperty" && !param.readonly) {
                  const paramName = param.parameter?.name || "unknown";
                  context.report({
                    node: param,
                    messageId: "constructorParamNotReadonly",
                    data: { paramName },
                  });
                }
              }
            }
          }

          // static from()
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            member.static === true &&
            member.key?.name === "from"
          ) {
            hasFromMethod = true;

            // Result型チェック
            const returnType = member.value?.returnType?.typeAnnotation;
            if (returnType) {
              if (returnType.type === "TSTypeReference") {
                const typeName = returnType.typeName?.name;
                if (typeName !== "Result") {
                  context.report({
                    node: member,
                    messageId: "fromMethodNotReturningResult",
                    data: { returnType: typeName || "unknown" },
                  });
                }
              } else {
                context.report({
                  node: member,
                  messageId: "fromMethodNotReturningResult",
                  data: { returnType: returnType.type },
                });
              }
            }
          }

          // equals()
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            !member.static &&
            member.key?.name === "equals"
          ) {
            hasEqualsMethod = true;
          }

          // toString()
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            !member.static &&
            member.key?.name === "toString"
          ) {
            hasToStringMethod = true;
          }
        }

        if (!hasPrivateConstructor) {
          context.report({ node, messageId: "missingPrivateConstructor" });
        }
        if (!hasFromMethod) {
          context.report({ node, messageId: "missingFromMethod" });
        }
        if (!hasEqualsMethod) {
          context.report({ node, messageId: "missingEqualsMethod" });
        }
        if (!hasToStringMethod) {
          context.report({ node, messageId: "missingToStringMethod" });
        }
      },

      "Program:exit"(programNode) {
        for (const node of programNode.body) {
          let classNode = null;
          if (node.type === "ExportNamedDeclaration" && node.declaration?.type === "ClassDeclaration") {
            classNode = node.declaration;
          } else if (node.type === "ClassDeclaration") {
            classNode = node;
          }

          if (classNode) {
            const className = classNode.id?.name;
            if (className && !definedPropsTypes.has(`${className}Props`)) {
              context.report({
                node: classNode,
                messageId: "missingPropsType",
                data: { className },
              });
            }
          }
        }
      },
    };
  },
};
