/**
 * ワークフロー管理の責務定義
 */
import { z } from "zod";
import { getWorkflowMemory, type WorkflowTask, type Requirement } from "./memory";
import { executePlan } from "./planner";
import {
  formatTaskList,
  formatRequirementsResult,
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
 * 要件定義入力スキーマ
 *
 * 対話を通じて深掘りし、以下の観点を明確化する：
 * - actor: 誰がその機能を使うか
 * - want: 何をしたいか（ニーズ）
 * - because: なぜ必要か（課題・背景）
 * - acceptance: どうなれば成功か（成功基準）
 * - constraints: 守るべきルールや制約（オプション）
 */
const RequirementSchema = z.object({
  actor: z.string().describe("誰が（アクター・ユーザー種別）"),
  want: z.string().describe("何をしたい（ニーズ・欲求）"),
  because: z.string().describe("なぜ（課題・背景）"),
  acceptance: z.string().describe("成功基準（どうなれば達成か）"),
  constraints: z
    .array(z.string())
    .optional()
    .describe("制約（オプション）"),
});

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
    .describe(
      '参照先runbook相対パス（例: "procedure/workflow/runbooks/50-server.md"）',
    ),
  done: z
    .boolean()
    .optional()
    .describe("完了状態（計画見直し時に完了済みタスクを保持するために使用）"),
});

/**
 * ワークフロー管理責務定義（統合版）
 *
 * 6つのアクション:
 * - plan: サブエージェント誘発
 * - requirements: 要件定義の登録
 * - set: タスク登録/上書き
 * - done: 完了マーク
 * - list: 全タスク表示
 * - clear: クリア
 */
export const WORKFLOW_RESPONSIBILITIES: WorkflowResponsibility[] = [
  {
    id: "procedure_workflow",
    toolDescription:
      "Workflow task management. action: 'plan' (invoke subagent for planning), 'requirements' (register requirements with goal), 'set' (register/overwrite tasks), 'done' (mark task complete), 'list' (show all tasks), 'clear' (clear all tasks).",
    inputSchema: {
      action: z
        .enum(["plan", "requirements", "set", "done", "list", "clear"])
        .describe("Action to perform: plan, requirements, set, done, list, clear"),
      goal: z
        .string()
        .optional()
        .describe("Overall goal for this workflow (for 'requirements' action)"),
      requirements: z
        .array(RequirementSchema)
        .optional()
        .describe("Requirements to register (for 'requirements' action)"),
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
      const action = input.action as
        | "plan"
        | "requirements"
        | "set"
        | "done"
        | "list"
        | "clear";

      switch (action) {
        case "plan": {
          const result = await executePlan(guardrailsRoot);
          if (!result.success) {
            throw new Error(result.error ?? "Unknown error");
          }
          return result.guidance;
        }

        case "requirements": {
          const goal = input.goal as string | undefined;
          const requirements = input.requirements as Requirement[] | undefined;
          if (goal === undefined) {
            throw new Error("goal is required for 'requirements' action");
          }
          if (requirements === undefined || requirements.length === 0) {
            throw new Error("requirements is required for 'requirements' action");
          }
          memory.setGoal(goal);
          memory.setRequirements(requirements);
          return formatRequirementsResult(goal, requirements);
        }

        case "set": {
          const tasks = input.tasks as WorkflowTask[] | undefined;
          if (tasks === undefined || tasks.length === 0) {
            throw new Error("tasks is required for 'set' action");
          }
          if (!memory.hasRequirements()) {
            throw new Error(
              "requirements must be set before tasks. Use 'requirements' action first.",
            );
          }
          memory.setTasks(tasks);
          return formatSetResult(memory.getGoal() ?? "", memory.getTasks());
        }

        case "done": {
          const index = input.index as number | undefined;
          if (index === undefined) {
            throw new Error("index is required for 'done' action");
          }
          const tasksBefore = memory.getTasks();
          const task = tasksBefore.find((t) => t.index === index);
          const success = memory.markDone(index);
          const tasksAfter = memory.getTasks();
          return formatDoneResult(success, index, task, tasksAfter);
        }

        case "list": {
          const goal = memory.getGoal();
          const requirements = memory.getRequirements();
          const tasks = memory.getTasks();
          return formatTaskList(goal, requirements, tasks);
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
