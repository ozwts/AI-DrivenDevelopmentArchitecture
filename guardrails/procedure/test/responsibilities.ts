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
 * フィルタ用スキーマ（共通）
 */
const filterSchema = {
  file: z
    .string()
    .optional()
    .describe("テストファイルパスまたはパターン（例: src/domain/user.test.ts）"),
  testName: z
    .string()
    .optional()
    .describe("テスト名またはdescribe名でフィルタ（例: UserEntity）"),
};

/**
 * テスト実行責務定義
 */
export const TEST_RESPONSIBILITIES: ProcedureResponsibility[] = [
  // ----- サーバーテスト -----
  {
    id: "procedure_test_server",
    toolDescription:
      "サーバーテストを実行します（vitest）。fileでファイル指定、testNameでテスト名/describe名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runServerTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Webコンポーネントテスト -----
  {
    id: "procedure_test_web_component",
    toolDescription:
      "Webコンポーネントテストを実行します（Playwright Component Test）。fileでファイル指定、testNameでテスト名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebComponentTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Webスナップショットテスト -----
  {
    id: "procedure_test_web_snapshot",
    toolDescription:
      "Webスナップショットテストを実行します（Playwright Snapshot Test）。fileでファイル指定、testNameでテスト名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebSnapshotTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- Web全テスト -----
  {
    id: "procedure_test_web",
    toolDescription:
      "Web全テストを実行します（Component + Snapshot）。fileでファイル指定、testNameでテスト名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runWebTests(filter);
      return formatTestResult(result);
    },
  },

  // ----- E2Eテスト -----
  {
    id: "procedure_test_e2e",
    toolDescription:
      "E2Eテストを実行します（Playwright E2E Test）。fileでファイル指定、testNameでテスト名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.runE2ETests(filter);
      return formatTestResult(result);
    },
  },

  // ----- 全テスト -----
  {
    id: "procedure_test_all",
    toolDescription: "全テストを実行します（Server + Web）。",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const result = await runner.runAllTests();
      return formatTestResult(result);
    },
  },

  // ----- スナップショット更新 -----
  {
    id: "procedure_test_update_snapshots",
    toolDescription:
      "スナップショットを更新します。fileでファイル指定、testNameでテスト名フィルタができます。",
    inputSchema: filterSchema,
    handler: async (input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const filter = buildFilter(input);
      const result = await runner.updateSnapshots(filter);
      return formatTestResult(result);
    },
  },

  // ----- スナップショットリフレッシュ -----
  {
    id: "procedure_test_refresh_snapshots",
    toolDescription:
      "スナップショットを全削除して再生成します。全スナップショットをクリーンな状態から作り直します。",
    inputSchema: {},
    handler: async (_input, projectRoot): Promise<string> => {
      const runner = getTestRunner(projectRoot);
      const result = await runner.refreshSnapshots();
      return formatTestResult(result);
    },
  },
];
