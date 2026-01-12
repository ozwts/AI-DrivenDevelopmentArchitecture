import { ProjectMember } from "./project-member.entity";
import { MemberRole } from "./member-role.vo";
import { memberRoleDummyFrom } from "./member-role.vo.dummy";
import { getDummyId, getDummyRecentDate } from "@/util/testing-util/dummy-data";

export type ProjectMemberDummyProps = Partial<{
  id: string;
  projectId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のダミープロジェクトメンバーを生成する
 *
 * @example projectMemberDummyFrom()
 * @example projectMemberDummyFrom({ role: MemberRole.owner() })
 * @example projectMemberDummyFrom({ projectId: "project-123", userId: "user-123" })
 */
export const projectMemberDummyFrom = (
  props?: ProjectMemberDummyProps,
): ProjectMember => {
  const now = getDummyRecentDate();

  return ProjectMember.from({
    id: props?.id ?? getDummyId(),
    projectId: props?.projectId ?? getDummyId(),
    userId: props?.userId ?? getDummyId(),
    role: props?.role ?? memberRoleDummyFrom(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
