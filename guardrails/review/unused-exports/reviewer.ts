/**
 * 未使用export検出レビュー実装
 *
 * npm scripts経由でknipを使用して未使用のexportを検出する。
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * ワークスペース種別
 */
export type Workspace = "server" | "web";

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
  /** 対象ワークスペース */
  workspace: Workspace;
  /** 対象ディレクトリ一覧（フィルタ用、省略時は全て） */
  targetDirectories?: string[];
  /** プロジェクトルートディレクトリ（モノレポのルート） */
  projectRoot: string;
};

/**
 * 未使用exportを検出（npm scripts経由）
 *
 * 利用するnpm scripts:
 * - server: npm run validate:knip -w server
 * - web: npm run validate:knip -w web
 */
export const executeUnusedExportsCheck = async (
  input: UnusedExportsInput,
): Promise<UnusedExportsResult> => {
  const { workspace, targetDirectories, projectRoot } = input;

  try {
    // npm scripts経由でknipを実行
    const { stdout } = await execAsync(
      `npm run validate:knip -w ${workspace}`,
      {
        cwd: projectRoot,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      },
    );

    // npm run の出力からJSON部分を抽出
    const jsonOutput = extractJsonFromOutput(stdout);
    if (jsonOutput === null) {
      return {
        success: true,
        unusedExports: [],
      };
    }

    return parseKnipOutput(jsonOutput, targetDirectories);
  } catch (error: unknown) {
    // knipがエラーを返した場合（未使用exportがある場合もexit code 1になる）
    const execError = error as { stdout?: string; stderr?: string };

    if (
      execError.stdout !== null &&
      execError.stdout !== undefined &&
      execError.stdout !== ""
    ) {
      const jsonOutput = extractJsonFromOutput(execError.stdout);
      if (jsonOutput !== null) {
        return parseKnipOutput(jsonOutput, targetDirectories);
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

/**
 * npm runの出力からJSON部分を抽出
 */
const extractJsonFromOutput = (output: string): string | null => {
  // JSON開始位置を探す
  const jsonStart = output.indexOf("{");
  if (jsonStart === -1) {
    return null;
  }
  return output.slice(jsonStart);
};

/**
 * knipのJSON出力をパース
 */
const parseKnipOutput = (
  jsonString: string,
  targetDirectories?: string[],
): UnusedExportsResult => {
  try {
    const knipResult = JSON.parse(jsonString) as KnipJsonOutput;
    const unusedExports: UnusedExportItem[] = [];

    for (const [file, fileIssues] of Object.entries(knipResult.files)) {
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
  } catch {
    return {
      success: false,
      unusedExports: [],
      error: "Failed to parse knip output",
    };
  }
};
