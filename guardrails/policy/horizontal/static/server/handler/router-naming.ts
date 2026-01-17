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

import * as ts from 'typescript';
import * as path from 'path';
import { glob } from 'glob';
import createCheck from '../../check-builder';

// ルーター命名パターン: build{Entity}Router
const ROUTER_PATTERN = /^build([A-Z][a-zA-Z]+)Router$/;

// 動的にドメインモデルからエンティティ名を取得
function getEntityNamesFromDomain(workspaceRoot: string): string[] {
  const entityPattern = path.join(workspaceRoot, 'server/src/domain/model/**/*.entity.ts');
  const entityFiles = glob.sync(entityPattern);

  const entityNames: string[] = [];
  for (const file of entityFiles) {
    // ファイル名からエンティティ名を抽出: user.entity.ts -> User
    const basename = path.basename(file, '.entity.ts');
    const entityName = basename.charAt(0).toUpperCase() + basename.slice(1);
    entityNames.push(entityName);
  }

  return entityNames;
}

// キャッシュ（パフォーマンス向上）
let cachedEntityNames: string[] | null = null;

export default createCheck({
  filePattern: /-router\.ts$/,

  visitor: (node, ctx) => {
    // エクスポートされた変数宣言をチェック
    if (!ts.isVariableStatement(node)) return;

    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (!hasExport) return;

    // ワークスペースルートを取得
    const sourceFile = node.getSourceFile();
    const filePath = sourceFile.fileName;
    const workspaceRoot = filePath.split('/server/')[0];

    // エンティティ名を取得（キャッシュ）
    if (!cachedEntityNames) {
      cachedEntityNames = getEntityNamesFromDomain(workspaceRoot);
    }

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Routerを含む名前のみチェック
      if (!varName.includes('Router')) continue;

      // build...Router パターンかチェック
      const match = ROUTER_PATTERN.exec(varName);

      if (!match) {
        ctx.report(
          declaration,
          `ルーター関数 "${varName}" が命名規則に従っていません。\n` +
            `■ build{Entity}Router 形式で命名してください。\n` +
            `■ 例: buildProjectRouter, buildTodoRouter, buildUserRouter`
        );
        continue;
      }

      const entity = match[1];

      // エンティティ名がドメインモデルに存在するかチェック
      if (cachedEntityNames.length > 0 && !cachedEntityNames.includes(entity)) {
        ctx.report(
          declaration,
          `ルーター関数 "${varName}" のエンティティ "${entity}" がドメインモデルに存在しません。\n` +
            `■ 有効なエンティティ: ${cachedEntityNames.join(', ')}\n` +
            `■ ドメインモデル（*.entity.ts）に対応するエンティティを追加してください。`
        );
      }
    }
  },
});
