/**
 * Project API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import {
  request,
  requestVoid,
  normalizePatchRequest,
  normalizePostRequest,
} from "@/app/lib/api";

type ProjectResponse = z.infer<typeof schemas.ProjectResponse>;
type CreateProjectParams = z.infer<typeof schemas.CreateProjectParams>;
type UpdateProjectParams = z.infer<typeof schemas.UpdateProjectParams>;
type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;
type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;

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
    const normalized = normalizePostRequest(data);
    return request("/projects", schemas.ProjectResponse, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
  },

  updateProject: async (
    projectId: string,
    data: UpdateProjectParams,
    dirtyFields: Partial<Record<keyof UpdateProjectParams, boolean>>,
  ): Promise<ProjectResponse> => {
    const normalized = normalizePatchRequest(data, dirtyFields);
    return request(`/projects/${projectId}`, schemas.ProjectResponse, {
      method: "PATCH",
      body: JSON.stringify(normalized),
    });
  },

  deleteProject: async (projectId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}`, {
      method: "DELETE",
    });
  },

  // プロジェクトメンバー
  getProjectMembers: async (
    projectId: string,
  ): Promise<ProjectMemberResponse[]> => {
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMembersResponse,
    );
  },

  inviteMember: async (
    projectId: string,
    data: InviteMemberParams,
  ): Promise<ProjectMemberResponse> => {
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMemberResponse,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  leaveProject: async (projectId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}/members/me`, {
      method: "DELETE",
    });
  },
};
