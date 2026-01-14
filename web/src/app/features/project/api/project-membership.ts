/**
 * Project Membership API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import {
  request,
  requestVoid,
  normalizePatchRequest,
  normalizePostRequest,
} from "@/app/lib/api";

type ProjectMembershipResponse = z.infer<
  typeof schemas.ProjectMembershipResponse
>;
type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;
type UpdateMemberRoleParams = z.infer<typeof schemas.UpdateMemberRoleParams>;

export const projectMembershipApi = {
  getMembers: async (projectId: string): Promise<ProjectMembershipResponse[]> => {
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMembershipsResponse,
    );
  },

  inviteMember: async (
    projectId: string,
    data: InviteMemberParams,
  ): Promise<ProjectMembershipResponse> => {
    const normalized = normalizePostRequest(data);
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMembershipResponse,
      {
        method: "POST",
        body: JSON.stringify(normalized),
      },
    );
  },

  updateMemberRole: async (
    projectId: string,
    userId: string,
    data: UpdateMemberRoleParams,
    dirtyFields: Partial<Record<keyof UpdateMemberRoleParams, boolean>>,
  ): Promise<ProjectMembershipResponse> => {
    const normalized = normalizePatchRequest(data, dirtyFields);
    return request(
      `/projects/${projectId}/members/${userId}`,
      schemas.ProjectMembershipResponse,
      {
        method: "PATCH",
        body: JSON.stringify(normalized),
      },
    );
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}/members/${userId}`, {
      method: "DELETE",
    });
  },

  leaveProject: async (projectId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}/leave`, {
      method: "POST",
    });
  },
};
