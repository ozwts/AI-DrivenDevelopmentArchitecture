/**
 * ポリシーリストハンドラー
 */

import type { ListPoliciesHandlerInput, WorkspaceInfo } from "./responsibilities";
import {
  scanHorizontalStatic,
  scanHorizontalSemantic,
  scanVerticalSemantic,
} from "./scanner";
import { formatPolicyList } from "./formatter";

/**
 * Horizontal ポリシーリストハンドラー
 */
export const createListHorizontalPoliciesHandler =
  () =>
  async (args: ListPoliciesHandlerInput): Promise<string> => {
    const { type, guardrailsRoot } = args;

    if (
      guardrailsRoot === null ||
      guardrailsRoot === undefined ||
      typeof guardrailsRoot !== "string" ||
      guardrailsRoot === ""
    ) {
      throw new Error("guardrailsRootは必須です");
    }

    // タイプに応じてスキャン
    const staticWorkspaces =
      typeof type === "undefined" || type === "static"
        ? scanHorizontalStatic(guardrailsRoot)
        : [];
    const semanticWorkspaces =
      typeof type === "undefined" || type === "semantic"
        ? scanHorizontalSemantic(guardrailsRoot)
        : [];

    // 結果整形
    return formatPolicyList(
      "Horizontal Policies",
      staticWorkspaces,
      semanticWorkspaces
    );
  };

/**
 * Vertical ポリシーリストハンドラー
 */
export const createListVerticalPoliciesHandler =
  () =>
  async (args: ListPoliciesHandlerInput): Promise<string> => {
    const { type, guardrailsRoot } = args;

    if (
      guardrailsRoot === null ||
      guardrailsRoot === undefined ||
      typeof guardrailsRoot !== "string" ||
      guardrailsRoot === ""
    ) {
      throw new Error("guardrailsRootは必須です");
    }

    // タイプに応じてスキャン（現在はsemanticのみ）
    const staticWorkspaces: WorkspaceInfo[] = []; // 将来用
    const semanticWorkspaces =
      typeof type === "undefined" || type === "semantic"
        ? scanVerticalSemantic(guardrailsRoot)
        : [];

    // 結果整形
    return formatPolicyList(
      "Vertical Policies",
      staticWorkspaces,
      semanticWorkspaces
    );
  };
