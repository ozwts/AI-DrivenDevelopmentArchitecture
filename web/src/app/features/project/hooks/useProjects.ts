import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "@/app/lib/api";
import { buildLogger } from "@/app/lib/logger";
import { schemas } from "@/generated/zod-schemas";

type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;

const logger = buildLogger("useProjects");
const QUERY_KEY = "projects";

export function useProjects() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: () => apiClient.getProjects(),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: () => apiClient.getProject(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectParams) => {
      logger.info("プロジェクト作成開始", { name: data.name });
      return apiClient.createProject(data);
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
    }: {
      projectId: string;
      data: UpdateProjectParams;
    }) => {
      logger.info("プロジェクト更新開始", { projectId, name: data.name });
      return apiClient.updateProject(projectId, data);
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
      return apiClient.deleteProject(projectId);
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
