/**
 * テスト実行管理
 *
 * 注意: すべてのコマンドはwatchモードではなく、一回実行して終了する
 * - vitest run: 一回実行して終了（vitest単体はwatchモード）
 * - playwright test: 一回実行して終了
 */
import { spawn } from "child_process";

export type TestTarget =
  | "server"
  | "web"
  | "web:component"
  | "web:snapshot"
  | "all";

export type TestResult = {
  success: boolean;
  target: TestTarget;
  output: string;
  duration: number; // ミリ秒
};

export type TestFilter = {
  file?: string; // ファイルパスまたはパターン
  testName?: string; // テスト名またはdescribe名
};

/**
 * 正規表現の特殊文字をエスケープ
 */
const escapeRegexSpecialChars = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * シェル用にシングルクォートで囲む（リテラルパス用）
 * vitestなど、ファイルパスをリテラルとして解釈するツール向け
 */
const escapeForShell = (str: string): string =>
  `'${str.replace(/'/g, "'\\''")}'`;

/**
 * 正規表現パターンとして解釈されるパスをエスケープ
 * Playwrightなど、ファイルパスを正規表現パターンとして解釈するツール向け
 */
const escapeForRegexPattern = (filePath: string): string => {
  const regexEscaped = escapeRegexSpecialChars(filePath);
  return escapeForShell(regexEscaped);
};

/**
 * コマンドを実行して結果を返す
 */
