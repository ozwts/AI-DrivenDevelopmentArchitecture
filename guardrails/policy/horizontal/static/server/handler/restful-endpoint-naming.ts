/**
 * @what RESTfulエンドポイント命名規則チェック
 * @why 一貫したAPI設計によりユーザビリティを向上させるため
 * @failure RESTful設計に従っていないエンドポイント定義がある場合にエラー
 *
 * @concept RESTfulエンドポイント命名規則
 *
 * **エンドポイント設計:**
 *
 * | HTTPメソッド | パス              | 説明       |
 * | ------------ | ----------------- | ---------- |
 * | POST         | /{entities}       | 作成       |
 * | GET          | /{entities}       | リスト取得 |
 * | GET          | /{entities}/:id   | 単一取得   |
 * | PUT/PATCH    | /{entities}/:id   | 更新       |
 * | DELETE       | /{entities}/:id   | 削除       |
 *
 * **パスパラメータ命名:**
 * - 単数形 + Id: `:projectId`, `:todoId`, `:userId`
 *
 * **Current Userパターン:**
 * - `/users/me` を `/users/:userId` より先に定義
 *
 * @example-good
 * ```typescript
 * router.post("/projects", createProjectHandler);
 * router.get("/projects", listProjectsHandler);
 * router.get("/projects/:projectId", getProjectHandler);
 * router.put("/projects/:projectId", updateProjectHandler);
 * router.delete("/projects/:projectId", deleteProjectHandler);
 *
 * // Current Userを先に定義
 * router.post("/users/me", registerCurrentUserHandler);
 * router.get("/users/me", getCurrentUserHandler);
 * router.get("/users/:userId", getUserHandler);
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ 動詞を含む
 * router.post("/create-project", createProjectHandler);
 *
 * // ❌ 単数形
 * router.get("/project", listProjectsHandler);
 *
 * // ❌ パラメータ名が不適切
 * router.get("/projects/:id", getProjectHandler);  // :projectId が正しい
 *
 * // ❌ Current Userの定義順序ミス
 * router.get("/users/:userId", getUserHandler);   // 先
 * router.get("/users/me", getCurrentUserHandler); // ❌ :userId に me がマッチ
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../../ast-checker";

// 動詞を含むパスパターン（禁止）
const VERB_PATTERNS = [
  /^\/(create|make|add|new)-/,
  /^\/(get|fetch|retrieve)-/,
  /^\/(update|edit|modify)-/,
  /^\/(delete|remove|destroy)-/,
];

export const policyCheck = createASTChecker({
  filePattern: /-router\.ts$/,

  visitor: (node, ctx) => {
    // router.post("/path", handler) の形式をチェック
    if (!ts.isCallExpression(node)) return;

    const {expression} = node;
    if (!ts.isPropertyAccessExpression(expression)) return;

    const methodName = expression.name.text;
    if (!["get", "post", "put", "patch", "delete"].includes(methodName)) return;

    // 第一引数（パス）を取得
    const args = node.arguments;
    if (args.length === 0) return;

    const pathArg = args[0];
    if (!ts.isStringLiteral(pathArg)) return;

    const path = pathArg.text;

    // 1. 動詞を含むパスをチェック
    for (const pattern of VERB_PATTERNS) {
      if (pattern.test(path)) {
        ctx.report(
          node,
          `エンドポイント "${path}" に動詞が含まれています。\n` +
            "■ RESTful設計では動詞をパスに含めません。\n" +
            "■ HTTPメソッドで操作を表現してください。\n" +
            "■ 例: POST /projects（create-projectではない）"
        );
      }
    }

    // 2. パスパラメータ命名をチェック
    const paramMatches = path.match(/:(\w+)/g);
    if (paramMatches !== null) {
      for (const param of paramMatches) {
        const paramName = param.slice(1); // ':' を除去

        // 'id' 単独は避けるべき
        if (paramName === "id") {
          ctx.report(
            node,
            `エンドポイント "${path}" のパラメータ ":id" は曖昧です。\n` +
              "■ :projectId, :todoId のように{entity}Idの形式にしてください。\n" +
              "■ パラメータ名から何のIDか明確にわかるようにします。"
          );
        }

        // Id で終わらない場合は警告
        if (!paramName.endsWith("Id") && paramName !== "id") {
          ctx.report(
            node,
            `エンドポイント "${path}" のパラメータ ":${paramName}" が命名規則に従っていません。\n` +
              "■ パスパラメータは {entity}Id の形式にしてください。\n" +
              "■ 例: :projectId, :todoId, :attachmentId"
          );
        }
      }
    }

    // 3. 単数形パスをチェック（リソースコレクション）
    const pathParts = path.split("/").filter((p) => p !== "" && !p.startsWith(":"));
    for (const part of pathParts) {
      // 一般的な単数形パターン（複数形でないもの）
      if (part !== "me" && !part.endsWith("s") && !part.includes("-")) {
        // 例外: download-url, prepare 等のアクションパス
        if (!["download", "prepare", "complete", "upload"].includes(part)) {
          ctx.report(
            node,
            `エンドポイント "${path}" のパス "${part}" が単数形です。\n` +
              "■ リソースコレクションは複数形で命名してください。\n" +
              "■ 例: /projects, /todos, /users"
          );
        }
      }
    }
  },
});
