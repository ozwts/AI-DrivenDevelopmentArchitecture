/**
 * 開発サーバーのプロセス管理
 */
import { spawn, ChildProcess } from "child_process";
import { LogBuffer } from "./log-buffer";

export type DevMode = "full" | "mock";

export type ServerStatus = {
  running: boolean;
  mode: DevMode | null;
  pid: number | null;
  startedAt: Date | null;
  uptime: number | null; // 秒
};

/**
 * 開発サーバーマネージャー
 * シングルトンでプロセスとログを管理
 */
class DevServerManager {
  private process: ChildProcess | null = null;

  private mode: DevMode | null = null;

  private startedAt: Date | null = null;

  private logs: LogBuffer = new LogBuffer(2000);

  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 開発サーバーを起動
   */
  async start(mode: DevMode = "full"): Promise<string> {
    if (this.process !== null) {
      return `開発サーバーは既に起動しています (PID: ${this.process.pid}, mode: ${this.mode})`;
    }

    this.logs.clear();
    this.mode = mode;
    this.startedAt = new Date();

    const command = mode === "mock" ? "npm run dev:mock" : "npm run dev";

    this.process = spawn(command, [], {
      cwd: this.projectRoot,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // stdout/stderrをログバッファに追加
    this.process.stdout?.on("data", (data: Buffer) => {
      this.logs.append(data.toString());
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      this.logs.append(data.toString());
    });

    this.process.on("close", (code) => {
      this.logs.append(`[Process] 終了コード: ${code}`);
      this.process = null;
      this.mode = null;
      this.startedAt = null;
    });

    this.process.on("error", (err) => {
      this.logs.append(`[Process] エラー: ${err.message}`);
    });

    return `開発サーバーを起動しました (PID: ${this.process.pid}, mode: ${mode})`;
  }

  /**
   * 開発サーバーを停止
   */
  async stop(): Promise<string> {
    if (this.process === null) {
      return "開発サーバーは起動していません";
    }

    const { pid } = this.process;

    // プロセスグループ全体を終了（concurrentlyの子プロセスも含む）
    try {
      process.kill(-pid!, "SIGTERM");
    } catch {
      // プロセスグループが存在しない場合は直接終了
      this.process.kill("SIGTERM");
    }

    // 少し待ってから強制終了
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });

    if (this.process !== null) {
      try {
        process.kill(-pid!, "SIGKILL");
      } catch {
        this.process?.kill("SIGKILL");
      }
    }

    this.process = null;
    this.mode = null;
    this.startedAt = null;

    return `開発サーバーを停止しました (PID: ${pid})`;
  }

  /**
   * サーバーの状態を取得
   */
  getStatus(): ServerStatus {
    const running = this.process !== null;
    const uptime =
      running && this.startedAt !== null
        ? Math.floor((Date.now() - this.startedAt.getTime()) / 1000)
        : null;

    return {
      running,
      mode: this.mode,
      pid: this.process?.pid ?? null,
      startedAt: this.startedAt,
      uptime,
    };
  }

  /**
   * ログを取得
   */
  getLogs(lines: number, filter?: string): string[] {
    if (filter !== undefined && filter !== "") {
      return this.logs.getFilteredLines(filter, lines);
    }
    return this.logs.getLines(lines);
  }
}

// シングルトンインスタンス
let manager: DevServerManager | null = null;

export const getDevServerManager = (projectRoot: string): DevServerManager => {
  if (manager === null) {
    manager = new DevServerManager(projectRoot);
  }
  return manager;
};
