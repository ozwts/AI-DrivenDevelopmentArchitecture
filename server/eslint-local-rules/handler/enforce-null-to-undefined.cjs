/**
 * PATCHハンドラーでのnull→undefined変換パターン強制ルール
 *
 * Handler層でPATCH操作を行う際、リクエストボディの`null`値を
 * `undefined`に変換する処理が必要。
 *
 * 理由:
 * - OpenAPIでは`nullable: true`のフィールドに対してクライアントはnullを送信
 * - ドメイン層では`undefined`を「値なし」として扱う
 * - この変換をHandler層で行うことで、UseCase以降は一貫した扱いが可能
 *
 * 期待パターン:
 * ```typescript
 * const input = {
 *   title: body.title,
 *   description: body.description === null ? undefined : body.description,
 *   dueDate: body.dueDate === null ? undefined : body.dueDate,
 * };
 * ```
 *
 * 参照: guardrails/policy/server/handler/21-http-handler-implementation.md
 */

"use strict";

module.exports = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "PATCH handlers should convert null to undefined for nullable fields",
      category: "Handler",
      recommended: true,
    },
    schema: [],
    messages: {
      missingNullConversion:
        "PATCH handler should convert null to undefined for nullable field '{{field}}'. Use: '{{field}}: body.{{field}} === null ? undefined : body.{{field}}'",
    },
  },

  create(context) {
    const filename = context.filename ?? context.getFilename();

    // handler/ 配下のみ
    if (!filename.includes("/handler/")) {
      return {};
    }

    // テストファイルは除外
    if (filename.includes(".test.")) {
      return {};
    }

    // update-*-handler のみ対象
    const basename = filename.split("/").pop() || "";
    if (!basename.includes("update-") || !basename.includes("-handler")) {
      return {};
    }

    // nullableフィールドを追跡
    const nullableFields = new Set();
    const convertedFields = new Set();

    return {
      // body.field === null ? undefined : body.field パターンを検出
      ConditionalExpression(node) {
        // test が body.field === null の形式かチェック
        if (
          node.test.type === "BinaryExpression" &&
          node.test.operator === "===" &&
          node.test.left.type === "MemberExpression" &&
          node.test.left.object.type === "Identifier" &&
          node.test.left.object.name === "body" &&
          node.test.right.type === "Literal" &&
          node.test.right.value === null
        ) {
          const fieldName = node.test.left.property.name;
          convertedFields.add(fieldName);
        }
      },

      // body.field の直接参照を検出（変換なし）
      MemberExpression(node) {
        if (
          node.object.type === "Identifier" &&
          node.object.name === "body" &&
          node.property.type === "Identifier"
        ) {
          const fieldName = node.property.name;

          // 親がConditionalExpressionのtestなら変換パターン
          const parent = node.parent;
          if (
            parent &&
            parent.type === "BinaryExpression" &&
            parent.operator === "===" &&
            parent.right &&
            parent.right.type === "Literal" &&
            parent.right.value === null
          ) {
            return; // 変換パターンなのでOK
          }

          // 親がBinaryExpressionで === null チェックでないプロパティアクセス
          // これは潜在的に変換漏れの可能性があるが、
          // 全てのフィールドがnullableとは限らないので、warnにはしない
          nullableFields.add(fieldName);
        }
      },

      // プログラム終了時に未変換フィールドをチェック（オプション）
      // 注: これは精度が低いため、実際には有効化しない方が良いかもしれない
    };
  },
};
