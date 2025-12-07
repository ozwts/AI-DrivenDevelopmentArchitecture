/**
 * 未使用export検出レビュー実装
 *
 * knipを使用して未使用のexportを検出する。
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 未使用exportアイテム
 */
export type UnusedExportItem = {
  name: string;
  file: string;
  line: number;
  column: number;
};

/**
 * 未使用export検出結果
 */
export type UnusedExportsResult = {
  success: boolean;
  unusedExports: UnusedExportItem[];
  error?: string;
};

/**
 * knipのJSON出力型
 */
type KnipJsonOutput = {
  files: Record<
    string,
    {
      exports?: {
        name: string;
        line: number;
        col: number;
      }[];
    }
  >;
};

/**
 * 未使用export検出入力パラメータ
 */
export type UnusedExportsInput = {
  /** 対象ディレクトリ一覧（フィルタ用、省略時は全て） */
  targetDirectories?: string[];
  /** プロジェクトルートディレクトリ */
  projectRoot: string;
};

/**
 * 未使用exportを検出
 */
export const executeUnusedExportsCheck = async (
  input: UnusedExportsInput,
): Promise<UnusedExportsResult> => {
  const { targetDirectories, projectRoot } = input;

  try {
    // knipを実行（--reporter jsonで構造化出力を取得）
    const { stdout } = await execAsync("npx knip --reporter json", {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });

    // knipのJSON出力をパース
    const knipResult = JSON.parse(stdout) as KnipJsonOutput;

    // 未使用exportを抽出
    const unusedExports: UnusedExportItem[] = [];

    for (const [file, fileIssues] of Object.entries(knipResult.files)) {
      // exportsがある場合のみ処理
      if (
        fileIssues.exports !== null &&
        fileIssues.exports !== undefined &&
        fileIssues.exports.length > 0
      ) {
        for (const exp of fileIssues.exports) {
          // targetDirectoriesが指定されている場合はフィルタ
          if (
            targetDirectories === undefined ||
            targetDirectories.length === 0 ||
            targetDirectories.some((dir) => file.startsWith(dir))
          ) {
            unusedExports.push({
              name: exp.name,
              file,
              line: exp.line,
              column: exp.col,
            });
          }
        }
      }
    }

    return {
      success: unusedExports.length === 0,
      unusedExports,
    };
  } catch (error: unknown) {
    // knipがエラーを返した場合（未使用exportがある場合もexit code 1になる）
    const execError = error as { stdout?: string; stderr?: string };

    if (
      execError.stdout !== null &&
      execError.stdout !== undefined &&
      execError.stdout !== ""
    ) {
      try {
        const knipResult = JSON.parse(execError.stdout) as KnipJsonOutput;

        const unusedExports: UnusedExportItem[] = [];

        for (const [file, fileIssues] of Object.entries(knipResult.files)) {
          if (
            fileIssues.exports !== null &&
            fileIssues.exports !== undefined &&
            fileIssues.exports.length > 0
          ) {
            for (const exp of fileIssues.exports) {
              if (
                targetDirectories === undefined ||
                targetDirectories.length === 0 ||
                targetDirectories.some((dir) => file.startsWith(dir))
              ) {
                unusedExports.push({
                  name: exp.name,
                  file,
                  line: exp.line,
                  column: exp.col,
                });
              }
            }
          }
        }

        return {
          success: unusedExports.length === 0,
          unusedExports,
        };
      } catch {
        // JSONパース失敗
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      unusedExports: [],
      error: errorMessage,
    };
  }
};
