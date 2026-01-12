/**
 * ワークフロー管理の責務定義
 */
import { z } from "zod";
import {
  getWorkflowMemory,
  type WorkflowTask,
  type Requirement,
  type Notes,
  type Phase,
  type Scope,
} from "./memory";
import { executePlan } from "./planner";
import { getPRForCurrentBranch } from "./context-collector";
import {
  formatTaskList,
  formatRequirementsResult,
  formatSetResult,
  formatDoneResult,
  formatClearResult,
  formatAdvanceResult,
  formatAdvanceBlockedResult,
  formatWorkflowCompleteResult,
} from "./formatter";
import { getPhaseDefinition } from "./phases";

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
 * フェーズスキーマ
 */
const PhaseSchema = z.enum([
  "contract",
  "policy",
  "frontend",
  "server-domain",
  "server-implement",
  "infra",
  "e2e",
]);

/**
 * スコープスキーマ
 */
const ScopeSchema = z.enum(["policy", "frontend", "server-domain", "full"]);

/**
 * タスク入力スキーマ
 */
const TaskSchema = z.object({
  what: z.string().describe("何をするか（具体的なアクション）"),
  why: z.string().describe("なぜするか（目的・理由）"),
  doneWhen: z.string().describe("完了条件"),
  refs: z
    .array(z.string())
    .optional()
    .describe(
      '参照先runbook相対パス（例: ["procedure/workflow/runbooks/50-server-domain.md"]）',
    ),
  done: z
    .boolean()
    .optional()
    .describe("完了状態（計画見直し時に完了済みタスクを保持するために使用）"),
  phase: PhaseSchema.optional().describe("所属フェーズ"),
});

/**
 * 特記事項スキーマ
 */
const NotesSchema = z.object({
  designDecisions: z
    .array(z.string())
    .optional()
    .describe("設計判断: 重要な設計判断とその理由"),
  remainingWork: z
    .array(z.string())
    .optional()
    .describe("後続作業・残件: やりきれなかったこと"),
  breakingChanges: z
    .array(z.string())
    .optional()
    .describe("破壊的変更: 既存機能への影響"),
});

/**
 * ワークフロー管理責務定義（統合版）
 *
 * 8つのアクション:
 * - plan: サブエージェント誘発（フェーズ単位）
 * - requirements: 要件定義の登録（スコープ設定含む）
 * - set: タスク登録/上書き
 * - done: 完了マーク
 * - list: 全タスク表示
 * - advance: フェーズ遷移
 * - set-pr: PR情報設定
 * - clear: クリア
 */
export const WORKFLOW_RESPONSIBILITIES: WorkflowResponsibility[] = [
  {
    id: "procedure_workflow",
    toolDescription:
      "Workflow task management. " +
      "action: 'plan' (invoke subagent for planning), " +
      "'requirements' (register requirements with goal), " +
      "'set' (register/overwrite tasks), " +
      "'done' (mark task complete), " +
      "'list' (show all tasks), " +
      "'advance' (move to next phase), " +
      "'clear' (clear all tasks).",
    inputSchema: {
      action: z
        .enum([
          "plan",
          "requirements",
          "set",
          "done",
          "list",
          "advance",
          "clear",
        ])
        .describe(
          "Action to perform: plan, requirements, set, done, list, advance, clear",
        ),
      goal: z
        .string()
        .optional()
        .describe("Overall goal for this workflow (for 'requirements' action)"),
      scope: ScopeSchema.optional().describe(
        "Implementation scope: 'policy' (Contract+Policy), 'frontend' (+Frontend), 'server-domain' (+Server Domain), 'full' (all phases). Default: 'full' (for 'requirements' action)",
      ),
      phase: PhaseSchema.optional().describe(
        "Target phase for planning (for 'plan' action). If not specified, uses next phase.",
      ),
      requirements: z
        .array(RequirementSchema)
        .optional()
        .describe("Requirements to register (for 'requirements' action)"),
      tasks: z
        .array(TaskSchema)
        .optional()
        .describe("Tasks to register (for 'set' action)"),
      notes: NotesSchema.optional().describe(
        "Notes for handover (for 'set' action): designDecisions, remainingWork, breakingChanges",
      ),
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
        | "advance"
        | "clear";

      switch (action) {
        case "plan": {
          const phase = input.phase as Phase | undefined;
          const result = await executePlan(guardrailsRoot, phase);
          if (!result.success) {
            throw new Error(result.error ?? "Unknown error");
          }
          return result.guidance;
        }

        case "requirements": {
          const goal = input.goal as string | undefined;
          const requirements = input.requirements as Requirement[] | undefined;
          const scope = (input.scope as Scope | undefined) ?? "full";

          if (goal === undefined) {
            throw new Error("goal is required for 'requirements' action");
          }
          if (requirements === undefined || requirements.length === 0) {
            throw new Error(
              "requirements is required for 'requirements' action",
            );
          }

          memory.setGoal(goal);
          memory.setRequirements(requirements);
          memory.setScope(scope);
          memory.setCurrentPhase("contract"); // Always start with contract

          return formatRequirementsResult(goal, requirements, scope);
        }

        case "set": {
          const tasks = input.tasks as WorkflowTask[] | undefined;
          const notes = input.notes as Partial<Notes> | undefined;

          if (tasks === undefined || tasks.length === 0) {
            throw new Error("tasks is required for 'set' action");
          }
          if (!memory.hasRequirements()) {
            throw new Error(
              "requirements must be set before tasks. Use 'requirements' action first.",
            );
          }

          memory.setTasks(tasks);
          if (notes !== undefined) {
            memory.setNotes(notes);
          }

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
          const notes = memory.getNotes();
          const phaseState = memory.getPhaseState();
          const pr = getPRForCurrentBranch();

          return formatTaskList(
            goal,
            requirements,
            tasks,
            notes,
            phaseState,
            pr,
          );
        }

        case "advance": {
          const currentPhase = memory.getCurrentPhase();

          if (currentPhase === null) {
            throw new Error(
              "No active phase to advance from. Use 'requirements' action first.",
            );
          }

          // Check all tasks for current phase are done
          const phaseTasks = memory.getTasksForPhase(currentPhase);
          const pendingTasks = phaseTasks.filter((t) => !t.done);

          if (pendingTasks.length > 0) {
            return formatAdvanceBlockedResult(currentPhase, pendingTasks);
          }

          // Mark phase complete
          memory.completePhase(currentPhase);

          // Get next phase
          const nextPhase = memory.getNextPhase();

          if (nextPhase === null) {
            return formatWorkflowCompleteResult(memory.getCompletedPhases());
          }

          // Set new phase
          memory.setCurrentPhase(nextPhase);

          // Get phase definition for runbook reference
          const nextPhaseDef = getPhaseDefinition(nextPhase);

          return formatAdvanceResult(
            currentPhase,
            nextPhase,
            nextPhaseDef?.runbook,
          );
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
