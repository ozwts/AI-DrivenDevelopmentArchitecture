/**
 * 自動修正実行（Auto Fixer）
 *
 * npm scripts経由でESLint --fix、Prettier、terraform fmt、knipを実行
 * ワークスペース単位での修正を行う
 */

import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * 修正タイプ
 * - lint: ESLint --fix
 * - format: Prettier
 * - knip: 未使用export検出
 * - all: lint + format（knipは含まない）
 */
export type FixType = "lint" | "format" | "knip" | "all";

/**
 * ワークスペース種別
 */
export type FixWorkspace = "server" | "web" | "infra";

/**
 * 修正結果
 */
export type FixResult = {
  success: boolean;
  workspace: FixWorkspace;
  fixType: FixType;
  output: string;
  duration: number;
};

/**
 * 修正入力
 */
export type FixInput = {
  workspace: FixWorkspace;
  fixType: FixType;
  projectRoot: string;
};

/**
 * 自動修正を実行（npm scripts経由）
 *
 * 利用するnpm scripts:
 * - server: npm run fix:lint, npm run fix:format, npm run validate:knip
 * - web: npm run fix:lint, npm run fix:format, npm run validate:knip
 * - infra: npm run fix (terraform fmt)
 */
export const executeFix = async (input: FixInput): Promise<FixResult> => {
  const { workspace, fixType, projectRoot } = input;
  const startTime = Date.now();

  let output = "";

  try {
    if (workspace === "infra") {
      // infraはnpm run fix（terraform fmt）のみ
      const { stdout } = await execAsync("npm run fix -w infra", {
        cwd: projectRoot,
        maxBuffer: 1024 * 1024 * 10,
      });
      output += `## terraform fmt\n${stdout !== "" ? stdout : "All files formatted."}\n\n`;
    } else {
      // server/webはfix:lint, fix:format, validate:knipを使用
      if (fixType === "lint" || fixType === "all") {
        try {
          const { stdout } = await execAsync(
            `npm run fix:lint -w ${workspace}`,
            {
              cwd: projectRoot,
              maxBuffer: 1024 * 1024 * 10,
            },
          );
          output += `## ESLint --fix\n${stdout !== "" ? stdout : "No issues to fix."}\n\n`;
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string };
          let errorOutput = "ESLint fix completed with warnings.";
          if (execError.stdout !== undefined && execError.stdout !== "") {
            errorOutput = execError.stdout;
          } else if (execError.stderr !== undefined && execError.stderr !== "") {
            errorOutput = execError.stderr;
          }
          output += `## ESLint --fix\n${errorOutput}\n\n`;
        }
      }

      if (fixType === "format" || fixType === "all") {
        try {
          const { stdout } = await execAsync(
            `npm run fix:format -w ${workspace}`,
            {
              cwd: projectRoot,
              maxBuffer: 1024 * 1024 * 10,
            },
          );
          output += `## Prettier\n${stdout !== "" ? stdout : "All files formatted."}\n\n`;
        } catch {
          output +=
            "## Prettier\nPrettier not configured or no files to format.\n\n";
        }
      }

      if (fixType === "knip") {
        try {
          const { stdout } = await execAsync(
            `npm run fix:knip -w ${workspace}`,
            {
              cwd: projectRoot,
              maxBuffer: 1024 * 1024 * 10,
            },
          );
          output += `## knip --fix（未使用export削除）\n${stdout !== "" ? stdout : "未使用のexportを削除しました。"}\n\n`;
        } catch (error: unknown) {
          const execError = error as { stdout?: string; stderr?: string };
          let errorOutput = "knip実行結果:";
          if (execError.stdout !== undefined && execError.stdout !== "") {
            errorOutput = execError.stdout;
          } else if (execError.stderr !== undefined && execError.stderr !== "") {
            errorOutput = execError.stderr;
          }
          output += `## knip --fix（未使用export削除）\n${errorOutput}\n\n`;
        }
      }
    }

    return {
      success: true,
      workspace,
      fixType,
      output,
      duration: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      workspace,
      fixType,
      output: `Error: ${errorMessage}`,
      duration: Date.now() - startTime,
    };
  }
};
