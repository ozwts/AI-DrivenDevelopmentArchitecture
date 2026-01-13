/**
 * UseCase Result型戻り値ルール
 *
 * UseCaseのexecute()メソッドがResult型を返しているか検証。
 * throwを使わず、Result型でエラーを表現する。
 *
 * 参照: guardrails/policy/server/use-case/11-use-case-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "UseCase execute() must return Result type",
      category: "UseCase",
      recommended: true,
    },
    schema: [],
    messages: {
      mustReturnResult:
        "UseCase execute() must return Result type (e.g., Promise<Result<T, E>>), not '{{returnType}}'. See: 11-use-case-implementation.md",
      missingReturnType:
        "UseCase execute() must have explicit return type annotation with Result. See: 11-use-case-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // use-case ディレクトリ内のみ
    if (!filename.includes("/use-case/")) {
      return {};
    }

    // テスト・ダミー除外
    if (filename.includes(".test.") || filename.includes(".dummy.")) {
      return {};
    }

    // .ts ファイルのみ
    if (!filename.endsWith(".ts")) {
      return {};
    }

    /**
     * 型がResultを含むかチェック（再帰的）
     *
     * 以下をResult型として認識:
     * - 直接の Result<T, E>
     * - *Result で終わる型エイリアス（命名規約: XxxUseCaseResult = Result<T, E>）
     */
    function containsResultType(typeNode) {
      if (!typeNode) return false;

      if (typeNode.type === "TSTypeReference") {
        const typeName = typeNode.typeName?.name || "";

        // 直接Result型
        if (typeName === "Result") {
          return true;
        }

        // 命名規約: *Result で終わる型エイリアス（例: CreateProjectUseCaseResult）
        if (typeName.endsWith("Result")) {
          return true;
        }

        // Promise<...> の場合は内部を再帰チェック
        if (typeName === "Promise") {
          const typeParams = typeNode.typeArguments?.params || [];
          return typeParams.some(containsResultType);
        }
      }

      return false;
    }

    /**
     * 型の文字列表現を取得
     */
    function getTypeString(typeNode) {
      if (!typeNode) return "unknown";

      if (typeNode.type === "TSTypeReference") {
        const name = typeNode.typeName?.name || "unknown";
        const params = typeNode.typeArguments?.params || [];
        if (params.length > 0) {
          const paramStrings = params.map(getTypeString);
          return `${name}<${paramStrings.join(", ")}>`;
        }
        return name;
      }

      if (typeNode.type === "TSVoidKeyword") return "void";
      if (typeNode.type === "TSAnyKeyword") return "any";
      if (typeNode.type === "TSNeverKeyword") return "never";

      return typeNode.type;
    }

    return {
      MethodDefinition(node) {
        // executeメソッドのみ
        if (node.kind !== "method" || node.key?.name !== "execute") {
          return;
        }

        const returnType = node.value?.returnType?.typeAnnotation;

        // 戻り値型が未指定
        if (!returnType) {
          context.report({
            node,
            messageId: "missingReturnType",
          });
          return;
        }

        // Result型を含んでいるかチェック
        if (!containsResultType(returnType)) {
          context.report({
            node,
            messageId: "mustReturnResult",
            data: { returnType: getTypeString(returnType) },
          });
        }
      },
    };
  },
};
