/**
 * Project API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { request, requestVoid } from "@/app/lib/api";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;

export const projectApi = {
  getProjects: async (): Promise<ProjectResponse[]> => {
    return request("/projects", schemas.ProjectsResponse);
  },

  getProject: async (projectId: string): Promise<ProjectResponse> => {
    return request(`/projects/${projectId}`, schemas.ProjectResponse);
  },

  createProject: async (
    data: CreateProjectParams,
  ): Promise<ProjectResponse> => {
    return request("/projects", schemas.ProjectResponse, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateProject: async (
    projectId: string,
    data: UpdateProjectParams,
  ): Promise<ProjectResponse> => {
    return request(`/projects/${projectId}`, schemas.ProjectResponse, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteProject: async (projectId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },
};
