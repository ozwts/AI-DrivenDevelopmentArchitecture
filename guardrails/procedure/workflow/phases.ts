/**
 * Workflow Phases（ワークフローフェーズ）
 *
 * フェーズとスコープの定義
 */

/**
 * フェーズID
 */
export type Phase =
  | "contract"
  | "policy"
  | "frontend"
  | "server-core"
  | "server-implement"
  | "infra"
  | "final-review"
  | "e2e";

/**
 * 実装スコープ
 * - policy: Contract + Policy まで
 * - frontend: + Frontend（mockモード）
 * - server-core: + Server Domain Model + Ports
 * - full: + Server Implement + Infra + E2E
 */
export type Scope = "policy" | "frontend" | "server-core" | "full";

/**
 * フェーズ定義
 */
export type PhaseDefinition = {
  /** フェーズID */
  id: Phase;
  /** 表示名 */
  name: string;
  /** 参照するrunbook */
  runbook: string;
  /** このフェーズが必要なスコープ */
  requiredForScope: Scope[];
  /** 開発モード（mock or full） */
  devMode?: "mock" | "full";
};

/**
 * フェーズ定義一覧（実行順）
 */
export const PHASES: PhaseDefinition[] = [
  {
    id: "contract",
    name: "Contract",
    runbook: "procedure/workflow/runbooks/30-contract.md",
    requiredForScope: ["policy", "frontend", "server-core", "full"],
  },
  {
    id: "policy",
    name: "Policy",
    runbook: "procedure/workflow/runbooks/40-policy.md",
    requiredForScope: ["policy", "frontend", "server-core", "full"],
  },
  {
    id: "frontend",
    name: "Frontend",
    runbook: "procedure/workflow/runbooks/50-frontend.md",
    requiredForScope: ["frontend", "server-core", "full"],
    devMode: "mock",
  },
  {
    id: "server-core",
    name: "Server/Core",
    runbook: "procedure/workflow/runbooks/60-server-core.md",
    requiredForScope: ["server-core", "full"],
    devMode: "full",
  },
  {
    id: "server-implement",
    name: "Server/Implement",
    runbook: "procedure/workflow/runbooks/65-server-implement.md",
    requiredForScope: ["full"],
    devMode: "full",
  },
  {
    id: "infra",
    name: "Infra",
    runbook: "procedure/workflow/runbooks/70-infra.md",
    requiredForScope: ["full"],
  },
  {
    id: "final-review",
    name: "Final Review",
    runbook: "procedure/workflow/runbooks/80-final-review.md",
    requiredForScope: ["full"],
  },
  {
    id: "e2e",
    name: "E2E",
    runbook: "procedure/workflow/runbooks/90-e2e.md",
    requiredForScope: ["full"],
  },
];

/**
 * スコープに含まれるフェーズを取得
 */
export const getPhasesForScope = (scope: Scope): Phase[] =>
  PHASES.filter((p) => p.requiredForScope.includes(scope)).map((p) => p.id);

/**
 * フェーズ定義を取得
 */
export const getPhaseDefinition = (phase: Phase): PhaseDefinition | undefined =>
  PHASES.find((p) => p.id === phase);

/**
 * 次のフェーズを取得
 */
export const getNextPhase = (
  currentPhase: Phase | null,
  scope: Scope,
): Phase | null => {
  const phasesInScope = getPhasesForScope(scope);

  if (currentPhase === null) {
    return phasesInScope[0] ?? null;
  }

  const currentIndex = phasesInScope.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === phasesInScope.length - 1) {
    return null;
  }

  return phasesInScope[currentIndex + 1] ?? null;
};

/**
 * フェーズがスコープに含まれるか確認
 */
export const isPhaseInScope = (phase: Phase, scope: Scope): boolean => {
  const definition = getPhaseDefinition(phase);
  return definition?.requiredForScope.includes(scope) ?? false;
};
