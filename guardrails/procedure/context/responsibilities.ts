/**
 * コンテキスト復元の責務定義
 *
 * compactingなどでコンテキストが失われた場合に、
 * 憲法・契約・ワークフロー情報を復元する
 */
import { z } from "zod";
import { execSync } from "child_process";
import * as path from "path";
import { getWorkflowMemory } from "../workflow/memory";
import { formatTaskList } from "../workflow/formatter";

/**
 * Procedure責務定義の型
 */
export type ContextResponsibility = {
  id: string;
  toolDescription: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  handler: (
    input: Record<string, unknown>,
    guardrailsRoot: string,
  ) => Promise<string>;
};

/**
 * コンテキスト復元責務定義
 *
 * workflow-init.shを実行して、憲法・契約・ワークフロー情報を返す
 */
export const CONTEXT_RESPONSIBILITIES: ContextResponsibility[] = [
  {
    id: "procedure_context",
    toolDescription:
      "Restore context information (constitution, contracts, workflow instructions, and current workflow state) that may have been lost during compacting. Call this when you need to recall the project's guiding principles, business contracts, and current task progress.",
    inputSchema: {},
    handler: async (_input, guardrailsRoot): Promise<string> => {
      const projectRoot = path.dirname(guardrailsRoot);
      const scriptPath = path.join(projectRoot, ".claude/hooks/workflow-init.sh");

      try {
        const output = execSync(`bash "${scriptPath}"`, {
          encoding: "utf-8",
          cwd: projectRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });

        // ワークフロー状態を取得して追加
        const memory = getWorkflowMemory();
        const workflowState = formatTaskList(
          memory.getGoal(),
          memory.getRequirements(),
          memory.getTasks(),
          memory.getNotes(),
          memory.getPhaseState(),
          null, // PR情報はコンテキスト復元時には不要
        );

        // ワークフローが登録されている場合のみ追加
        if (memory.getGoal() !== null || memory.hasTasks()) {
          return `${output}\n## 現在のワークフロー状態\n\n${workflowState}`;
        }

        return output;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to execute workflow-init.sh: ${errorMessage}`);
      }
    },
  },
];
