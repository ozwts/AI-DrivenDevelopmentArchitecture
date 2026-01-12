import type { z } from "zod";
import type { schemas } from "@/generated/zod-schemas";
import type { ProjectMember } from "@/domain/model/project/project-member.entity";
import type { User } from "@/domain/model/user/user.entity";

type ProjectMemberResponse = z.infer<typeof schemas.ProjectMemberResponse>;

export type MemberWithUser = {
  member: ProjectMember;
  user: User;
};

/**
 * MemberWithUserをProjectMemberResponseに変換
 */
export const convertToProjectMemberResponse = (
  memberWithUser: MemberWithUser,
): ProjectMemberResponse => ({
  id: memberWithUser.member.id,
  userId: memberWithUser.member.userId,
  role: memberWithUser.member.role.role,
  joinedAt: memberWithUser.member.joinedAt,
  user: {
    id: memberWithUser.user.id,
    sub: memberWithUser.user.sub,
    name: memberWithUser.user.name,
    email: memberWithUser.user.email,
    emailVerified: memberWithUser.user.emailVerified,
    createdAt: memberWithUser.user.createdAt,
    updatedAt: memberWithUser.user.updatedAt,
  },
});
