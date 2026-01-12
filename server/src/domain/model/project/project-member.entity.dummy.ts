import { ProjectMember } from "./project-member.entity";
import { MemberRole } from "./member-role.vo";
import { memberRoleDummyFrom } from "./member-role.vo.dummy";
import { getDummyId, getDummyRecentDate } from "@/util/testing-util/dummy-data";

export type ProjectMemberDummyProps = Partial<{
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
}>;

/**
 * テスト用のProjectMemberダミーデータを生成する
 *
 * @param props - 上書きするプロパティ（オプション）
 * @returns ProjectMemberインスタンス
 *
 * @example
 * ```typescript
 * // すべてランダム値で生成
 * const member = projectMemberDummyFrom();
 *
 * // 特定フィールドのみ指定
 * const owner = projectMemberDummyFrom({
 *   userId: "user-123",
 *   role: MemberRole.owner()
 * });
 * ```
 */
export const projectMemberDummyFrom = (
  props?: ProjectMemberDummyProps,
): ProjectMember => {
  return ProjectMember.from({
    id: props?.id ?? getDummyId(),
    userId: props?.userId ?? getDummyId(),
    role: props?.role ?? memberRoleDummyFrom(),
    joinedAt: props?.joinedAt ?? getDummyRecentDate(),
  });
};
