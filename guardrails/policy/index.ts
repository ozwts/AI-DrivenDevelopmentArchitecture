/**
 * Policy Module（立法）
 *
 * ポリシー定義とその情報提供機能
 */

// AST Checker
export {
  type Violation,
  type CheckMetadata,
  type CheckModule,
  type ASTCheckerDefinition,
  type ASTCheckerContext,
  createASTChecker,
} from "./ast-checker";

// ポリシー一覧機能
export {
  type ListPoliciesResponsibility,
  type ListPoliciesHandlerInput,
  type WorkspaceInfo,
  type CheckInfo,
  LIST_HORIZONTAL_POLICIES_RESPONSIBILITY,
  LIST_VERTICAL_POLICIES_RESPONSIBILITY,
} from "./responsibilities";

export {
  scanHorizontalStatic,
  scanHorizontalSemantic,
  scanVerticalSemantic,
} from "./scanner";

export { formatPolicyList } from "./formatter";

export {
  createListHorizontalPoliciesHandler,
  createListVerticalPoliciesHandler,
} from "./handler";
