/**
 * フォームdirtyFields使用ルール
 *
 * フォームのonSubmitでdirtyFieldsを使用してPATCH更新を最適化する。
 * 変更されたフィールドのみを送信する。
 *
 * 参照: guardrails/policy/web/component/30-form-overview.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description: "Suggest using dirtyFields in form submission",
      category: "Component",
      recommended: true,
    },
    schema: [],
    messages: {
      useDirtyFields:
        "PATCH更新では dirtyFields を使用して変更されたフィールドのみを送信することを検討してください。",
    },
  },

  create(context) {
    const filename = context.getFilename();

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // Form関連ファイルのみ対象
    if (!filename.toLowerCase().includes("form")) {
      return {};
    }

    let hasFormState = false;
    let hasDirtyFields = false;

    return {
      // useForm の formState / dirtyFields を検出
      VariableDeclarator(node) {
        if (node.id?.type === "ObjectPattern") {
          for (const prop of node.id.properties) {
            // トップレベルの formState
            if (prop.key?.name === "formState") {
              hasFormState = true;

              // formState: { errors, dirtyFields } のネストケース
              if (prop.value?.type === "ObjectPattern") {
                const nestedHasDirtyFields = prop.value.properties.some(
                  (nested) => nested.key?.name === "dirtyFields",
                );
                if (nestedHasDirtyFields) {
                  hasDirtyFields = true;
                }
              }
            }

            // トップレベルの dirtyFields（直接取得のケース）
            if (prop.key?.name === "dirtyFields") {
              hasDirtyFields = true;
            }
          }
        }
      },

      // プログラム終了時にチェック
      "Program:exit"() {
        // formStateを使っているがdirtyFieldsを使っていない場合
        if (hasFormState && !hasDirtyFields) {
          // 最初のノードで警告（ファイルレベル）
          const sourceCode = context.getSourceCode();
          const firstToken = sourceCode.getFirstToken(
            context.getSourceCode().ast,
          );
          if (firstToken) {
            context.report({
              loc: firstToken.loc,
              messageId: "useDirtyFields",
            });
          }
        }
      },
    };
  },
};
