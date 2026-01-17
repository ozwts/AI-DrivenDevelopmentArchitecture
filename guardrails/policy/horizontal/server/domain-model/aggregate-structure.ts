/**
 * @what アグリゲートディレクトリ構造の検証（必須ファイルの存在確認）
 * @why 1アグリゲート = 1ディレクトリの原則を守り、必要なファイルが揃っていることを保証する
 * @failure アグリゲートディレクトリに必須ファイルが欠けている場合にエラー
 *
 * @concept アグリゲート構造
 *
 * ```
 * domain/model/{aggregate}/
 * ├── {aggregate}.entity.ts           # 必須: 集約ルートEntity
 * ├── {aggregate}.entity.dummy.ts     # 必須: テスト用ダミーファクトリ
 * ├── {aggregate}.entity.small.test.ts # 必須: Entityのユニットテスト
 * ├── {aggregate}.repository.ts       # 必須: リポジトリインターフェース
 * ├── {aggregate}.repository.dummy.ts # 必須: テスト用ダミーリポジトリ
 * ├── {child}.entity.ts               # 任意: 子エンティティ
 * └── {value-object}.vo.ts            # 任意: 値オブジェクト
 * ```
 *
 * **1アグリゲート = 1ディレクトリ = 1リポジトリ**
 * - ディレクトリ名がアグリゲート名となる
 * - 集約ルートEntityはディレクトリ名と一致する
 * - 子エンティティは独自のリポジトリを持たない
 *
 * @example-good
 * ```
 * domain/model/todo/
 * ├── todo.entity.ts              ✅
 * ├── todo.entity.dummy.ts        ✅
 * ├── todo.entity.small.test.ts   ✅
 * ├── todo.repository.ts          ✅
 * ├── todo.repository.dummy.ts    ✅
 * ├── attachment.entity.ts        # 子エンティティ
 * └── todo-status.vo.ts           # 値オブジェクト
 * ```
 *
 * @example-bad
 * ```
 * domain/model/todo/
 * ├── todo.entity.ts              ✅
 * ├── todo.repository.ts          ✅
 * # ❌ 以下が欠けている:
 * # - todo.entity.dummy.ts
 * # - todo.entity.small.test.ts
 * # - todo.repository.dummy.ts
 * ```
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { createASTChecker } from "../../../ast-checker";

// 必須ファイルのサフィックス（アグリゲート名に続く部分）
const REQUIRED_FILE_SUFFIXES = [
  ".entity.ts",
  ".entity.dummy.ts",
  ".entity.small.test.ts",
  ".repository.ts",
  ".repository.dummy.ts",
];

export const policyCheck = createASTChecker({
  // 集約ルートEntity（ディレクトリ名と一致するEntity）のみをチェック起点とする
  filePattern: /\.entity\.ts$/,

  visitor: (node, ctx) => {
    // SourceFileノードでのみ実行（ファイルレベルチェック）
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;
    const filePath = sourceFile.fileName;

    // domain/model 配下のみを対象
    if (!filePath.includes("/domain/model/")) return;

    // テスト・ダミーファイルは除外
    if (filePath.includes(".test.") || filePath.includes(".dummy.")) return;

    // ディレクトリ名とファイル名を取得
    const dir = path.dirname(filePath);
    const aggregate = path.basename(dir);
    const entityName = path.basename(filePath, ".entity.ts");

    // 集約ルートのみチェック（ディレクトリ名と一致するEntityのみ）
    // 子エンティティ（attachment.entity.ts等）は除外
    if (entityName !== aggregate) return;

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
      const expectedFile = `${aggregate}${suffix}`;
      if (!files.includes(expectedFile)) {
        missingFiles.push(expectedFile);
      }
    }

    // 不足ファイルがあればエラー報告
    if (missingFiles.length > 0) {
      const missingList = missingFiles.map((f) => `  - ${f}`).join("\n");
      ctx.report(
        node,
        `アグリゲート "${aggregate}" に必須ファイルが不足しています:\n${missingList}\n` +
          "■ 1アグリゲート = 1ディレクトリの原則に従い、上記ファイルを作成してください。"
      );
    }
  },
});
