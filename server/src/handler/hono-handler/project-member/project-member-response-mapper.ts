import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";
import type { ProjectMember } from "@/domain/model/project-member/project-member.entity";
import type { User } from "@/domain/model/user/user.entity";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;

/**
 * ProjectMemberエンティティをProjectMemberResponseに変換
 */
export const convertToProjectMemberResponse = (
  member: ProjectMember,
  user: User,
): ProjectMemberResponse => ({
  id: member.id,
  userId: member.userId,
  projectId: member.projectId,
  role: member.role.role,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
  createdAt: member.createdAt,
  updatedAt: member.updatedAt,
});
