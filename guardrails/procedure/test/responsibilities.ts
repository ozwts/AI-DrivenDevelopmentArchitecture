/**
 * テスト実行の責務定義
 */
import { z } from "zod";
import { getTestRunner, type TestFilter } from "./test-runner";
import { formatTestResult } from "./formatter";
import type { ProcedureResponsibility } from "../dev";

/**
 * 入力からTestFilterを構築
 */
const buildFilter = (input: Record<string, unknown>): TestFilter | undefined => {
  const file = input.file as string | undefined;
  const testName = input.testName as string | undefined;

  const hasFile = file !== undefined && file !== "";
  const hasTestName = testName !== undefined && testName !== "";

  if (!hasFile && !hasTestName) {
    return undefined;
  }

  return { file, testName };
};

/**
 * テスト実行責務定義（統合版）
 *
 * 11ツールを3つに統合:
 * - procedure_test: テスト実行（6種類のターゲット）
 * - procedure_snapshot: スナップショット管理（update/refresh）
 * - procedure_e2e_setup: E2Eセットアップ（user-setup/user-destroy/browser-setup）
 */
export const TEST_RESPONSIBILITIES: ProcedureResponsibility[] = [
  // ========================================
  // テスト実行（統合）
  // ========================================
  {
    id: "procedure_test",
    toolDescription:
      "Runs tests. target: 'server' (vitest), 'web-component' (Playwright CT), 'web-snapshot' (Playwright SS), 'web' (all web), 'e2e' (E2E), 'all' (server+web). For e2e, baseUrl/apiBaseUrl can specify target environment.",
    inputSchema: {
      target: z
        .enum(["server", "web-component", "web-snapshot", "web", "e2e", "all"])
        .describe("Test target: server, web-component, web-snapshot, web, e2e, all"),
      file: z
        .string()
        .optional()
        .describe("Test file path or pattern (e.g., src/domain/user.test.ts)"),
      testName: z
        .string()
        .optional()
        .describe("Filter by test name or describe name (e.g., UserEntity)"),
      baseUrl: z
        .string()
        .optional()
        .describe("Frontend base URL for e2e (default: http://localhost:5173)"),
      apiBaseUrl: z
        .string()
        .optional()
        .describe("API server base URL for e2e (default: http://localhost:3000)"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const target = input.target as "server" | "web-component" | "web-snapshot" | "web" | "e2e" | "all";
      const filter = buildFilter(input);

      switch (target) {
        case "server": {
          const result = await runner.runServerTests(filter);
          return formatTestResult(result);
        }
        case "web-component": {
          const result = await runner.runWebComponentTests(filter);
          return formatTestResult(result);
        }
        case "web-snapshot": {
          const result = await runner.runWebSnapshotTests(filter);
          return formatTestResult(result);
        }
        case "web": {
          const result = await runner.runWebTests(filter);
          return formatTestResult(result);
        }
        case "e2e": {
          const baseUrl = input.baseUrl as string | undefined;
          const apiBaseUrl = input.apiBaseUrl as string | undefined;
          const result = await runner.runE2ETests({ filter, baseUrl, apiBaseUrl });
          return formatTestResult(result);
        }
        case "all": {
          const result = await runner.runAllTests();
          return formatTestResult(result);
        }
        default:
          // exhaustive check
          throw new Error(`Unknown target: ${target satisfies never}`);
      }
    },
  },

  // ========================================
  // スナップショット管理（統合）
  // ========================================
  {
    id: "procedure_snapshot",
    toolDescription:
      "Snapshot management. action: 'update' (update snapshots for specific tests), 'refresh' (delete all and regenerate from clean state).",
    inputSchema: {
      action: z
        .enum(["update", "refresh"])
        .describe("Action: 'update' (update specific), 'refresh' (delete all and regenerate)"),
      file: z
        .string()
        .optional()
        .describe("Test file path or pattern for 'update' action"),
      testName: z
        .string()
        .optional()
        .describe("Filter by test name for 'update' action"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const action = input.action as "update" | "refresh";

      switch (action) {
        case "update": {
          const filter = buildFilter(input);
          const result = await runner.updateSnapshots(filter);
          return formatTestResult(result);
        }
        case "refresh": {
          const result = await runner.refreshSnapshots();
          return formatTestResult(result);
        }
        default:
          // exhaustive check
          throw new Error(`Unknown action: ${action satisfies never}`);
      }
    },
  },

  // ========================================
  // E2Eセットアップ（統合）
  // ========================================
  {
    id: "procedure_e2e_setup",
    toolDescription:
      "E2E test environment setup. action: 'user-setup' (create Cognito user), 'user-destroy' (delete Cognito user), 'browser-setup' (install Chromium).",
    inputSchema: {
      action: z
        .enum(["user-setup", "user-destroy", "browser-setup"])
        .describe("Action: user-setup, user-destroy, browser-setup"),
      useBranchEnv: z
        .boolean()
        .optional()
        .describe("Use branch environment for user actions (default: true)"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const action = input.action as "user-setup" | "user-destroy" | "browser-setup";

      switch (action) {
        case "user-setup": {
          const useBranchEnv = (input.useBranchEnv as boolean | undefined) ?? true;
          const result = await runner.setupE2EUser(useBranchEnv);
          return formatTestResult(result);
        }
        case "user-destroy": {
          const useBranchEnv = (input.useBranchEnv as boolean | undefined) ?? true;
          const result = await runner.destroyE2EUser(useBranchEnv);
          return formatTestResult(result);
        }
        case "browser-setup": {
          const result = await runner.setupBrowser();
          return formatTestResult(result);
        }
        default:
          // exhaustive check
          throw new Error(`Unknown action: ${action satisfies never}`);
      }
    },
  },
];
