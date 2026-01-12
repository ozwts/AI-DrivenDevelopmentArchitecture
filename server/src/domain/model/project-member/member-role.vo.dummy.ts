import { faker } from "@faker-js/faker";
import { MemberRole } from "./member-role.vo";

export type MemberRoleDummyProps = Partial<{
  role: "OWNER" | "MEMBER";
}>;

/**
 * テスト用MemberRoleファクトリ
 *
 * @param props 部分オーバーライド（省略時はランダム値）
 * @returns MemberRoleインスタンス
 */
export const memberRoleDummyFrom = (
  props?: MemberRoleDummyProps,
): MemberRole => {
  const roleValue =
    props?.role ?? faker.helpers.arrayElement(["OWNER", "MEMBER"] as const);

  const result = MemberRole.from({ role: roleValue });

  if (result.isErr()) {
    throw new Error(`Failed to generate MemberRole: ${result.error.message}`);
  }

  return result.data;
};
