/**
 * Project Member API エンドポイント
 */
import { z } from "zod";
import { schemas } from "@/generated/zod-schemas";
import { request, requestVoid } from "@/app/lib/api";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;
type InviteMemberParams = z.infer<typeof schemas.InviteMemberParams>;
type ChangeMemberRoleParams = z.infer<typeof schemas.ChangeMemberRoleParams>;

export const projectMemberApi = {
  /**
   * プロジェクトメンバー一覧を取得
   */
  getMembers: async (projectId: string): Promise<ProjectMemberResponse[]> => {
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMembersResponse
    );
  },

  /**
   * メンバーを招待
   */
  inviteMember: async (
    projectId: string,
    params: InviteMemberParams
  ): Promise<ProjectMemberResponse> => {
    return request(
      `/projects/${projectId}/members`,
      schemas.ProjectMemberResponse,
      {
        method: "POST",
        body: JSON.stringify(params),
      }
    );
  },

  /**
   * プロジェクトから脱退
   */
  leaveProject: async (projectId: string): Promise<void> => {
    return requestVoid(`/projects/${projectId}/members/me`, {
      method: "DELETE",
    });
  },

  /**
   * メンバーを削除
   */
  removeMember: async (
    projectId: string,
    memberId: string
  ): Promise<void> => {
    return requestVoid(`/projects/${projectId}/members/${memberId}`, {
      method: "DELETE",
    });
  },

  /**
   * メンバーの権限を変更
   */
  changeMemberRole: async (
    projectId: string,
    memberId: string,
    params: ChangeMemberRoleParams
  ): Promise<ProjectMemberResponse> => {
    return request(
      `/projects/${projectId}/members/${memberId}/role`,
      schemas.ProjectMemberResponse,
      {
        method: "PATCH",
        body: JSON.stringify(params),
      }
    );
  },
};
