/**
 * @what Entity/Value Objectの対応ファイル（テスト・ダミー）存在確認
 * @why テスト駆動開発の担保と、テスト用ダミーファクトリの一貫した提供
 * @failure Entity/VOに対応するテストファイル・ダミーファイルが存在しない場合にエラー
 *
 * @concept 必須ファイル構成
 *
 * | ソースファイル | 必須対応ファイル |
 * |---------------|-----------------|
 * | `{name}.entity.ts` | `{name}.entity.small.test.ts`, `{name}.entity.dummy.ts` |
 * | `{name}.vo.ts` | `{name}.vo.small.test.ts`, `{name}.vo.dummy.ts` |
 *
 * @example-good
 * ```
 * domain/model/todo/
 * ├── todo.entity.ts              # ソース
 * ├── todo.entity.small.test.ts   # ✅ テスト
 * ├── todo.entity.dummy.ts        # ✅ ダミー
 * ├── todo-status.vo.ts           # ソース
 * ├── todo-status.vo.small.test.ts # ✅ テスト
 * └── todo-status.vo.dummy.ts     # ✅ ダミー
 * ```
 *
 * @example-bad
 * ```
 * domain/model/todo/
 * ├── todo.entity.ts              # ソース
 * # ❌ todo.entity.small.test.ts が欠落
 * # ❌ todo.entity.dummy.ts が欠落
 * ```
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  filePattern: /\.(entity|vo)\.ts$/,

  visitor: (node, ctx) => {
    // SourceFileノードでのみ実行
    if (!ts.isSourceFile(node)) return;

    const filePath = node.fileName;

    // domain/model 配下のみ
    if (!filePath.includes("/domain/model/")) return;

    // テスト・ダミー・リポジトリは除外
    if (
      filePath.includes(".test.") ||
      filePath.includes(".dummy.") ||
      filePath.endsWith(".repository.ts")
    ) {
      return;
    }

    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);

    // 拡張子を判定（.entity.ts or .vo.ts）
    let baseName: string;
    let type: string;
    if (fileName.endsWith(".entity.ts")) {
      baseName = fileName.replace(".entity.ts", ".entity");
      type = "Entity";
    } else if (fileName.endsWith(".vo.ts")) {
      baseName = fileName.replace(".vo.ts", ".vo");
      type = "Value Object";
    } else {
      return;
    }

    // 期待されるファイル
    const expectedTestFile = `${baseName}.small.test.ts`;
    const expectedDummyFile = `${baseName}.dummy.ts`;

    // ディレクトリ内のファイルを取得
    let files: string[];
    try {
      files = fs.readdirSync(dir);
    } catch {
      return;
    }

    // テストファイルの存在確認
    if (!files.includes(expectedTestFile)) {
      ctx.report(
        node,
        `${type} "${fileName}" に対応するテストファイル "${expectedTestFile}" が見つかりません。`
      );
    }

    // ダミーファイルの存在確認
    if (!files.includes(expectedDummyFile)) {
      ctx.report(
        node,
        `${type} "${fileName}" に対応するダミーファイル "${expectedDummyFile}" が見つかりません。`
      );
    }
  },
});
