/**
 * @what OpenAPI仕様のルートが実装されているか照合
 * @why 仕様と実装がズレるとクライアントが404になるため
 * @failure 未実装ルートがある場合にエラー
 *
 * @concept OpenAPI仕様と実装の整合性
 *
 * **整合性の担保:**
 *
 * | チェック方向 | 検出 | 問題 |
 * |-------------|------|------|
 * | 仕様 → 実装 | 未実装ルート | クライアントが404エラー |
 * | 実装 → 仕様 | 未定義ルート | APIドキュメントと不一致 |
 *
 * **対象ファイル:**
 * - 仕様: `contracts/api/todo-app.openapi.yaml`
 * - 実装: `server/src/handler/hono-handler/{entity}/{entity}-router.ts`
 *
 * @example-good
 * ```typescript
 * // OpenAPI: GET /todos, POST /todos, GET /todos/{todoId}
 * // 実装:
 * todoRouter.get("/", handler);           // ✅ GET /todos
 * todoRouter.post("/", handler);          // ✅ POST /todos
 * todoRouter.get("/:todoId", handler);    // ✅ GET /todos/{todoId}
 * ```
 *
 * @example-bad
 * ```typescript
 * // OpenAPI: GET /todos, POST /todos, GET /todos/{todoId}, PATCH /todos/{todoId}
 * // 実装:
 * todoRouter.get("/", handler);           // ✅ GET /todos
 * todoRouter.post("/", handler);          // ✅ POST /todos
 * todoRouter.get("/:todoId", handler);    // ✅ GET /todos/{todoId}
 * // ❌ PATCH /todos/{todoId} が未実装
 * ```
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import createCheck from '../../../horizontal/static/check-builder';

// OpenAPIドキュメントの型定義
interface OpenAPIDocument {
  paths: Record<string, Record<string, unknown>>;
}

// ルート情報
interface RouteInfo {
  method: string;
  path: string;
}

// キャッシュ
let cachedOpenAPIRoutes: Map<string, RouteInfo> | null = null;

/**
 * OpenAPI仕様からルート一覧を抽出
 */
function getOpenAPIRoutes(workspaceRoot: string): Map<string, RouteInfo> {
  if (cachedOpenAPIRoutes) {
    return cachedOpenAPIRoutes;
  }

  const routes = new Map<string, RouteInfo>();
  const specPath = path.join(workspaceRoot, 'contracts/api/todo-app.openapi.yaml');

  try {
    const content = fs.readFileSync(specPath, 'utf8');
    const document = yaml.load(content) as OpenAPIDocument;

    if (!document.paths) {
      return routes;
    }

    for (const [pathUrl, methods] of Object.entries(document.paths)) {
      if (!methods || typeof methods !== 'object') continue;

      for (const method of Object.keys(methods)) {
        // OpenAPI仕様のメタ情報はスキップ
        if (method === 'parameters' || method === '$ref' || method === 'summary') {
          continue;
        }

        const normalizedMethod = method.toUpperCase();
        const routeKey = `${normalizedMethod} ${pathUrl}`;
        routes.set(routeKey, { method: normalizedMethod, path: pathUrl });
      }
    }

    cachedOpenAPIRoutes = routes;
  } catch {
    // ファイルが見つからない場合は空を返す
  }

  return routes;
}

/**
 * OpenAPIパスパラメータ形式をHono形式に変換
 * /todos/{todoId} → /todos/:todoId
 */
function convertToHonoPath(openApiPath: string): string {
  return openApiPath.replace(/\{([^}]+)\}/g, ':$1');
}

/**
 * Honoパスパラメータ形式をOpenAPI形式に変換
 * /todos/:todoId → /todos/{todoId}
 */
function convertToOpenAPIPath(honoPath: string): string {
  return honoPath.replace(/:([^/]+)/g, '{$1}');
}

/**
 * ルーターのベースパスを推測
 * todo-router.ts → /todos
 */
function inferBasePath(filePath: string): string | null {
  const fileName = path.basename(filePath);
  const match = fileName.match(/^(\w+)-router\.ts$/);

  if (!match) return null;

  const entityName = match[1];

  // 複数形に変換
  if (entityName.endsWith('y')) {
    return `/${entityName.slice(0, -1)}ies`;
  }
  return `/${entityName}s`;
}

export default createCheck({
  filePattern: /-router\.ts$/,

  visitor: (node, ctx) => {
    // ソースファイルノードでのみ実行
    if (!ts.isSourceFile(node)) return;

    const filePath = node.fileName;

    // hono-handler配下のみ
    if (!filePath.includes('/hono-handler/')) return;

    const workspaceRoot = filePath.split('/server/')[0];
    const openAPIRoutes = getOpenAPIRoutes(workspaceRoot);

    if (openAPIRoutes.size === 0) {
      return; // OpenAPI仕様が見つからない場合はスキップ
    }

    // ルーターのベースパスを推測
    const basePath = inferBasePath(filePath);
    if (!basePath) return;

    // ファイル内容を取得
    const sourceText = node.getText();

    // 実装されているルートを収集
    const implementedRoutes = new Map<string, RouteInfo>();

    // Honoのルート定義パターンを検出
    // router.get("/path", handler) 形式
    const routePattern =
      /\.\s*(get|post|put|patch|delete)\s*\(\s*["']([^"']+)["']\s*,/gi;
    let match;

    while ((match = routePattern.exec(sourceText)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];

      // ベースパスと結合してフルパスを構築
      let fullPath: string;
      if (routePath === '/') {
        fullPath = basePath;
      } else {
        fullPath = basePath + routePath;
      }

      // OpenAPI形式に変換
      const openAPIPath = convertToOpenAPIPath(fullPath);
      const routeKey = `${method} ${openAPIPath}`;
      implementedRoutes.set(routeKey, { method, path: openAPIPath });
    }

    // このルーターに関係するOpenAPIルートをフィルタリング
    const relatedOpenAPIRoutes = new Map<string, RouteInfo>();
    for (const [key, route] of openAPIRoutes) {
      if (route.path.startsWith(basePath)) {
        relatedOpenAPIRoutes.set(key, route);
      }
    }

    // OpenAPI仕様にあるが実装にないルートを検出
    const missingImplementations: RouteInfo[] = [];
    for (const [key, route] of relatedOpenAPIRoutes) {
      if (!implementedRoutes.has(key)) {
        missingImplementations.push(route);
      }
    }

    // 実装にあるがOpenAPI仕様にないルートを検出
    const undocumentedRoutes: RouteInfo[] = [];
    for (const [key, route] of implementedRoutes) {
      if (!openAPIRoutes.has(key)) {
        undocumentedRoutes.push(route);
      }
    }

    // 違反を報告
    if (missingImplementations.length > 0) {
      const routeList = missingImplementations
        .map((r) => `  - ${r.method} ${r.path}`)
        .join('\n');

      ctx.report(
        node,
        `ルーター "${path.basename(filePath)}" でOpenAPI仕様に定義されているルートが未実装です。\n` +
          `■ 未実装ルート:\n${routeList}\n` +
          `■ OpenAPI仕様に対応するハンドラーを実装してください。`
      );
    }

    if (undocumentedRoutes.length > 0) {
      const routeList = undocumentedRoutes
        .map((r) => `  - ${r.method} ${r.path}`)
        .join('\n');

      ctx.report(
        node,
        `ルーター "${path.basename(filePath)}" でOpenAPI仕様に定義されていないルートが実装されています。\n` +
          `■ 未定義ルート:\n${routeList}\n` +
          `■ OpenAPI仕様を更新するか、不要な実装を削除してください。`,
        'warning'
      );
    }
  },
});
