/**
 * @what ハンドラー関数の命名規則チェック
 * @why 一貫した命名規則によりコードの可読性と予測可能性を高めるため
 * @failure build{Action}{Entity}Handler形式でない関数をエクスポートしている場合にエラー
 *
 * @concept ハンドラー関数の命名規則
 *
 * ハンドラー関数は `build{Action}{Entity}Handler` 形式で命名する。
 * Actionは複数語（PascalCase）も許可される。
 *
 * | HTTPメソッド      | Action           | 例                                                      |
 * | ----------------- | ---------------- | ------------------------------------------------------- |
 * | POST（作成）      | Create, Register | `buildCreateProjectHandler`, `buildRegisterTodoHandler` |
 * | GET（単一取得）   | Get              | `buildGetProjectHandler`, `buildGetTodoHandler`         |
 * | GET（リスト取得） | List             | `buildListProjectsHandler`, `buildListTodosHandler`     |
 * | PATCH（更新）     | Update           | `buildUpdateProjectHandler`, `buildUpdateTodoHandler`   |
 * | DELETE            | Delete           | `buildDeleteProjectHandler`, `buildDeleteTodoHandler`   |
 * | その他            | 複数語も可       | `buildSemanticSearchProjectHandler`                     |
 *
 * **ファイル名との整合性:**
 * - `build{Action}{Entity}Handler` → `{action}-{entity}-handler.ts`
 * - 例: `buildCreateProjectHandler` → `create-project-handler.ts`
 * - 例: `buildSemanticSearchProjectHandler` → `semantic-search-project-handler.ts`
 *
 * @example-good
 * ```typescript
 * // create-project-handler.ts
 * export const buildCreateProjectHandler = ({ container }) => async (c) => { ... };
 *
 * // get-project-handler.ts
 * export const buildGetProjectHandler = ({ container }) => async (c) => { ... };
 *
 * // semantic-search-project-handler.ts
 * export const buildSemanticSearchProjectHandler = ({ container }) => async (c) => { ... };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ buildプレフィックスがない
 * export const createProjectHandler = ({ container }) => async (c) => { ... };
 * // ❌ Handlerサフィックスがない
 * export const buildCreateProject = ({ container }) => async (c) => { ... };
 * // ❌ ファイル名と不一致（create-project-handler.ts に buildUpdateProjectHandler）
 * export const buildUpdateProjectHandler = ({ container }) => async (c) => { ... };
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { glob } from "glob";
import { createASTChecker } from "../../../../ast-checker";

// ハンドラー命名パターン: build{何か}Handler（Actionとエンティティは後で分離）
const HANDLER_PATTERN = /^build([A-Z][a-zA-Z]+(?:[A-Z][a-zA-Z]+)*)Handler$/;

// 動的にドメインモデルからエンティティ名を取得
const getEntityNamesFromDomain = (workspaceRoot: string): string[] => {
  const entityPattern = path.join(workspaceRoot, "server/src/domain/model/**/*.entity.ts");
  const entityFiles = glob.sync(entityPattern);

  const entityNames: string[] = [];
  for (const file of entityFiles) {
    // ファイル名からエンティティ名を抽出: user.entity.ts -> User
    const basename = path.basename(file, ".entity.ts");
    const entityName = basename.charAt(0).toUpperCase() + basename.slice(1);
    entityNames.push(entityName);
  }

  // 複数形も追加（リスト取得用）: User -> Users
  const pluralNames = entityNames.map((name) => {
    if (name.endsWith("y")) {
      return `${name.slice(0, -1)  }ies`; // Category -> Categories
    }
    return `${name  }s`; // User -> Users
  });

  return [...entityNames, ...pluralNames];
}

// PascalCase を kebab-case に変換
const toKebabCase = (str: string): string =>
  str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");

// キャッシュ（パフォーマンス向上）
let cachedEntityNames: string[] | null = null;

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

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

    // エンティティ名を取得（キャッシュ）
    if (cachedEntityNames === null) {
      cachedEntityNames = getEntityNamesFromDomain(workspaceRoot);
    }

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Handlerで終わる名前のみチェック
      if (!varName.includes("Handler")) continue;

      // build...Handler パターンかチェック
      const match = HANDLER_PATTERN.exec(varName);

      if (match === null) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" が命名規則に従っていません。\n` +
            "■ build{Action}{Entity}Handler 形式で命名してください。\n" +
            "■ 例: buildCreateProjectHandler, buildGetTodoHandler, buildSemanticSearchProjectHandler"
        );
        continue;
      }

      const actionAndEntity = match[1]; // 例: "GetProject", "SemanticSearchProject", "ListProjects"

      // エンティティ名リストから末尾が一致するものを探す（長い方から試す）
      const sortedEntityNames = [...cachedEntityNames].sort((a, b) => b.length - a.length);
      const entity = sortedEntityNames.find((name) => actionAndEntity.endsWith(name));

      if (entity === undefined) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" のエンティティが特定できません。\n` +
            `■ 有効なエンティティ: ${cachedEntityNames.filter((n) => !n.endsWith("s") || n.endsWith("ss")).join(", ")}\n` +
            "■ build{Action}{Entity}Handler 形式で命名してください。"
        );
        continue;
      }

      // Actionを逆算
      const action = actionAndEntity.slice(0, -entity.length);

      if (action.length === 0) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" にActionがありません。\n` +
            "■ build{Action}{Entity}Handler 形式で命名してください。\n" +
            "■ 例: buildCreateProjectHandler, buildGetTodoHandler"
        );
        continue;
      }

      // ファイル名との整合性チェック
      const fileName = path.basename(filePath);
      const expectedFileName = `${toKebabCase(action)}-${toKebabCase(entity)}-handler.ts`;

      if (fileName !== expectedFileName) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" とファイル名 "${fileName}" が不一致です。\n` +
            `■ 期待されるファイル名: ${expectedFileName}\n` +
            `■ または、期待されるハンドラー名: build${action}${entity}Handler`
        );
      }
    }
  },
});
