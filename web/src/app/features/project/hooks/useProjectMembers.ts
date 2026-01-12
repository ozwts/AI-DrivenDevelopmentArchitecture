import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { projectMemberApi } from "../api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;
type ChangeMemberRoleParams = z.infer<typeof schemas.ChangeMemberRoleParams>;
type MemberRole = z.infer<typeof schemas.MemberRole>;

const logger = buildLogger("useProjectMembers");
const QUERY_KEY = "projectMembers";
const PROJECTS_QUERY_KEY = "projects";

/**
 * プロジェクトメンバー一覧を取得するフック
 */
export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: () => projectMemberApi.getMembers(projectId),
    enabled: !!projectId,
  });
}

/**
 * メンバーを招待するフック
 */
export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      params,
    }: {
      projectId: string;
      params: InviteMemberParams;
    }) => {
      logger.info("メンバー招待開始", { projectId, userId: params.userId });
      return projectMemberApi.inviteMember(projectId, params);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("メンバー招待成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
    onError: (error, { projectId }) => {
      logger.error("メンバー招待失敗", { projectId, error });
    },
  });
}

/**
 * プロジェクトから脱退するフック
 */
export function useLeaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => {
      logger.info("プロジェクト脱退開始", { projectId });
      return projectMemberApi.leaveProject(projectId);
    },
    onSuccess: (_, projectId) => {
      logger.info("プロジェクト脱退成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
    onError: (error, projectId) => {
      logger.error("プロジェクト脱退失敗", { projectId, error });
    },
  });
}

/**
 * メンバーを削除するフック
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
    }: {
      projectId: string;
      memberId: string;
    }) => {
      logger.info("メンバー削除開始", { projectId, memberId });
      return projectMemberApi.removeMember(projectId, memberId);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("メンバー削除成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
    onError: (error, { projectId }) => {
      logger.error("メンバー削除失敗", { projectId, error });
    },
  });
}

/**
 * メンバーの権限を変更するフック
 */
export function useChangeMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
      role,
    }: {
      projectId: string;
      memberId: string;
      role: MemberRole;
    }) => {
      const params: ChangeMemberRoleParams = { role };
      logger.info("権限変更開始", { projectId, memberId, role });
      return projectMemberApi.changeMemberRole(projectId, memberId, params);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("権限変更成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
    onError: (error, { projectId }) => {
      logger.error("権限変更失敗", { projectId, error });
    },
  });
}
