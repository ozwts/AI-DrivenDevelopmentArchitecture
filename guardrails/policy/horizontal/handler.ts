/**
 * ポリシーリストハンドラー
 */

import {
  scanHorizontalStatic,
  scanHorizontalSemantic,
  scanVerticalSemantic,
} from "./scanner";
import { formatPolicyList } from "./formatter";

/**
 * ポリシーリストハンドラー入力
 */
export type ListPoliciesHandlerInput = {
  type?: "static" | "semantic";
  guardrailsRoot: string;
};

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
      !type || type === "static" ? scanHorizontalStatic(guardrailsRoot) : [];
    const semanticWorkspaces =
      !type || type === "semantic"
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
    const staticWorkspaces: any[] = []; // 将来用
    const semanticWorkspaces =
      !type || type === "semantic" ? scanVerticalSemantic(guardrailsRoot) : [];

    // 結果整形
    return formatPolicyList(
      "Vertical Policies",
      staticWorkspaces,
      semanticWorkspaces
    );
  };
