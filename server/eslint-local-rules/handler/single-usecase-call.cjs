/**
 * 単一ユースケース呼び出しルール
 *
 * hono-handler/ 内のハンドラーファイルで:
 * - useCase.execute() の呼び出しは1回のみ許可
 * - 複数のユースケース呼び出しは禁止
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Handlers must call only one UseCase.execute()",
      category: "Handler Layer",
      recommended: true,
    },
    schema: [],
    messages: {
      multipleUseCaseCalls:
        "ハンドラー内で複数のユースケース（execute）を呼び出すことは禁止されています。単一のUseCaseに統合してください。参照: handler/21-http-handler-implementation.md",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // hono-handler/ 内の *-handler.ts ファイルのみ対象
    if (!filename.includes("/hono-handler/")) {
      return {};
    }

    if (!filename.endsWith("-handler.ts")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // 各関数スコープでexecute呼び出しを追跡
    const functionScopes = [];

    /**
     * execute() 呼び出しかどうか判定
     */
    const isExecuteCall = (node) => {
      const callee = node.callee;

      // xxx.execute() パターン
      if (callee.type === "MemberExpression") {
        return callee.property?.name === "execute";
      }

      return false;
    };

    /**
     * 現在のスコープを取得
     */
    const getCurrentScope = () => {
      return functionScopes[functionScopes.length - 1];
    };

    return {
      // 関数スコープの開始を追跡
      FunctionDeclaration() {
        functionScopes.push({ executeCalls: [] });
      },
      FunctionExpression() {
        functionScopes.push({ executeCalls: [] });
      },
      ArrowFunctionExpression() {
        functionScopes.push({ executeCalls: [] });
      },

      // 関数スコープの終了時にチェック
      "FunctionDeclaration:exit"() {
        const scope = functionScopes.pop();
        if (scope && scope.executeCalls.length > 1) {
          // 2回目以降の呼び出しにエラーを報告
          for (let i = 1; i < scope.executeCalls.length; i++) {
            context.report({
              node: scope.executeCalls[i],
              messageId: "multipleUseCaseCalls",
            });
          }
        }
      },
      "FunctionExpression:exit"() {
        const scope = functionScopes.pop();
        if (scope && scope.executeCalls.length > 1) {
          for (let i = 1; i < scope.executeCalls.length; i++) {
            context.report({
              node: scope.executeCalls[i],
              messageId: "multipleUseCaseCalls",
            });
          }
        }
      },
      "ArrowFunctionExpression:exit"() {
        const scope = functionScopes.pop();
        if (scope && scope.executeCalls.length > 1) {
          for (let i = 1; i < scope.executeCalls.length; i++) {
            context.report({
              node: scope.executeCalls[i],
              messageId: "multipleUseCaseCalls",
            });
          }
        }
      },

      // execute() 呼び出しを収集
      CallExpression(node) {
        if (!isExecuteCall(node)) return;

        const scope = getCurrentScope();
        if (scope) {
          scope.executeCalls.push(node);
        }
      },
    };
  },
};
