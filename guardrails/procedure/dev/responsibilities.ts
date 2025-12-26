/**
 * 開発サーバー管理の責務定義
 */
import { z } from "zod";
import { getDevServerManager, ServerStatus } from "./server-manager";

/**
 * Procedure責務定義の型
 */
export type ProcedureResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (input: Record<string, unknown>, projectRoot: string) => Promise<string>;
};

/**
 * 稼働時間をフォーマット
 */
const formatUptime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}時間${minutes}分${secs}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  }
  return `${secs}秒`;
};

/**
 * 開発サーバー管理責務定義
 */
export const DEV_SERVER_RESPONSIBILITIES: ProcedureResponsibility[] = [
  // ----- Start -----
  {
    id: "procedure_dev_start",
    toolDescription:
      "Starts the dev server. mode: 'full' (API+Web) or 'mock' (mock API).",
    inputSchema: {
      mode: z
        .enum(["full", "mock"])
        .optional()
        .describe("Start mode: 'full'=API+Web (default), 'mock'=mock API"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const mode = (input.mode as "full" | "mock" | undefined) ?? "full";
      return manager.start(mode);
    },
  },

  // ----- Stop -----
  {
    id: "procedure_dev_stop",
    toolDescription: "Stops the dev server.",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      return manager.stop();
    },
  },

  // ----- Restart -----
  {
    id: "procedure_dev_restart",
    toolDescription:
      "Restarts the dev server. Stops then starts with the same mode.",
    inputSchema: {
      mode: z
        .enum(["full", "mock"])
        .optional()
        .describe(
          "Start mode: 'full'=API+Web, 'mock'=mock API. Uses previous mode if omitted",
        ),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const status = manager.getStatus();
      const previousMode = status.mode;

      // 停止
      const stopResult = await manager.stop();

      // 少し待機
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000);
      });

      // 起動（指定があればそのモード、なければ前回のモード、どちらもなければfull）
      const mode =
        (input.mode as "full" | "mock" | undefined) ?? previousMode ?? "full";
      const startResult = await manager.start(mode);

      return [stopResult, startResult].join("\n");
    },
  },

  // ----- Status -----
  {
    id: "procedure_dev_status",
    toolDescription:
      "Checks dev server status (running state, PID, start time, uptime).",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const status: ServerStatus = manager.getStatus();

      if (!status.running) {
        return "開発サーバーは停止しています";
      }

      const uptimeStr = formatUptime(status.uptime ?? 0);

      return [
        "## 開発サーバー状態",
        "",
        "- **状態**: 稼働中",
        `- **モード**: ${status.mode}`,
        `- **PID**: ${status.pid}`,
        `- **APIポート**: ${status.apiPort}`,
        `- **Webポート**: ${status.webPort}`,
        `- **起動時刻**: ${status.startedAt?.toLocaleString("ja-JP")}`,
        `- **稼働時間**: ${uptimeStr}`,
      ].join("\n");
    },
  },

  // ----- Logs -----
  {
    id: "procedure_dev_logs",
    toolDescription:
      "Gets dev server logs. Supports line count and filtering.",
    inputSchema: {
      lines: z
        .number()
        .optional()
        .describe("Number of log lines to retrieve (default: 100)"),
      filter: z.string().optional().describe("Filter string (partial match)"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const lines = (input.lines as number | undefined) ?? 100;
      const filter = input.filter as string | undefined;

      const logs = manager.getLogs(lines, filter);

      if (logs.length === 0) {
        if (filter !== undefined && filter !== "") {
          return `「${filter}」に一致するログはありません`;
        }
        return "ログはありません";
      }

      const header =
        filter !== undefined && filter !== ""
          ? `## ログ (フィルタ: "${filter}", ${logs.length}行)`
          : `## ログ (最新${logs.length}行)`;

      return [header, "", "```", ...logs, "```"].join("\n");
    },
  },
];
