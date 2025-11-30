/**
 * リポジトリインターフェース要件チェック
 *
 * .repository.ts ファイル:
 * - type（型エイリアス）で定義（classではない）
 * - メソッドがResult型を返す
 * - 引数はPropsパターン（オブジェクト形式）
 * - ID生成メソッド（{entity}Id()）の存在
 *
 * 参照: guardrails/policy/server/domain-model/30-repository-interface-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Repository interface must be type alias with Result return types and Props pattern",
      category: "Domain Model",
      recommended: true,
    },
    schema: [],
    messages: {
      useTypeNotClass:
        "Repository interface must be defined with 'type', not 'class'. See: 30-repository-interface-overview.md",
      methodNotReturningResult:
        "Repository method '{{methodName}}' must return Promise<Result<...>>. See: 30-repository-interface-overview.md",
      methodNotUsingPropsPattern:
        "Repository method '{{methodName}}' must use Props pattern (object argument). See: 30-repository-interface-overview.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // *-repository.ts または *.repository.ts のみ（ダミー除外）
    const isRepository = filename.endsWith("-repository.ts") || filename.endsWith(".repository.ts");
    if (!isRepository || filename.includes(".dummy.")) {
      return {};
    }

    // domain/model 内のみ
    if (!filename.includes("/domain/model/")) {
      return {};
    }

    return {
      // classで定義されている場合はエラー
      ClassDeclaration(node) {
        const className = node.id?.name || "Anonymous";
        if (className.includes("Repository")) {
          context.report({
            node,
            messageId: "useTypeNotClass",
          });
        }
      },

      // 型エイリアス内のメソッドシグネチャをチェック
      TSMethodSignature(node) {
        const methodName = node.key?.name;
        if (!methodName) return;

        // ID生成メソッドは除外（戻り値がstringでOK）
        if (methodName.endsWith("Id")) {
          return;
        }

        // 戻り値の型をチェック
        const returnType = node.returnType?.typeAnnotation;
        if (returnType) {
          // Promise<Result<...>> または Result<...> を期待
          let innerType = returnType;

          // Promiseの場合は内部の型を取得
          if (
            returnType.type === "TSTypeReference" &&
            returnType.typeName?.name === "Promise"
          ) {
            innerType = returnType.typeArguments?.params?.[0];
          }

          // Resultかどうかチェック
          if (innerType) {
            const isResult =
              innerType.type === "TSTypeReference" &&
              innerType.typeName?.name === "Result";

            // 型エイリアス（SaveResult, FindByIdResult等）も許可
            const isResultTypeAlias =
              innerType.type === "TSTypeReference" &&
              innerType.typeName?.name?.endsWith("Result");

            if (!isResult && !isResultTypeAlias) {
              context.report({
                node,
                messageId: "methodNotReturningResult",
                data: { methodName },
              });
            }
          }
        }

        // 引数のPropsパターンをチェック
        const params = node.params || [];
        for (const param of params) {
          // 単純な識別子（props: {...}）はOK
          // プリミティブ型の直接引数はNG
          if (
            param.type === "Identifier" &&
            param.typeAnnotation?.typeAnnotation
          ) {
            const paramType = param.typeAnnotation.typeAnnotation;
            // オブジェクト型リテラルまたは型参照はOK
            if (
              paramType.type !== "TSTypeLiteral" &&
              paramType.type !== "TSTypeReference"
            ) {
              context.report({
                node,
                messageId: "methodNotUsingPropsPattern",
                data: { methodName },
              });
            }
          }
        }
      },
    };
  },
};