const runCommand = (
  command: string,
  cwd: string,
): Promise<{ success: boolean; output: string }> =>
  new Promise((resolve) => {
    const proc = spawn(command, [], {
      cwd,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";

    proc.stdout?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.stderr?.on("data", (data: Buffer) => {
      output += data.toString();
    });

    proc.on("close", (code) => {
      resolve({
        success: code === 0,
        output,
      });
    });

    proc.on("error", (err) => {
      resolve({
        success: false,
        output: `エラー: ${err.message}`,
      });
    });
  });

/**
 * テストランナー
 */
class TestRunner {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * サーバーテスト実行 (vitest run)
   *
   * vitest options:
   * - file: vitest run <file>
   * - testName: vitest run -t "<testName>"
   */
  async runServerTests(filter?: TestFilter): Promise<TestResult> {
    const startTime = Date.now();

    let command = "npm run test -w server";
    const args: string[] = [];

    if (filter?.file !== undefined && filter.file !== "") {
      // vitest: ファイルパスはリテラルとして解釈される
      args.push(escapeForShell(filter.file));
    }
    if (filter?.testName !== undefined && filter.testName !== "") {
      args.push(`-t "${filter.testName}"`);
    }

    if (args.length > 0) {
      command = `npm run test -w server -- ${args.join(" ")}`;
    }

    const result = await runCommand(command, this.projectRoot);

    return {
      success: result.success,
      target: "server",
      output: result.output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Webコンポーネントテスト実行 (Playwright Component Test)
   *
   * playwright options:
   * - file: playwright test <file>
   * - testName: playwright test --grep "<testName>"
   *
   * 注意: "No tests found" の場合は成功として扱う（テストが存在しないだけ）
   */
  async runWebComponentTests(filter?: TestFilter): Promise<TestResult> {
    const startTime = Date.now();

    let command = "npm run test:ct -w web";
    const args: string[] = [];

    if (filter?.file !== undefined && filter.file !== "") {
      // Playwright: ファイルパスは正規表現パターンとして解釈される
      args.push(escapeForRegexPattern(filter.file));
    }
    if (filter?.testName !== undefined && filter.testName !== "") {
      args.push(`--grep "${filter.testName}"`);
    }

    if (args.length > 0) {
      command = `npm run test:ct -w web -- ${args.join(" ")}`;
    }

    const result = await runCommand(command, this.projectRoot);

    // "No tests found" はテストが存在しないだけなので成功扱い
    const noTestsFound = result.output.includes("No tests found");
    const success = result.success || noTestsFound;

    return {
      success,
      target: "web:component",
      output: noTestsFound
        ? `${result.output}\n(テストが存在しないためスキップ)`
        : result.output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Webスナップショットテスト実行 (Playwright Snapshot Test)
   *
   * playwright options:
   * - file: playwright test <file>
   * - testName: playwright test --grep "<testName>"
   *
   * 注意: "No tests found" の場合は成功として扱う（テストが存在しないだけ）
   */
  async runWebSnapshotTests(filter?: TestFilter): Promise<TestResult> {
    const startTime = Date.now();

    let command = "npm run test:ss -w web";
    const args: string[] = [];

    if (filter?.file !== undefined && filter.file !== "") {
      // Playwright: ファイルパスは正規表現パターンとして解釈される
      args.push(escapeForRegexPattern(filter.file));
    }
    if (filter?.testName !== undefined && filter.testName !== "") {
      args.push(`--grep "${filter.testName}"`);
    }

    if (args.length > 0) {
      command = `npm run test:ss -w web -- ${args.join(" ")}`;
    }

    const result = await runCommand(command, this.projectRoot);

    // "No tests found" はテストが存在しないだけなので成功扱い
    const noTestsFound = result.output.includes("No tests found");
    const success = result.success || noTestsFound;

    return {
      success,
      target: "web:snapshot",
      output: noTestsFound
        ? `${result.output}\n(テストが存在しないためスキップ)`
        : result.output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Web全テスト実行 (Component + Snapshot)
   */
  async runWebTests(filter?: TestFilter): Promise<TestResult> {
    const startTime = Date.now();

    const componentResult = await this.runWebComponentTests(filter);
    const snapshotResult = await this.runWebSnapshotTests(filter);

    const success = componentResult.success && snapshotResult.success;
    const output = [
      "=== コンポーネントテスト ===",
      componentResult.output,
      "",
      "=== スナップショットテスト ===",
      snapshotResult.output,
    ].join("\n");

    return {
      success,
      target: "web",
      output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 全テスト実行 (Server + Web)
   */
  async runAllTests(): Promise<TestResult> {
    const startTime = Date.now();

    const serverResult = await this.runServerTests();
    const webResult = await this.runWebTests();

    const success = serverResult.success && webResult.success;
    const output = [
      "=== サーバーテスト ===",
      serverResult.output,
      "",
      "=== Webテスト ===",
      webResult.output,
    ].join("\n");

    return {
      success,
      target: "all",
      output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * スナップショット更新
   */
  async updateSnapshots(filter?: TestFilter): Promise<TestResult> {
    const startTime = Date.now();

    let command = "npm run test:ss:update -w web";
    const args: string[] = [];

    if (filter?.file !== undefined && filter.file !== "") {
      // Playwright: ファイルパスは正規表現パターンとして解釈される
      args.push(escapeForRegexPattern(filter.file));
    }
    if (filter?.testName !== undefined && filter.testName !== "") {
      args.push(`--grep "${filter.testName}"`);
    }

    if (args.length > 0) {
      command = `npm run test:ss:update -w web -- ${args.join(" ")}`;
    }

    const result = await runCommand(command, this.projectRoot);

    return {
      success: result.success,
      target: "web:snapshot",
      output: result.output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * スナップショットリフレッシュ（全削除して再生成）
   */
  async refreshSnapshots(): Promise<TestResult> {
    const startTime = Date.now();

    const command = "npm run test:ss:refresh -w web";
    const result = await runCommand(command, this.projectRoot);

    return {
      success: result.success,
      target: "web:snapshot",
      output: result.output,
      duration: Date.now() - startTime,
    };
  }
}

// シングルトンインスタンス
let runner: TestRunner | null = null;

export const getTestRunner = (projectRoot: string): TestRunner => {
  if (runner === null) {
    runner = new TestRunner(projectRoot);
  }
  return runner;
};
