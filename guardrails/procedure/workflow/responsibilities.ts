/**
 * ワークフロー管理の責務定義
 */
import { z } from "zod";
import { getWorkflowMemory, type WorkflowTask } from "./memory";
import { executePlan } from "./planner";
import {
  formatTaskList,
  formatSetResult,
  formatDoneResult,
  formatClearResult,
} from "./formatter";

/**
 * Procedure責務定義の型
 */
export type WorkflowResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (
    input: Record<string, unknown>,
    guardrailsRoot: string,
  ) => Promise<string>;
};

/**
 * タスク入力スキーマ
 */
const TaskSchema = z.object({
  what: z.string().describe("何をするか（具体的なアクション）"),
  why: z.string().describe("なぜするか（目的・理由）"),
  doneWhen: z.string().describe("完了条件"),
  ref: z
    .string()
    .optional()
    .describe('参照先runbook名（例: "server-implementation"）'),
});

/**
 * ワークフロー管理責務定義（統合版）
 *
 * 5つのアクション:
 * - plan: サブエージェント誘発
 * - set: タスク登録/上書き
 * - done: 完了マーク
 * - list: 全タスク表示
 * - clear: クリア
 */
export const WORKFLOW_RESPONSIBILITIES: WorkflowResponsibility[] = [
  {
    id: "procedure_workflow",
    toolDescription:
      "Workflow task management. action: 'plan' (invoke subagent for planning), 'set' (register/overwrite tasks with goal), 'done' (mark task complete), 'list' (show all tasks), 'clear' (clear all tasks).",
    inputSchema: {
      action: z
        .enum(["plan", "set", "done", "list", "clear"])
        .describe("Action to perform: plan, set, done, list, clear"),
      goal: z
        .string()
        .optional()
        .describe("Overall goal for this workflow (for 'set' action)"),
      tasks: z
        .array(TaskSchema)
        .optional()
        .describe("Tasks to register (for 'set' action)"),
      index: z
        .number()
        .optional()
        .describe("Task index to mark as done (for 'done' action)"),
    },
    handler: async (input, guardrailsRoot): Promise<string> => {
      const memory = getWorkflowMemory();
      const action = input.action as "plan" | "set" | "done" | "list" | "clear";

      switch (action) {
        case "plan": {
          const result = await executePlan(guardrailsRoot);
          if (!result.success) {
            throw new Error(result.error ?? "Unknown error");
          }
          return result.guidance;
        }

        case "set": {
          const goal = input.goal as string | undefined;
          const tasks = input.tasks as WorkflowTask[] | undefined;
          if (tasks === undefined || tasks.length === 0) {
            throw new Error("tasks is required for 'set' action");
          }
          if (goal === undefined) {
            throw new Error("goal is required for 'set' action");
          }
          memory.setTasks(tasks, goal);
          return formatSetResult(goal, tasks.length);
        }

        case "done": {
          const index = input.index as number | undefined;
          if (index === undefined) {
            throw new Error("index is required for 'done' action");
          }
          const tasks = memory.getTasks();
          const task = tasks.find((t) => t.index === index);
          const success = memory.markDone(index);
          return formatDoneResult(success, index, task);
        }

        case "list": {
          const goal = memory.getGoal();
          const tasks = memory.getTasks();
          const runbooksDir = `${guardrailsRoot}/procedure/workflow/runbooks`;
          return formatTaskList(goal, tasks, runbooksDir);
        }

        case "clear": {
          memory.clear();
          return formatClearResult();
        }

        default:
          throw new Error(`Unknown action: ${action satisfies never}`);
      }
    },
  },
];
