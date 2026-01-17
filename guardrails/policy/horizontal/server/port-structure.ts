/**
 * @what ポートディレクトリ構造の検証（必須ファイルの存在確認）
 * @why 一貫したディレクトリ構造により、ポートの発見とテスタビリティを保証する
 * @failure index.tsに対応するdummy.tsが欠けている場合にエラー
 *
 * @concept ポート構造
 *
 * ```
 * application/port/{port-name}/
 * ├── index.ts      # 必須: インターフェース定義
 * └── dummy.ts      # 必須: テスト用Dummy実装（または *.dummy.ts）
 * ```
 *
 * **1ポート = インターフェース + Dummy実装**
 * - 全てのポートには対応するDummy実装が必須
 * - テスト時の差し替えを容易にする
 *
 * @example-good
 * ```
 * application/port/logger/
 * ├── index.ts    ✅
 * └── dummy.ts    ✅
 *
 * application/port/unit-of-work/
 * ├── index.ts                      ✅
 * └── unit-of-work-runner.dummy.ts  ✅  （*.dummy.ts パターンも許可）
 * ```
 *
 * @example-bad
 * ```
 * application/port/storage-client/
 * └── index.ts    ✅
 * # ❌ 以下が欠けている:
 * # - dummy.ts
 * ```
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { createASTChecker } from "../../ast-checker";

export const policyCheck = createASTChecker({
  // port配下のindex.tsのみをチェック起点とする
  filePattern: /\/application\/port\/[^/]+\/index\.ts$/,

  visitor: (node, ctx) => {
    // SourceFileノードでのみ実行（ファイルレベルチェック）
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;
    const filePath = sourceFile.fileName;

    // テストファイルは除外
    if (filePath.includes(".test.")) return;

    // ディレクトリ情報を取得
    const dir = path.dirname(filePath);
    const portName = path.basename(dir);

    // ディレクトリ内のファイル一覧を取得
    const files = fs.readdirSync(dir);

    // dummy.ts または *.dummy.ts の存在チェック
    const hasDummyTs = files.some(
      (f) => f === "dummy.ts" || f.endsWith(".dummy.ts")
    );

    if (!hasDummyTs) {
      ctx.report(
        node,
        `ポート "${portName}" に対応する Dummy実装 が欠けています:\n` +
          `  - dummy.ts または *.dummy.ts\n` +
          "■ 全てのポートには Dummy実装 を作成してください。\n" +
          "■ Dummy実装はテスト時の差し替えを容易にします。"
      );
    }
  },
});
