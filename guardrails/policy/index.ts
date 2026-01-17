/**
 * Policy Module（立法）
 *
 * ポリシー定義とその情報提供機能
 */

// ========================================
// List Policies（ポリシー一覧）
// ========================================
export {
  // 責務定義
  type ListPoliciesResponsibility,
  LIST_HORIZONTAL_POLICIES_RESPONSIBILITY,
  LIST_VERTICAL_POLICIES_RESPONSIBILITY,
  // ハンドラー
  createListHorizontalPoliciesHandler,
  createListVerticalPoliciesHandler,
  type ListPoliciesHandlerInput,
} from "./horizontal";

export {
  scanHorizontalStatic,
  scanHorizontalSemantic,
  scanVerticalSemantic,
  type WorkspaceInfo,
  type LayerInfo,
  type CheckInfo,
} from "./horizontal/scanner";

export { formatPolicyList } from "./horizontal/formatter";
