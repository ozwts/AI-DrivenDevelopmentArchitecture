/**
 * @what ハンドラーでのレスポンスマッパー使用チェック
 * @why ドメインエンティティをAPIレスポンス形式に変換する責務を分離するため
 * @failure ハンドラー内でレスポンス変換関数を使用していない場合にエラー
 *
 * @concept レスポンス変換パターン
 *
 * **変換関数はプレゼンテーション層の関心事のみを扱う**
 *
 * - **実施すること**: OpenAPIレスポンススキーマに合わせた変換
 * - **実施しないこと**: ビジネスロジック・ドメインルールの実装
 *
 * **命名規則:**
 * ```typescript
 * convertTo{Entity}Response(entity: {Entity}): {Entity}Response
 * ```
 *
 * **ファイル配置:**
 * ```
 * hono-handler/
 * └── {entity}/
 *     ├── {entity}-router.ts
 *     ├── {action}-{entity}-handler.ts
 *     └── {entity}-response-mapper.ts  # レスポンス変換関数を配置
 * ```
 *
 * @example-good
 * ```typescript
 * export const buildGetProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const result = await useCase.execute({ projectId });
 *
 *     // レスポンス変換関数を使用
 *     const responseData = convertToProjectResponse(result.data);
 *
 *     return c.json(responseData, 200);
 *   };
 * ```
 *
 * @example-bad
 * ```typescript
 * export const buildGetProjectHandler =
 *   ({ container }: { container: Container }) =>
 *   async (c: AppContext) => {
 *     const result = await useCase.execute({ projectId });
 *
 *     // ❌ ハンドラー内でレスポンスを直接構築
 *     const responseData = {
 *       id: result.data.id,
 *       name: result.data.name,
 *       color: result.data.color.value,
 *       createdAt: result.data.createdAt,
 *     };
 *
 *     return c.json(responseData, 200);
 *   };
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../../ast-checker";

// ハンドラー名からエンティティ名を抽出するパターン
const HANDLER_PATTERN = /^build([A-Z][a-zA-Z]+)([A-Z][a-zA-Z]+)Handler$/;

// 複数形から単数形に変換
const toSingular = (name: string): string => {
  if (name.endsWith("ies")) {
    return `${name.slice(0, -3)  }y`;
  }
  if (name.endsWith("s") && !name.endsWith("ss")) {
    return name.slice(0, -1);
  }
  return name;
};

export const policyCheck = createASTChecker({
  filePattern: /-handler\.ts$/,

  visitor: (node, ctx) => {
    // エクスポートされた変数宣言をチェック
    if (!ts.isVariableStatement(node)) return;

    const hasExport = node.modifiers?.some(
      (mod) => mod.kind === ts.SyntaxKind.ExportKeyword
    );
    if (hasExport !== true) return;

    for (const declaration of node.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name)) continue;

      const varName = declaration.name.text;

      // Handlerで終わる名前のみチェック
      if (!varName.endsWith("Handler")) continue;

      // 初期化子を取得
      const {initializer} = declaration;
      if (initializer === undefined) continue;

      // 関数全体のテキストを取得
      const functionText = initializer.getText();

      // DELETEハンドラーはレスポンスボディがない（204）
      const isDeleteHandler = /^buildDelete/.test(varName);
      if (isDeleteHandler) continue;

      // convertTo...Response 関数の呼び出しがあるかチェック
      const convertToMatch = functionText.match(/convertTo(\w+)Response\s*\(/);
      const hasConvertTo = convertToMatch !== null;

      // c.json() で成功レスポンスを返しているかチェック
      const hasSuccessJsonResponse = /return\s+c\.json\s*\([^,]+,\s*(200|201)\)/.test(functionText);

      // 成功レスポンスがあるのにconvertTo関数がない場合
      if (hasSuccessJsonResponse && !hasConvertTo) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" でレスポンス変換関数が使用されていません。\n` +
            "■ convertTo{Entity}Response() 関数を使用してください。\n" +
            "■ ハンドラー内でレスポンスオブジェクトを直接構築しないでください。"
        );
        continue;
      }

      // ハンドラー名とレスポンスマッパー名の整合性チェック
      if (convertToMatch !== null) {
        const mapperEntity = convertToMatch[1];
        const handlerMatch = HANDLER_PATTERN.exec(varName);

        if (handlerMatch !== null) {
          const handlerEntity = toSingular(handlerMatch[2]);

          // エンティティ名が一致しない場合（大文字小文字を区別しない比較）
          if (mapperEntity.toLowerCase() !== handlerEntity.toLowerCase()) {
            ctx.report(
              declaration,
              `ハンドラー関数 "${varName}" のエンティティと convertTo${mapperEntity}Response のエンティティが不一致です。\n` +
                `■ ハンドラーのエンティティ: ${handlerEntity}\n` +
                `■ マッパーのエンティティ: ${mapperEntity}\n` +
                `■ 期待されるマッパー: convertTo${handlerEntity}Response`
            );
          }
        }
      }
    }
  },
});
