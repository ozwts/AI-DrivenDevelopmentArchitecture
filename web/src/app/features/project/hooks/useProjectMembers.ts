import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { projectMembershipApi } from "../api/project-membership";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;
type UpdateMemberRoleParams = z.infer<typeof schemas.UpdateMemberRoleParams>;

const logger = buildLogger("useProjectMembers");
const QUERY_KEY = "project-members";

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: () => projectMembershipApi.getMembers(projectId),
    enabled: !!projectId,
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: InviteMemberParams;
    }) => {
      logger.info("メンバー招待開始", { projectId, userId: data.userId });
      return projectMembershipApi.inviteMember(projectId, data);
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

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      data,
      dirtyFields,
    }: {
      projectId: string;
      userId: string;
      data: UpdateMemberRoleParams;
      dirtyFields: Partial<Record<keyof UpdateMemberRoleParams, boolean>>;
    }) => {
      logger.info("ロール変更開始", { projectId, userId, role: data.role });
      return projectMembershipApi.updateMemberRole(
        projectId,
        userId,
        data,
        dirtyFields,
      );
    },
    onSuccess: (_, { projectId, userId }) => {
      logger.info("ロール変更成功", { projectId, userId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
    },
    onError: (error, { projectId, userId }) => {
      logger.error("ロール変更失敗", { projectId, userId, error });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
    }: {
      projectId: string;
      userId: string;
    }) => {
      logger.info("メンバー削除開始", { projectId, userId });
      return projectMembershipApi.removeMember(projectId, userId);
    },
    onSuccess: (_, { projectId, userId }) => {
      logger.info("メンバー削除成功", { projectId, userId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      // 担当者が変更される可能性があるのでTODOもinvalidate
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error, { projectId, userId }) => {
      logger.error("メンバー削除失敗", { projectId, userId, error });
    },
  });
}

export function useLeaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => {
      logger.info("プロジェクト脱退開始", { projectId });
      return projectMembershipApi.leaveProject(projectId);
    },
    onSuccess: (_, projectId) => {
      logger.info("プロジェクト脱退成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // 担当者が変更される可能性があるのでTODOもinvalidate
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error, projectId) => {
      logger.error("プロジェクト脱退失敗", { projectId, error });
    },
  });
}
