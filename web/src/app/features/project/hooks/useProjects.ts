import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { projectApi } from "../api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;
type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;

const logger = buildLogger("useProjects");
const QUERY_KEY = "projects";

export function useProjects() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => projectApi.getProjects(),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: () => projectApi.getProject(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectParams) => {
      logger.info("プロジェクト作成開始", { name: data.name });
      return projectApi.createProject(data);
    },
    onSuccess: () => {
      logger.info("プロジェクト作成成功");
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error) => {
      logger.error("プロジェクト作成失敗", error);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
      dirtyFields,
    }: {
      projectId: string;
      data: UpdateProjectParams;
      dirtyFields: Partial<Record<keyof UpdateProjectParams, boolean>>;
    }) => {
      logger.info("プロジェクト更新開始", { projectId, name: data.name });
      return projectApi.updateProject(projectId, data, dirtyFields);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("プロジェクト更新成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error, { projectId }) => {
      logger.error("プロジェクト更新失敗", { projectId, error });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => {
      logger.info("プロジェクト削除開始", { projectId });
      return projectApi.deleteProject(projectId);
    },
    onSuccess: (_, projectId) => {
      logger.info("プロジェクト削除成功", { projectId });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
    onError: (error, projectId) => {
      logger.error("プロジェクト削除失敗", { projectId, error });
    },
  });
}

// プロジェクトメンバー
const MEMBERS_QUERY_KEY = "project-members";

export function useProjectMembers(projectId: string) {
  return useQuery({
    queryKey: [MEMBERS_QUERY_KEY, projectId],
    queryFn: () => projectApi.getProjectMembers(projectId),
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
      return projectApi.inviteMember(projectId, data);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("メンバー招待成功", { projectId });
      queryClient.invalidateQueries({
        queryKey: [MEMBERS_QUERY_KEY, projectId],
      });
    },
    onError: (error, { projectId }) => {
      logger.error("メンバー招待失敗", { projectId, error });
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
      return projectApi.removeMember(projectId, userId);
    },
    onSuccess: (_, { projectId }) => {
      logger.info("メンバー削除成功", { projectId });
      queryClient.invalidateQueries({
        queryKey: [MEMBERS_QUERY_KEY, projectId],
      });
    },
    onError: (error, { projectId }) => {
      logger.error("メンバー削除失敗", { projectId, error });
    },
  });
}

export function useLeaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => {
      logger.info("プロジェクト脱退開始", { projectId });
      return projectApi.leaveProject(projectId);
    },
    onSuccess: (_, projectId) => {
      logger.info("プロジェクト脱退成功", { projectId });
      queryClient.invalidateQueries({
        queryKey: [MEMBERS_QUERY_KEY, projectId],
      });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
    onError: (error, projectId) => {
      logger.error("プロジェクト脱退失敗", { projectId, error });
    },
  });
}
