/**
 * Entity構造要件チェック
 *
 * domain/model 内のEntityファイル（.vo.ts, .repository.ts, .dummy.ts, .test.ts以外）:
 * - idプロパティ必須（複合キー禁止）
 * - privateコンストラクタ
 * - すべてのプロパティがreadonly
 * - {ClassName}Props型エイリアスの存在
 * - static from()メソッド
 * - インスタンスメソッドがvoidを返さない（新インスタンス返却）
 * - set/change/updateプレフィックス禁止（ドメインの言葉を使う）
 *
 * 参照: guardrails/policy/server/domain-model/20-entity-overview.md
 * 参照: guardrails/policy/server/domain-model/22-entity-implementation.md
 */

"use strict";

const FORBIDDEN_METHOD_PREFIXES = ["set", "change", "update"];
const ALLOWED_PATTERNS = [/^with[A-Z]/];

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Entity must have private constructor, readonly properties, Props type, from(), and use domain language",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      missingIdProperty:
        "Entity '{{className}}' must have 'readonly id: string' property. Composite keys are prohibited. See: 20-entity-overview.md",
      missingPrivateConstructor:
        "Entity must have a private constructor. See: 22-entity-implementation.md",
      missingFromMethod:
        "Entity must have a static from() method. See: 22-entity-implementation.md",
      missingReadonly:
        "Entity property '{{propertyName}}' must be readonly. See: 22-entity-implementation.md",
      missingPropsType:
        "Entity '{{className}}' must have '{{className}}Props' type alias. See: 22-entity-implementation.md",
      methodReturnsVoid:
        "Entity method '{{methodName}}' must return new instance (Entity or Result<Entity>), not void. See: 20-entity-overview.md",
      forbiddenMethodName:
        "Entity method '{{methodName}}' uses forbidden prefix '{{prefix}}'. Use domain language (approve, complete, cancel, clarify). See: 22-entity-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // domain/model ディレクトリ内のファイルのみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    // 除外: .vo.ts, .repository.ts, .dummy.ts, .test.ts
    if (
      filename.endsWith(".vo.ts") ||
      filename.endsWith(".repository.ts") ||
      filename.includes(".dummy.") ||
      filename.includes(".test.")
    ) {
      return {};
    }

    if (!filename.endsWith(".ts")) {
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
        let hasIdProperty = false;

        for (const member of classBody) {
          // id プロパティ（readonly id: string）
          if (
            member.type === "PropertyDefinition" &&
            member.key?.name === "id" &&
            member.readonly
          ) {
            hasIdProperty = true;
          }
          // private constructor
          if (
            member.type === "MethodDefinition" &&
            member.kind === "constructor" &&
            member.accessibility === "private"
          ) {
            hasPrivateConstructor = true;
          }

          // static from()
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            member.static === true &&
            member.key?.name === "from"
          ) {
            hasFromMethod = true;
          }

          // readonly プロパティ
          if (member.type === "PropertyDefinition" && !member.readonly) {
            const propertyName =
              member.key?.name || member.key?.value || "unknown";
            context.report({
              node: member,
              messageId: "missingReadonly",
              data: { propertyName },
            });
          }

          // インスタンスメソッド
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            !member.static
          ) {
            const methodName = member.key?.name;
            if (!methodName) continue;

            // 禁止プレフィックス
            for (const prefix of FORBIDDEN_METHOD_PREFIXES) {
              if (methodName.startsWith(prefix)) {
                const isAllowed = ALLOWED_PATTERNS.some((p) =>
                  p.test(methodName)
                );
                if (!isAllowed) {
                  context.report({
                    node: member,
                    messageId: "forbiddenMethodName",
                    data: { methodName, prefix },
                  });
                }
              }
            }

            // void戻り値
            const returnType = member.value?.returnType?.typeAnnotation;
            if (returnType?.type === "TSVoidKeyword") {
              context.report({
                node: member,
                messageId: "methodReturnsVoid",
                data: { methodName },
              });
            }
          }
        }

        if (!hasIdProperty) {
          context.report({
            node,
            messageId: "missingIdProperty",
            data: { className },
          });
        }
        if (!hasPrivateConstructor) {
          context.report({ node, messageId: "missingPrivateConstructor" });
        }
        if (!hasFromMethod) {
          context.report({ node, messageId: "missingFromMethod" });
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
