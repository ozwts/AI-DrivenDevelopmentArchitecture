import * as ts from "typescript";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import type { CheckModule, Violation } from "../../policy/ast-checker";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * チェック実行エンジン
 */
export class CheckRunner {
  private checks: CheckModule[] = [];

  /**
   * 指定されたレイヤーのチェックを動的に読み込んで登録
   * workspace, layer が undefined の場合は全体を走査
   */
  async loadChecks(workspace?: "server" | "web" | "infra", layer?: string): Promise<void> {
    const basePolicyDir = path.resolve(__dirname, "../../policy/horizontal/static");

    if (!fs.existsSync(basePolicyDir)) {
      throw new Error(`Policy base directory not found: ${basePolicyDir}`);
    }

    // ワークスペース一覧を決定
    const workspaces = workspace !== undefined ? [workspace] : ["server", "web", "infra"];

    // 各ワークスペースのチェックを並行で読み込み
    const loadPromises = workspaces
      .map((ws) => {
        const workspaceDir = path.join(basePolicyDir, ws);
        if (!fs.existsSync(workspaceDir)) {
          return [];
        }

        // レイヤー一覧を決定
        const layers =
          layer !== undefined && layer !== ""
            ? [layer]
            : fs
                .readdirSync(workspaceDir, { withFileTypes: true })
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);

        return layers
          .filter((ly) => {
            const layerDir = path.join(workspaceDir, ly);
            return fs.existsSync(layerDir);
          })
          .map((ly) => {
            const layerDir = path.join(workspaceDir, ly);
            return this.loadChecksFromDirectory(layerDir);
          });
      })
      .flat();

    await Promise.all(loadPromises);
  }

  /**
   * 指定されたディレクトリからチェックを読み込む（内部用）
   */
  private async loadChecksFromDirectory(directory: string): Promise<void> {
    // .tsファイルを探す（index.ts以外）
    const files = fs.readdirSync(directory).filter(
      (file) => file.endsWith(".ts") && file !== "index.ts" && !file.endsWith(".d.ts")
    );

    // 並行でインポート
    const importPromises = files.map(async (file) => {
      const checkPath = path.join(directory, file);
      try {
        // 動的import
        const module = await import(checkPath);
        const checkModule: CheckModule = module.policyCheck;

        if (
          checkModule !== null &&
          checkModule !== undefined &&
          checkModule.metadata !== null &&
          checkModule.metadata !== undefined &&
          typeof checkModule.check === "function"
        ) {
          return checkModule;
        }
        return null;
      } catch {
        // チェックの読み込みに失敗した場合は無視
        return null;
      }
    });

    const results = await Promise.all(importPromises);
    for (const checkModule of results) {
      if (checkModule !== null) {
        this.checks.push(checkModule);
      }
    }
  }

  /**
   * チェックを登録（手動登録用）
   */
  registerCheck(check: CheckModule): void {
    this.checks.push(check);
  }

  /**
   * 指定されたディレクトリ配下のTypeScriptファイルをチェック
   */
  async runChecks(targetDirectories: string[]): Promise<Violation[]> {
    const allViolations: Violation[] = [];

    // TypeScriptファイルを収集
    const tsFiles: string[] = [];
    for (const dir of targetDirectories) {
      this.collectTypeScriptFiles(dir, tsFiles);
    }

    if (tsFiles.length === 0) {
      return allViolations;
    }

    // TypeScript Programを作成
    const program = ts.createProgram(tsFiles, {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      noEmit: true,
      skipLibCheck: true,
    });

    // 各ファイルに対してチェックを実行
    for (const fileName of tsFiles) {
      const sourceFile = program.getSourceFile(fileName);
      if (sourceFile === undefined) {
        // ファイルが取得できない場合はスキップ
      } else {
        // 登録されたすべてのチェックを実行
        for (const check of this.checks) {
          const violations = check.check(sourceFile, program);
          allViolations.push(...violations);
        }
      }
    }

    return allViolations;
  }

  /**
   * ディレクトリ配下のTypeScriptファイルを再帰的に収集
   */
  private collectTypeScriptFiles(dir: string, files: string[]): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const excludeDirs = new Set(["node_modules", ".git", "dist", "build"]);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // node_modules, .git, dist等は除外
        if (!excludeDirs.has(entry.name)) {
          this.collectTypeScriptFiles(fullPath, files);
        }
      } else if (entry.isFile() && fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts")) {
        files.push(fullPath);
      }
    }
  }
}

/**
 * 静的解析を実行するエントリーポイント
 * @param workspace - ワークスペース (server, web, infra) - 省略時は全ワークスペース
 * @param layer - レイヤー (domain-model, use-case, handler, repository, etc.) - 省略時は全レイヤー
 * @param targetDirectories - チェック対象のディレクトリ
 */
export const runStaticAnalysisV2 = async (
  workspace?: "server" | "web" | "infra",
  layer?: string,
  targetDirectories: string[] = []
): Promise<Violation[]> => {
  const runner = new CheckRunner();

  // 指定されたワークスペース・レイヤーのチェックを動的に読み込み
  await runner.loadChecks(workspace, layer);

  // チェックを実行
  const violations = await runner.runChecks(targetDirectories);

  return violations;
};
