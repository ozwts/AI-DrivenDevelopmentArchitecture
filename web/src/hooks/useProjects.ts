import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { apiClient } from "../api/client";
import { schemas } from "../generated/zod-schemas";

type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;

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
    mutationFn: (data: CreateProjectParams) => apiClient.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
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
    }) => apiClient.updateProject(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: string) => apiClient.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}
