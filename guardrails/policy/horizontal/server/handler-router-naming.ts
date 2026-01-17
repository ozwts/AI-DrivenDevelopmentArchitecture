/**
 * @what ルーター関数の命名規則チェック
 * @why 一貫した命名規則によりコードの可読性と予測可能性を高めるため
 * @failure build{Entity}Router形式でない関数をエクスポートしている場合にエラー
 *
 * @concept ルーター関数の命名規則
 *
 * ルーター関数は `build{Entity}Router` 形式で命名する。
 *
 * **命名規則:**
 * - 関数名: `build{Entity}Router`
 * - ファイル名: `{entity}-router.ts`
 *
 * **例:**
 * - `buildProjectRouter` → `project-router.ts`
 * - `buildTodoRouter` → `todo-router.ts`
 * - `buildUserRouter` → `user-router.ts`
 *
 * @example-good
 * ```typescript
 * // project-router.ts
 * export const buildProjectRouter = ({ container }: { container: Container }): Hono => {
 *   const router = new Hono();
 *   // ...
 *   return router;
 * };
 *
 * // todo-router.ts
 * export const buildTodoRouter = ({ container }: { container: Container }): Hono => {
 *   const router = new Hono();
 *   // ...
 *   return router;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ buildプレフィックスがない
 * export const projectRouter = new Hono();
 *
 * // ❌ Routerサフィックスがない
 * export const buildProject = ({ container }) => { ... };
 *
 * // ❌ 複数形（Routersではなく単数形Router）
 * export const buildProjectRouters = ({ container }) => { ... };
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { glob } from "glob";
import { createASTChecker } from "../../ast-checker";

// ルーター命名パターン: build{Entity}Router
const ROUTER_PATTERN = /^build([A-Z][a-zA-Z]+)Router$/;

// 動的にドメインモデルから集約ルート（リポジトリが存在するエンティティ）を取得
const getAggregateRootsFromDomain = (workspaceRoot: string): string[] => {
  // *.repository.ts ファイルから集約ルートを特定
  const repositoryPattern = path.join(workspaceRoot, "server/src/domain/model/**/*.repository.ts");
  const repositoryFiles = glob.sync(repositoryPattern);

  const aggregateRoots: string[] = [];
  for (const file of repositoryFiles) {
    // ファイル名から集約ルート名を抽出: user.repository.ts -> User
    const basename = path.basename(file, ".repository.ts");
    const aggregateName = basename.charAt(0).toUpperCase() + basename.slice(1);
    aggregateRoots.push(aggregateName);
  }

  return aggregateRoots;
};

// キャッシュ（パフォーマンス向上）
let cachedEntityNames: string[] | null = null;

export const policyCheck = createASTChecker({
  filePattern: /-router\.ts$/,

  visitor: (node, ctx) => {
    // エクスポートされた変数宣言をチェック
    if (!ts.isVariableStatement(node)) return;

    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (hasExport !== true) return;

    // ワークスペースルートを取得
    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;
    const workspaceRoot = filePath.split("/server/")[0];

    // 集約ルート名を取得（キャッシュ）
    if (cachedEntityNames === null) {
      cachedEntityNames = getAggregateRootsFromDomain(workspaceRoot);
    }

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Routerを含む名前のみチェック
      if (!varName.includes("Router")) continue;

      // build...Router パターンかチェック
      const match = ROUTER_PATTERN.exec(varName);

      if (match === null) {
        ctx.report(
          declaration,
          `ルーター関数 "${varName}" が命名規則に従っていません。\n` +
            "■ build{Entity}Router 形式で命名してください。\n" +
            "■ 例: buildProjectRouter, buildTodoRouter, buildUserRouter"
        );
        continue;
      }

      const entity = match[1];

      // 集約ルート（リポジトリが存在するエンティティ）に存在するかチェック
      if (cachedEntityNames.length > 0 && !cachedEntityNames.includes(entity)) {
        ctx.report(
          declaration,
          `ルーター関数 "${varName}" のエンティティ "${entity}" が集約ルートに存在しません。\n` +
            `■ 有効な集約ルート: ${cachedEntityNames.join(", ")}\n` +
            "■ ルーターは集約ルート単位で作成してください（*.repository.ts が存在するエンティティのみ）。"
        );
      }
    }
  },
});
