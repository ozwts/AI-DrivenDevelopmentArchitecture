/**
 * リポジトリメソッドのPropsパターン必須ルール
 *
 * リポジトリメソッドの引数はPropsオブジェクト形式を使用する。
 * findById(id: string) ではなく findById(props: { id: string }) とする。
 *
 * 参照: guardrails/policy/server/domain-model/30-repository-interface-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Enforce Props pattern for repository method arguments",
      category: "Repository",
      recommended: true,
    },
    schema: [],
    messages: {
      usePropsPattern:
        "リポジトリメソッド '{{ name }}' は Props パターンを使用してください。例: findById(id: string) → findById(props: { id: string })",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // リポジトリインターフェースファイルのみ対象
    if (!filename.endsWith("-repository.ts")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // infrastructure層のリポジトリ実装は除外
    if (filename.includes("/infrastructure/")) {
      return {};
    }

    // ID生成メソッド（引数なし）は除外
    const idGeneratorMethods = ["todoId", "userId", "projectId", "attachmentId"];

    return {
      // 型定義内のメソッドシグネチャをチェック
      TSPropertySignature(node) {
        // メソッド型の検出
        if (node.typeAnnotation?.typeAnnotation?.type !== "TSFunctionType") {
          return;
        }

        const methodName = node.key?.name;
        if (!methodName) {
          return;
        }

        // ID生成メソッドは除外
        if (
          idGeneratorMethods.includes(methodName) ||
          methodName.endsWith("Id")
        ) {
          return;
        }

        const funcType = node.typeAnnotation.typeAnnotation;
        const params = funcType.parameters || [];

        // 引数が1つ以上あり、propsという名前でない場合
        if (params.length > 0) {
          const firstParam = params[0];
          const paramName = firstParam.name;

          if (paramName !== "props") {
            context.report({
              node: firstParam,
              messageId: "usePropsPattern",
              data: { name: methodName },
            });
          }
        }
      },
    };
  },
};
