/**
 * 開発サーバーのプロセス管理
 */
import { spawn, ChildProcess } from "child_process";
import { createServer } from "net";
import { LogBuffer } from "./log-buffer";

export type DevMode = "full" | "mock";

/**
 * ポートが利用可能かチェック
 * IPv4とIPv6の両方でバインドを試みて確認
 */
const isPortAvailable = async (port: number): Promise<boolean> => {
  // IPv4チェック
  const ipv4Available = await new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });

  if (!ipv4Available) return false;

  // IPv6チェック
  const ipv6Available = await new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "::");
  });

  return ipv6Available;
};

/**
 * 利用可能なポートを探す
 */
const findAvailablePort = async (
  startPort: number,
  maxAttempts = 10,
): Promise<number> => {
  // 最初に見つかった利用可能なポートを返すため、順次チェックが必要
  for (let i = 0; i < maxAttempts; i += 1) {
    const port = startPort + i;
    // eslint-disable-next-line no-await-in-loop
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(
    `ポート ${startPort}〜${startPort + maxAttempts - 1} はすべて使用中です`,
  );
};

export type ServerStatus = {
  running: boolean;
  mode: DevMode | null;
  pid: number | null;
  startedAt: Date | null;
  uptime: number | null; // 秒
  apiPort: number | null;
  webPort: number | null;
};

/**
 * 開発サーバーマネージャー
 * シングルトンでプロセスとログを管理
 */
class DevServerManager {
  private process: ChildProcess | null = null;

  private mode: DevMode | null = null;

  private startedAt: Date | null = null;

  private apiPort: number | null = null;

  private webPort: number | null = null;

  private logs: LogBuffer = new LogBuffer(2000);

  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * 開発サーバーを起動
   * ポートは自動で空きポートを検出
   */
  async start(mode: DevMode = "full"): Promise<string> {
    if (this.process !== null) {
      return `開発サーバーは既に起動しています (PID: ${this.process.pid}, mode: ${this.mode})`;
    }

    // 空きポートを自動検出
    const apiPort = await findAvailablePort(3000);
    const webPort = await findAvailablePort(5173);

    this.logs.clear();
    this.mode = mode;
    this.startedAt = new Date();
    this.apiPort = apiPort;
    this.webPort = webPort;

    // 環境変数でポートを指定
    const envVars = [
      `PORT=${apiPort}`,
      `VITE_API_URL=http://localhost:${apiPort}`,
    ];

    const command = mode === "mock" ? "npm run dev:mock" : "npm run dev";
    const fullCommand = `${envVars.join(" ")} ${command}`;

    this.process = spawn(fullCommand, [], {
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
      this.apiPort = null;
      this.webPort = null;
    });

    this.process.on("error", (err) => {
      this.logs.append(`[Process] エラー: ${err.message}`);
    });

    return `開発サーバーを起動しました (PID: ${this.process.pid}, mode: ${mode}, API: ${apiPort}, Web: ${webPort})`;
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
    this.apiPort = null;
    this.webPort = null;

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
      apiPort: this.apiPort,
      webPort: this.webPort,
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
