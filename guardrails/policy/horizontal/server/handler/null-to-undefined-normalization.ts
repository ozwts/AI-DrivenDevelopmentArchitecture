/**
 * @what Update系ハンドラーでのnull→undefined変換チェック
 * @why UseCaseにnullを持ち込ませず、3値（未指定/クリア/値）を適切に区別するため
 * @failure Update系ハンドラーでnullを直接UseCaseに渡している場合にエラー
 *
 * @concept PATCH処理における3値の区別
 *
 * PATCH（更新）リクエストでは、以下の3つの状態を区別する必要がある：
 *
 * | JSON状態         | Handler処理                  | UseCase側での判定                |
 * | ---------------- | ---------------------------- | -------------------------------- |
 * | キー未指定       | プロパティを渡さない         | `"field" in input === false`     |
 * | `null` 送信      | `undefined` を渡す           | `input.field === undefined`      |
 * | 値送信           | その値を渡す                 | `input.field === 値`             |
 *
 * **変換パターン:**
 *
 * ```typescript
 * // 3値を区別するため、条件付きでプロパティを追加
 * const result = await useCase.execute({
 *   todoId,
 *   // キー未指定 or null → undefinedに正規化
 *   ...("description" in body && {
 *     description: body.description === null ? undefined : body.description,
 *   }),
 *   // 必須フィールドは直接渡す
 *   title: body.title,
 * });
 * ```
 *
 * @example-good
 * ```typescript
 * // nullをundefinedに変換
 * ...("description" in body && {
 *   description: body.description === null ? undefined : body.description,
 * }),
 *
 * // nullableフィールドの条件付き追加
 * ...("projectId" in body && {
 *   projectId: body.projectId === null ? undefined : body.projectId,
 * }),
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ nullを直接UseCaseに渡す
 * const result = await useCase.execute({
 *   description: body.description,  // nullがそのまま渡る
 * });
 *
 * // ❌ 3値の区別なしに渡す
 * description: body.description ?? undefined,  // キー未指定とnull送信を区別できない
 * ```
 */

import * as ts from "typescript";
import * as path from "path";
import { createASTChecker } from "../../../ast-checker";

// Zodスキーマからnullableフィールドを動的に取得
const getNullableFieldsFromZodSchemas = (workspaceRoot: string): Map<string, string[]> => {
  const result = new Map<string, string[]>();

  try {
    // 生成されたZodスキーマをrequireして直接解析
    const schemaPath = path.join(workspaceRoot, "server/src/generated/zod-schemas");
    // eslint-disable-next-line @typescript-eslint/no-require-imports, import/no-dynamic-require, global-require
    const { schemas } = require(schemaPath);

    // *Params スキーマを探す
    for (const [schemaName, schema] of Object.entries(schemas)) {
      if (!schemaName.endsWith("Params")) continue;

      // Zodスキーマの shape を取得
      const zodSchema = schema as { shape?: Record<string, { _def?: { typeName?: string } }> };
      const {shape} = zodSchema;
      if (shape === undefined) continue;

      const nullableFields: string[] = [];

      for (const [fieldName, fieldSchema] of Object.entries(shape)) {
        // ZodNullable かチェック（_def.typeName）
        // eslint-disable-next-line no-underscore-dangle
        const typeName = fieldSchema?._def?.typeName;
        if (typeName === "ZodNullable") {
          nullableFields.push(fieldName);
        }
      }

      if (nullableFields.length > 0) {
        // スキーマ名をキーとして保存（例: UpdateTodoParams, RegisterTodoParams）
        result.set(schemaName, nullableFields);
      }
    }
  } catch {
    // スキーマが見つからない場合は空を返す
    return new Map();
  }

  return result;
}

// キャッシュ
let cachedNullableFields: Map<string, string[]> | null = null;

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

    // Zodスキーマからnullableフィールドを取得（キャッシュ）
    if (cachedNullableFields === null) {
      cachedNullableFields = getNullableFieldsFromZodSchemas(workspaceRoot);
    }

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

      // useCase.execute の呼び出しを検出
      if (!/useCase\.execute\s*\(/.test(functionText)) continue;

      // ハンドラー内で使用されている schemas.XXXParams を検出
      const schemaMatch = functionText.match(/schemas\.(\w+Params)\.safeParse/);
      if (schemaMatch === null) continue;

      const schemaName = schemaMatch[1];

      // このスキーマのnullableフィールドを取得
      const nullableFields = cachedNullableFields.get(schemaName) ?? [];
      if (nullableFields.length === 0) continue;

      // nullableフィールドがそのまま渡されていないかチェック
      for (const field of nullableFields) {
        // 正しいパターン: body.field === null ? undefined : body.field
        const correctNullCheckPattern = new RegExp(
          `body\\.${field}\\s*===\\s*null\\s*\\?\\s*undefined\\s*:\\s*body\\.${field}`
        );

        // 正しいパターン: "field" in body &&
        const correctInCheckPattern = new RegExp(
          `["']${field}["']\\s+in\\s+body\\s*&&`
        );

        // 正しいパターンが既にあればスキップ
        const hasCorrectNullCheck = correctNullCheckPattern.test(functionText);
        const hasCorrectInCheck = correctInCheckPattern.test(functionText);
        if (hasCorrectNullCheck && hasCorrectInCheck) continue;

        // Bad Pattern 1: body.field を直接渡す（例: description: body.description,）
        const directPassPattern = new RegExp(
          `${field}\\s*:\\s*body\\.${field}\\s*[,}]`
        );

        // Bad Pattern 2: ?? undefined で3値区別なし（例: description: body.description ?? undefined,）
        const nullishCoalescingPattern = new RegExp(
          `${field}\\s*:\\s*body\\.${field}\\s*\\?\\?\\s*undefined`
        );

        // Bad Pattern 3: || undefined で3値区別なし（例: description: body.description || undefined,）
        const orUndefinedPattern = new RegExp(
          `${field}\\s*:\\s*body\\.${field}\\s*\\|\\|\\s*undefined`
        );

        const hasDirectPass = directPassPattern.test(functionText);
        const hasNullishCoalescing = nullishCoalescingPattern.test(functionText);
        const hasOrUndefined = orUndefinedPattern.test(functionText);

        if (hasDirectPass && !hasCorrectNullCheck && !hasCorrectInCheck) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" で nullable フィールド "${field}" が直接渡されています。\n` +
              `■ ${schemaName} の nullableフィールド: ${nullableFields.join(", ")}\n` +
              `■ null を undefined に変換してください: body.${field} === null ? undefined : body.${field}\n` +
              `■ 3値を区別するため "in" チェックも推奨: ...("${field}" in body && { ${field}: ... })`
          );
        }

        if (hasNullishCoalescing || hasOrUndefined) {
          ctx.report(
            declaration,
            `ハンドラー関数 "${varName}" で nullable フィールド "${field}" の3値区別ができていません。\n` +
              `■ body.${field} ?? undefined や body.${field} || undefined は、キー未指定とnull送信を区別できません。\n` +
              `■ 正しいパターン: ...("${field}" in body && { ${field}: body.${field} === null ? undefined : body.${field} })`
          );
        }
      }

      // body.XXX === null パターンがあるが、undefined変換がない場合を検出
      const nullCheckWithoutUndefined =
        /body\.\w+\s*===\s*null\s*[^?]/.test(functionText);
      if (nullCheckWithoutUndefined) {
        ctx.report(
          declaration,
          `ハンドラー関数 "${varName}" で null チェック後に undefined への変換が不足している可能性があります。\n` +
            "■ パターン: body.field === null ? undefined : body.field を使用してください。"
        );
      }
    }
  },
});
