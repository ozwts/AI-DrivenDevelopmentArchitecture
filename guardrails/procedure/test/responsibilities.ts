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
 * Filter schema (shared)
 */
const filterSchema = {
  file: z
    .string()
    .optional()
    .describe("Test file path or pattern (e.g., src/domain/user.test.ts)"),
  testName: z
    .string()
    .optional()
    .describe("Filter by test name or describe name (e.g., UserEntity)"),
};

/**
 * テスト実行責務定義
 */
export const TEST_RESPONSIBILITIES: ProcedureResponsibility[] = [
  // ----- Server Tests -----
  {
    id: "procedure_test_server",
    toolDescription:
      "Runs server tests (vitest). file specifies file, testName filters by test/describe name.",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runServerTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Web Component Tests -----
  {
    id: "procedure_test_web_component",
    toolDescription:
      "Runs web component tests (Playwright Component Test). file specifies file, testName filters by test name.",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebComponentTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Web Snapshot Tests -----
  {
    id: "procedure_test_web_snapshot",
    toolDescription:
      "Runs web snapshot tests (Playwright Snapshot Test). file specifies file, testName filters by test name.",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebSnapshotTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Web All Tests -----
  {
    id: "procedure_test_web",
    toolDescription:
      "Runs all web tests (Component + Snapshot). file specifies file, testName filters by test name.",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- E2E Tests -----
  {
    id: "procedure_test_e2e",
    toolDescription:
      "Runs E2E tests (Playwright E2E Test). file specifies file, testName filters, baseUrl/apiBaseUrl specify target environment. Default: localhost:5173 (frontend), localhost:3000 (API).",
    inputSchema: {
      ...filterSchema,
      baseUrl: z
        .string()
        .optional()
        .describe(
          "Frontend base URL (default: http://localhost:5173)",
        ),
      apiBaseUrl: z
        .string()
        .optional()
        .describe("API server base URL (default: http://localhost:3000)"),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const baseUrl = input.baseUrl as string | undefined;
      const apiBaseUrl = input.apiBaseUrl as string | undefined;
      const result = await runner.runE2ETests({ filter, baseUrl, apiBaseUrl });
      return formatTestResult(result);
    },
  },

  // ----- All Tests -----
  {
    id: "procedure_test_all",
    toolDescription: "Runs all tests (Server + Web).",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const result = await runner.runAllTests();
      return formatTestResult(result);
    },
  },

  // ----- Update Snapshots -----
  {
    id: "procedure_test_update_snapshots",
    toolDescription:
      "Updates snapshots. file specifies file, testName filters by test name.",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.updateSnapshots(filter);
      return formatTestResult(result);
    },
  },

  // ----- Refresh Snapshots -----
  {
    id: "procedure_test_refresh_snapshots",
    toolDescription:
      "Deletes all snapshots and regenerates them from a clean state.",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const result = await runner.refreshSnapshots();
      return formatTestResult(result);
    },
  },

  // ----- E2E User Setup -----
  {
    id: "procedure_e2e_user_setup",
    toolDescription:
      "Creates E2E test user in Cognito and saves credentials to SSM Parameter Store. useBranchEnv=true for branch env, false for shared dev env.",
    inputSchema: {
      useBranchEnv: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Use branch environment. true: branch-specific env (default), false: shared dev env",
        ),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const useBranchEnv = (input.useBranchEnv as boolean | undefined) ?? true;
      const result = await runner.setupE2EUser(useBranchEnv);
      return formatTestResult(result);
    },
  },

  // ----- E2E User Destroy -----
  {
    id: "procedure_e2e_user_destroy",
    toolDescription:
      "Deletes E2E test user from Cognito and removes credentials from SSM Parameter Store. useBranchEnv=true for branch env, false for shared dev env.",
    inputSchema: {
      useBranchEnv: z
        .boolean()
        .optional()
        .default(true)
        .describe(
          "Use branch environment. true: branch-specific env (default), false: shared dev env",
        ),
    },
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const useBranchEnv = (input.useBranchEnv as boolean | undefined) ?? true;
      const result = await runner.destroyE2EUser(useBranchEnv);
      return formatTestResult(result);
    },
  },

  // ----- Browser Setup -----
  {
    id: "procedure_e2e_browser_setup",
    toolDescription:
      "Installs Chromium browser for E2E tests. Run on initial setup or browser update.",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const result = await runner.setupBrowser();
      return formatTestResult(result);
    },
  },
];
