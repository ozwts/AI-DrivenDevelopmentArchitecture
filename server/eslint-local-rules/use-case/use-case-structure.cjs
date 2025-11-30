/**
 * UseCase構造要件チェック
 *
 * use-case/ 内のUseCaseImplファイル:
 * - Input/Output/Exception/Result/Props型を定義する
 * - インターフェースを実装する（implements {Action}{Entity}UseCase）
 * - インターフェースはUseCase<TInput, TOutput, TException>を使用
 * - Result型を定義する（{Action}{Entity}UseCaseResult = Result<Output, Exception>）
 * - executeメソッドを持つ
 * - プライベートメソッドを持たない（executeメソッドで書き切る）
 * - Props型がすべてreadonly
 *
 * 参照: guardrails/policy/server/use-case/10-use-case-overview.md
 *       guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "UseCase must implement interface, have execute method, no private methods, and readonly Props",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      missingImplements:
        "UseCaseImpl '{{className}}' must implement '{{interfaceName}}'. See: 11-use-case-implementation.md",
      interfaceMustUseUseCaseType:
        "UseCase interface '{{typeName}}' must use 'UseCase<TInput, TOutput, TException>' from interfaces.ts. See: 10-use-case-overview.md",
      missingInputType:
        "UseCaseImpl '{{className}}' must have corresponding '{{inputTypeName}}' type alias. See: 11-use-case-implementation.md",
      missingOutputType:
        "UseCaseImpl '{{className}}' must have corresponding '{{outputTypeName}}' type alias. See: 11-use-case-implementation.md",
      missingExceptionType:
        "UseCaseImpl '{{className}}' must have corresponding '{{exceptionTypeName}}' type alias. See: 11-use-case-implementation.md",
      missingResultType:
        "UseCaseImpl '{{className}}' must have corresponding '{{resultTypeName}}' type alias using Result<Output, Exception>. See: 11-use-case-implementation.md",
      resultTypeMustUseResult:
        "UseCaseResult type '{{typeName}}' must use 'Result<Output, Exception>' from @/util/result. See: 11-use-case-implementation.md",
      missingExecuteMethod:
        "UseCaseImpl must have an 'execute' method. See: 10-use-case-overview.md",
      privateMethodForbidden:
        "UseCaseImpl must not have private methods. Write all logic in execute method. Method: '{{methodName}}'. See: 11-use-case-implementation.md",
      propsNotReadonly:
        "Props type property '{{propertyName}}' must be readonly. See: 11-use-case-implementation.md",
      missingPropsType:
        "UseCaseImpl '{{className}}' must have corresponding '{{propsTypeName}}' type alias. See: 11-use-case-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // use-case/ ディレクトリ内のファイルのみ
    if (!filename.includes("/use-case/")) {
      return {};
    }

    // テスト・ダミーは除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    // interfaces.tsは除外
    if (filename.endsWith("interfaces.ts")) {
      return {};
    }

    // UseCaseImplを含むファイルのみ対象
    if (!filename.includes("-use-case.ts")) {
      return {};
    }

    const definedTypes = new Set(); // 定義された型名を収集
    const definedPropsTypes = new Map(); // PropsType名 -> node
    const definedResultTypes = new Map(); // ResultType名 -> node
    const useCaseImplClasses = []; // UseCaseImplクラス情報

    return {
      // 型エイリアスを収集
      TSTypeAliasDeclaration(node) {
        const typeName = node.id?.name;
        if (typeName) {
          definedTypes.add(typeName);
        }

        // {Action}{Entity}UseCase型のチェック（末尾がUseCaseで、UseCaseInput/Output/Exception/Props/Resultでない）
        if (
          typeName?.endsWith("UseCase") &&
          !typeName.endsWith("UseCaseInput") &&
          !typeName.endsWith("UseCaseOutput") &&
          !typeName.endsWith("UseCaseException") &&
          !typeName.endsWith("UseCaseProps") &&
          !typeName.endsWith("UseCaseResult")
        ) {
          // UseCase<...>を使用しているかチェック
          const typeAnnotation = node.typeAnnotation;
          const isUseCaseType =
            typeAnnotation?.type === "TSTypeReference" &&
            typeAnnotation.typeName?.name === "UseCase";

          if (!isUseCaseType) {
            context.report({
              node,
              messageId: "interfaceMustUseUseCaseType",
              data: { typeName },
            });
          }
        }

        // {Action}{Entity}UseCaseResult型のチェック
        if (typeName?.endsWith("UseCaseResult")) {
          const typeAnnotation = node.typeAnnotation;
          const isResultType =
            typeAnnotation?.type === "TSTypeReference" &&
            typeAnnotation.typeName?.name === "Result";

          if (!isResultType) {
            context.report({
              node,
              messageId: "resultTypeMustUseResult",
              data: { typeName },
            });
          }
          definedResultTypes.set(typeName, node);
        }

        if (typeName?.endsWith("UseCaseProps")) {
          // readonlyチェック
          if (node.typeAnnotation?.type === "TSTypeLiteral") {
            for (const member of node.typeAnnotation.members) {
              if (
                member.type === "TSPropertySignature" &&
                !member.readonly
              ) {
                const propertyName =
                  member.key?.name || member.key?.value || "unknown";
                context.report({
                  node: member,
                  messageId: "propsNotReadonly",
                  data: { propertyName },
                });
              }
            }
          }
          definedPropsTypes.set(typeName, node);
        }
      },

      ClassDeclaration(node) {
        const className = node.id?.name || "Anonymous";

        // UseCaseImplクラスのみ対象
        if (!className.endsWith("UseCaseImpl")) {
          return;
        }

        // implements句チェック
        // CreateProjectUseCaseImpl -> CreateProjectUseCase
        const expectedInterfaceName = className.replace(/Impl$/, "");
        const implementsClause = node.implements || [];
        const implementsInterface = implementsClause.some((impl) => {
          const implName =
            impl.expression?.name || impl.typeName?.name || impl.id?.name;
          return implName === expectedInterfaceName;
        });

        if (!implementsInterface) {
          context.report({
            node,
            messageId: "missingImplements",
            data: { className, interfaceName: expectedInterfaceName },
          });
        }

        const classBody = node.body.body;
        let hasExecuteMethod = false;

        for (const member of classBody) {
          // executeメソッドチェック
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            member.key?.name === "execute"
          ) {
            hasExecuteMethod = true;
          }

          // プライベートメソッド禁止
          if (
            member.type === "MethodDefinition" &&
            member.kind === "method" &&
            member.key?.name !== "execute"
          ) {
            // privateプロパティ（#付き）
            if (member.key?.type === "PrivateIdentifier") {
              const methodName = member.key.name;
              context.report({
                node: member,
                messageId: "privateMethodForbidden",
                data: { methodName: `#${methodName}` },
              });
            }
            // accessibilityがprivateのメソッド
            if (member.accessibility === "private") {
              const methodName = member.key?.name || "unknown";
              context.report({
                node: member,
                messageId: "privateMethodForbidden",
                data: { methodName },
              });
            }
          }
        }

        if (!hasExecuteMethod) {
          context.report({
            node,
            messageId: "missingExecuteMethod",
          });
        }

        // Props型チェック用に記録
        useCaseImplClasses.push({ node, className });
      },

      "Program:exit"() {
        for (const { node, className } of useCaseImplClasses) {
          // CreateProjectUseCaseImpl -> CreateProjectUseCaseInput
          const inputTypeName = className.replace(/Impl$/, "Input");
          if (!definedTypes.has(inputTypeName)) {
            context.report({
              node,
              messageId: "missingInputType",
              data: { className, inputTypeName },
            });
          }

          // CreateProjectUseCaseImpl -> CreateProjectUseCaseOutput
          const outputTypeName = className.replace(/Impl$/, "Output");
          if (!definedTypes.has(outputTypeName)) {
            context.report({
              node,
              messageId: "missingOutputType",
              data: { className, outputTypeName },
            });
          }

          // CreateProjectUseCaseImpl -> CreateProjectUseCaseException
          const exceptionTypeName = className.replace(/Impl$/, "Exception");
          if (!definedTypes.has(exceptionTypeName)) {
            context.report({
              node,
              messageId: "missingExceptionType",
              data: { className, exceptionTypeName },
            });
          }

          // CreateProjectUseCaseImpl -> CreateProjectUseCaseProps
          const propsTypeName = className.replace(/Impl$/, "Props");
          if (!definedPropsTypes.has(propsTypeName)) {
            context.report({
              node,
              messageId: "missingPropsType",
              data: { className, propsTypeName },
            });
          }

          // CreateProjectUseCaseImpl -> CreateProjectUseCaseResult
          const resultTypeName = className.replace(/Impl$/, "Result");
          if (!definedResultTypes.has(resultTypeName)) {
            context.report({
              node,
              messageId: "missingResultType",
              data: { className, resultTypeName },
            });
          }
        }
      },
    };
  },
};
