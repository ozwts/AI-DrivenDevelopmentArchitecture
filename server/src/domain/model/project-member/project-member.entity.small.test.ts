import { describe, expect, it } from "vitest";
import { projectMemberDummyFrom } from "./project-member.entity.dummy";
import { MemberRole } from "./member-role.vo";

describe("ProjectMember", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つProjectMemberインスタンスを作成できる", () => {
      // Act
      const member = projectMemberDummyFrom({
        id: "member-123",
        projectId: "project-123",
        userId: "user-123",
        role: MemberRole.owner(),
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(member.id).toBe("member-123");
      expect(member.projectId).toBe("project-123");
      expect(member.userId).toBe("user-123");
      expect(member.role.isOwner()).toBe(true);
      expect(member.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(member.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("MEMBERロールのProjectMemberインスタンスを作成できる", () => {
      // Act
      const member = projectMemberDummyFrom({
        role: MemberRole.member(),
      });

      // Assert
      expect(member.role.isMember()).toBe(true);
    });
  });

  describe("promote", () => {
    it("メンバーをオーナーに昇格した新しいProjectMemberインスタンスを返す", () => {
      // Arrange
      const originalMember = projectMemberDummyFrom({
        role: MemberRole.member(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const promotedMember = originalMember.promote("2024-01-02T00:00:00.000Z");

      // Assert
      expect(promotedMember.role.isOwner()).toBe(true);
      expect(promotedMember.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(promotedMember.id).toBe(originalMember.id);
      expect(promotedMember.projectId).toBe(originalMember.projectId);
      expect(promotedMember.userId).toBe(originalMember.userId);
      expect(promotedMember.createdAt).toBe(originalMember.createdAt);
    });

    it("元のProjectMemberインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalMember = projectMemberDummyFrom({
        role: MemberRole.member(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalMember.promote("2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalMember.role.isMember()).toBe(true);
      expect(originalMember.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalMember = projectMemberDummyFrom({
        role: MemberRole.member(),
      });

      // Act
      const promotedMember = originalMember.promote("2024-01-02T00:00:00.000Z");

      // Assert
      expect(promotedMember).not.toBe(originalMember);
    });
  });

  describe("demote", () => {
    it("オーナーをメンバーに降格した新しいProjectMemberインスタンスを返す", () => {
      // Arrange
      const originalMember = projectMemberDummyFrom({
        role: MemberRole.owner(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const demotedMember = originalMember.demote("2024-01-02T00:00:00.000Z");

      // Assert
      expect(demotedMember.role.isMember()).toBe(true);
      expect(demotedMember.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(demotedMember.id).toBe(originalMember.id);
      expect(demotedMember.projectId).toBe(originalMember.projectId);
      expect(demotedMember.userId).toBe(originalMember.userId);
      expect(demotedMember.createdAt).toBe(originalMember.createdAt);
    });

    it("元のProjectMemberインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalMember = projectMemberDummyFrom({
        role: MemberRole.owner(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalMember.demote("2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalMember.role.isOwner()).toBe(true);
      expect(originalMember.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  describe("isOwner", () => {
    it("OWNERロールの場合trueを返す", () => {
      const member = projectMemberDummyFrom({
        role: MemberRole.owner(),
      });

      expect(member.isOwner()).toBe(true);
    });

    it("MEMBERロールの場合falseを返す", () => {
      const member = projectMemberDummyFrom({
        role: MemberRole.member(),
      });

      expect(member.isOwner()).toBe(false);
    });
  });

  describe("isMember", () => {
    it("MEMBERロールの場合trueを返す", () => {
      const member = projectMemberDummyFrom({
        role: MemberRole.member(),
      });

      expect(member.isMember()).toBe(true);
    });

    it("OWNERロールの場合falseを返す", () => {
      const member = projectMemberDummyFrom({
        role: MemberRole.owner(),
      });

      expect(member.isMember()).toBe(false);
    });
  });
});
