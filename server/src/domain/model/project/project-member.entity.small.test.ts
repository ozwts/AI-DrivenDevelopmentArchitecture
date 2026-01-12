import { describe, expect, it } from "vitest";
import { ProjectMember } from "./project-member.entity";
import { MemberRole } from "./member-role.vo";

describe("ProjectMember", () => {
  describe("from", () => {
    it("プロパティからProjectMemberを作成できる", () => {
      // Arrange
      const props = {
        id: "member-123",
        userId: "user-456",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      };

      // Act
      const member = ProjectMember.from(props);

      // Assert
      expect(member.id).toBe("member-123");
      expect(member.userId).toBe("user-456");
      expect(member.role.isOwner()).toBe(true);
      expect(member.joinedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("メンバーロールで作成できる", () => {
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role: MemberRole.member(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.role.isMember()).toBe(true);
    });
  });

  describe("isOwner", () => {
    it("オーナーロールの場合trueを返す", () => {
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.isOwner()).toBe(true);
    });

    it("メンバーロールの場合falseを返す", () => {
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role: MemberRole.member(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.isOwner()).toBe(false);
    });
  });

  describe("isMember", () => {
    it("メンバーロールの場合trueを返す", () => {
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role: MemberRole.member(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.isMember()).toBe(true);
    });

    it("オーナーロールの場合falseを返す", () => {
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role: MemberRole.owner(),
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.isMember()).toBe(false);
    });
  });

  describe("プロパティアクセス", () => {
    it("すべてのプロパティにアクセスできる", () => {
      const role = MemberRole.owner();
      const member = ProjectMember.from({
        id: "member-123",
        userId: "user-456",
        role,
        joinedAt: "2024-01-01T00:00:00.000Z",
      });

      expect(member.id).toBe("member-123");
      expect(member.userId).toBe("user-456");
      expect(member.role).toBe(role);
      expect(member.joinedAt).toBe("2024-01-01T00:00:00.000Z");
    });
  });
});
