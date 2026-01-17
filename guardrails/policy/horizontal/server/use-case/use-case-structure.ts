/**
 * @what UseCaseディレクトリ構造の検証（必須ファイルの存在確認）
 * @why 1UseCase = 本体 + Small Testの原則を守り、必要なファイルが揃っていることを保証する
 * @failure UseCaseファイルに対応するSmall Testが欠けている場合にエラー
 *
 * @concept UseCase構造
 *
 * ```
 * application/use-case/{entity}/
 * ├── {action}-{entity}-use-case.ts              # 必須: UseCase実装
 * └── {action}-{entity}-use-case.small.test.ts   # 必須: Small Test
 * ```
 *
 * **1UseCase = 本体 + Small Test**
 * - 全てのUseCaseには対応するSmall Testが必須
 * - Medium TestはE2Eに近い位置づけで、全UseCaseに必須ではない
 *
 * @example-good
 * ```
 * application/use-case/project/
 * ├── create-project-use-case.ts              ✅
 * ├── create-project-use-case.small.test.ts   ✅
 * ├── get-project-use-case.ts                 ✅
 * └── get-project-use-case.small.test.ts      ✅
 * ```
 *
 * @example-bad
 * ```
 * application/use-case/project/
 * ├── create-project-use-case.ts              ✅
 * # ❌ 以下が欠けている:
 * # - create-project-use-case.small.test.ts
 * ```
 */

import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { createASTChecker } from "../../../ast-checker";

export const policyCheck = createASTChecker({
  // UseCaseファイル（本体）のみをチェック起点とする
  filePattern: /-use-case\.ts$/,

  visitor: (node, ctx) => {
    // SourceFileノードでのみ実行（ファイルレベルチェック）
    if (!ts.isSourceFile(node)) return;

    const sourceFile = node;
    const filePath = sourceFile.fileName;

    // テストファイルは除外
    if (filePath.includes(".test.")) return;

    // application/use-case 配下のみを対象
    if (!filePath.includes("/application/use-case/")) return;

    // ディレクトリとファイル名を取得
    const dir = path.dirname(filePath);
    const baseName = path.basename(filePath, ".ts");

    // Small Testファイルの存在チェック
    const smallTestFile = `${baseName}.small.test.ts`;
    const smallTestPath = path.join(dir, smallTestFile);

    if (!fs.existsSync(smallTestPath)) {
      ctx.report(
        node,
        `UseCase "${baseName}.ts" に対応する Small Test が欠けています:\n` +
          `  - ${smallTestFile}\n` +
          "■ 全てのUseCaseには Small Test を作成してください。\n" +
          "■ Small Test はDummyリポジトリを使用した高速なテストです。"
      );
    }
  },
});
