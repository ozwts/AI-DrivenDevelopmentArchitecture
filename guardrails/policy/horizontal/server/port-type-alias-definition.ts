/**
 * @what ポートのインターフェース定義にtypeエイリアスを使用しているか検証
 * @why typeエイリアスで統一することで、一貫性と宣言的マージの防止を実現するため
 * @failure interface宣言を検出した場合に警告
 *
 * @concept typeエイリアスによるインターフェース定義
 *
 * ポート層では、`interface`ではなく`type`エイリアスでインターフェースを定義する。
 *
 * **理由:**
 * - **一貫性**: プロジェクト全体でtypeエイリアスに統一
 * - **宣言的マージの防止**: interfaceの拡張による予期せぬ変更を防止
 * - **明示性**: オブジェクト型であることが明確
 *
 * @example-good
 * ```typescript
 * // ✅ Good: typeエイリアスで定義
 * export type Logger = {
 *   debug(message: string, data?: AdditionalData): void;
 *   info(message: string, data?: AdditionalData): void;
 *   warn(message: string, data?: AdditionalData): void;
 *   error(message: string, data?: AdditionalData): void;
 * };
 *
 * export type FetchNow = () => Date;
 *
 * export type StorageClient = {
 *   generatePresignedUploadUrl(props: { key: string }): Promise<Result<string, UnexpectedError>>;
 * };
 * ```
 *
 * @example-bad
 * ```typescript
 * // ❌ Bad: interfaceで定義
 * export interface Logger {
 *   debug(message: string, data?: AdditionalData): void;
 *   info(message: string, data?: AdditionalData): void;
 * }
 *
 * export interface StorageClient {
 *   generatePresignedUploadUrl(props: { key: string }): Promise<Result<string, UnexpectedError>>;
 * }
 * ```
 */

import * as ts from "typescript";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\/port\/[^/]+\/index\.ts$/,

  visitor: (node, ctx) => {
    const { fileName } = ctx.sourceFile;

    // テストファイル、ダミーファイルは除外
    if (fileName.includes(".test.") || fileName.includes(".dummy.") || fileName.includes("dummy.ts")) {
      return;
    }

    // InterfaceDeclarationを検出
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text;

      ctx.report(
        node,
        `ポート層でinterface宣言を使用しています: "${interfaceName}"\n` +
          `■ ❌ Bad: export interface ${interfaceName} { ... }\n` +
          `■ ✅ Good: export type ${interfaceName} = { ... }\n` +
          "■ 理由: typeエイリアスで統一し、宣言的マージを防止します。"
      );
    }
  },
});
