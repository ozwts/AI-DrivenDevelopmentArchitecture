/**
 * @what ハンドラーディレクトリ構造の検証（必須ファイルの存在確認）
 * @why 1エンティティ = 1ディレクトリの原則を守り、必要なファイルが揃っていることを保証する
 * @failure ハンドラーディレクトリに必須ファイルが欠けている場合にエラー
 *
 * @concept ハンドラー構造
 *
 * ```
 * handler/hono-handler/{entity}/
 * ├── {entity}-router.ts           # 必須: ルーティング定義
 * ├── {entity}-response-mapper.ts  # 必須: レスポンス変換関数
 * └── {action}-{entity}-handler.ts # 任意: 各CRUDハンドラー
 * ```
 *
 * **1エンティティ = 1ディレクトリ = 1ルーター**
 * - ディレクトリ名がエンティティ名となる
 * - エンティティはドメインモデルの集約ルート（リポジトリが存在するエンティティ）に対応
 *
 * @example-good
 * ```
 * handler/hono-handler/todo/
 * ├── todo-router.ts              ✅
 * ├── todo-response-mapper.ts     ✅
 * ├── register-todo-handler.ts
 * ├── get-todo-handler.ts
 * └── update-todo-handler.ts
 * ```
 *
 * @example-bad
 * ```
 * handler/hono-handler/todo/
 * ├── todo-router.ts              ✅
 * # ❌ 以下が欠けている:
 * # - todo-response-mapper.ts
 * ```
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { createASTChecker } from "../../ast-checker";

// 必須ファイルのサフィックス（エンティティ名に続く部分）
const REQUIRED_FILE_SUFFIXES = ["-router.ts", "-response-mapper.ts"];

export const policyCheck = createASTChecker({
  // ルーターファイル（エンティティディレクトリの起点）のみをチェック起点とする
  filePattern: /-router\.ts$/,

  visitor: (node, ctx) => {
    // SourceFileノードでのみ実行（ファイルレベルチェック）
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;
    const filePath = sourceFile.fileName;

    // handler/hono-handler 配下のみを対象
    if (!filePath.includes("/handler/hono-handler/")) return;

    // ディレクトリ名とファイル名を取得
    const dir = path.dirname(filePath);
    const entity = path.basename(dir);
    const routerName = path.basename(filePath, ".ts");

    // エンティティディレクトリのルーターのみチェック（ディレクトリ名と一致するルーター）
    // 例: todo/ の中の todo-router.ts のみチェック
    if (routerName !== `${entity}-router`) return;

    // ディレクトリ内のファイル一覧を取得
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch {
      // ディレクトリ読み取りエラーは無視
      return;
    }

    // 必須ファイルの存在チェック
    const missingFiles: string[] = [];
    for (const suffix of REQUIRED_FILE_SUFFIXES) {
      const expectedFile = `${entity}${suffix}`;
      if (!files.includes(expectedFile)) {
        missingFiles.push(expectedFile);
      }
    }

    // 不足ファイルがあればエラー報告
    if (missingFiles.length > 0) {
      const missingList = missingFiles.map((f) => `  - ${f}`).join("\n");
      ctx.report(
        node,
        `ハンドラーディレクトリ "${entity}" に必須ファイルが不足しています:\n${missingList}\n` +
          "■ 1エンティティ = 1ディレクトリの原則に従い、上記ファイルを作成してください。"
      );
    }
  },
});
