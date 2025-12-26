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
  // ----- 起動 -----
  {
    id: "procedure_dev_start",
    toolDescription:
      "開発サーバーを起動します。mode: 'full'（API+Web）または 'mock'（モックAPI）を選択できます。",
    inputSchema: {
      mode: z
        .enum(["full", "mock"])
        .optional()
        .describe("起動モード: 'full'=API+Web（デフォルト）, 'mock'=モックAPI"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      const mode = (input.mode as "full" | "mock" | undefined) ?? "full";
      return manager.start(mode);
    },
  },

  // ----- 停止 -----
  {
    id: "procedure_dev_stop",
    toolDescription: "開発サーバーを停止します。",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const manager = getDevServerManager(projectRoot);
      return manager.stop();
    },
  },

  // ----- リスタート -----
  {
    id: "procedure_dev_restart",
    toolDescription:
      "開発サーバーを再起動します。停止後に同じモードで起動します。",
    inputSchema: {
      mode: z
        .enum(["full", "mock"])
        .optional()
        .describe(
          "起動モード: 'full'=API+Web, 'mock'=モックAPI。省略時は前回と同じモード",
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

  // ----- 状態確認 -----
  {
    id: "procedure_dev_status",
    toolDescription:
      "開発サーバーの状態を確認します（稼働状況、PID、起動時刻、稼働時間）。",
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

  // ----- ログ取得 -----
  {
    id: "procedure_dev_logs",
    toolDescription:
      "開発サーバーのログを取得します。行数指定やフィルタリングが可能です。",
    inputSchema: {
      lines: z
        .number()
        .optional()
        .describe("取得するログの行数（デフォルト: 100）"),
      filter: z.string().optional().describe("フィルタ文字列（部分一致）"),
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
