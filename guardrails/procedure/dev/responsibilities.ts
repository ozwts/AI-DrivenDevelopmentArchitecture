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
 * 開発サーバー管理責務定義（統合版）
 *
 * 5つのツールを1つに統合:
 * - start: 開発サーバー起動
 * - stop: 開発サーバー停止
 * - restart: 開発サーバー再起動
 * - status: 状態確認
 * - logs: ログ取得
 */
export const DEV_SERVER_RESPONSIBILITIES: ProcedureResponsibility[] = [
  {
    id: "procedure_dev",
    toolDescription:
      "Dev server management. action: 'start' (start server), 'stop' (stop server), 'restart' (restart server), 'status' (check status), 'logs' (get logs). Options vary by action.",
    inputSchema: {
      action: z
        .enum(["start", "stop", "restart", "status", "logs"])
        .describe("Action to perform: start, stop, restart, status, logs"),
      mode: z
        .enum(["full", "mock"])
        .optional()
        .describe("Server mode for start/restart: 'full'=API+Web (default), 'mock'=mock API"),
      lines: z
        .number()
        .optional()
        .describe("Number of log lines for 'logs' action (default: 100)"),
      filter: z
        .string()
        .optional()
        .describe("Filter string for 'logs' action (partial match)"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const action = input.action as "start" | "stop" | "restart" | "status" | "logs";

      switch (action) {
        case "start": {
          const mode = (input.mode as "full" | "mock" | undefined) ?? "full";
          return manager.start(mode);
        }

        case "stop": {
          return manager.stop();
        }

        case "restart": {
          const status = manager.getStatus();
          const previousMode = status.mode;
          const stopResult = await manager.stop();
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 1000);
          });
          const mode = (input.mode as "full" | "mock" | undefined) ?? previousMode ?? "full";
          const startResult = await manager.start(mode);
          return [stopResult, startResult].join("\n");
        }

        case "status": {
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
        }

        case "logs": {
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
        }

        default:
          // exhaustive check
          throw new Error(`Unknown action: ${action satisfies never}`);
      }
    },
  },
];
