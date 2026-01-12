import { describe, expect, it } from "vitest";
import { MemberRole } from "./member-role.vo";
import { DomainError } from "../../../util/error-util";

describe("MemberRole", () => {
  describe("from", () => {
    describe("正常系", () => {
      it("有効な値からValue Objectを作成できる", () => {
        // Act
        const result = MemberRole.from({ role: "OWNER" });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isErr()) return;
        expect(result.data.isOwner()).toBe(true);
      });

      it("すべての有効なロールから作成できる", () => {
        const ownerResult = MemberRole.from({ role: "OWNER" });
        const memberResult = MemberRole.from({ role: "MEMBER" });

        expect(ownerResult.isOk()).toBe(true);
        expect(memberResult.isOk()).toBe(true);
      });
    });

    describe("異常系", () => {
      it("無効なロール文字列の場合DomainErrorを返す", () => {
        // Act
        const result = MemberRole.from({ role: "INVALID_ROLE" });

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isOk()) return;
        expect(result.error).toBeInstanceOf(DomainError);
      });

      it("空文字列の場合DomainErrorを返す", () => {
        const result = MemberRole.from({ role: "" });

        expect(result.isErr()).toBe(true);
        if (result.isOk()) return;
        expect(result.error).toBeInstanceOf(DomainError);
      });
    });
  });

  describe("静的ファクトリメソッド", () => {
    it("owner()でOWNERロールを作成できる", () => {
      const role = MemberRole.owner();

      expect(role.role).toBe("OWNER");
      expect(role.isOwner()).toBe(true);
    });

    it("member()でMEMBERロールを作成できる", () => {
      const role = MemberRole.member();

      expect(role.role).toBe("MEMBER");
      expect(role.isMember()).toBe(true);
    });
  });

  describe("equals", () => {
    it("同じ値のValue Objectは等価である", () => {
      const role1 = MemberRole.owner();
      const role2 = MemberRole.owner();

      expect(role1.equals(role2)).toBe(true);
    });

    it("from()で生成した同じロールは等価である", () => {
      const result1 = MemberRole.from({ role: "OWNER" });
      const result2 = MemberRole.from({ role: "OWNER" });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isErr() || result2.isErr()) return;
      expect(result1.data.equals(result2.data)).toBe(true);
    });

    it("異なる値のValue Objectは等価でない", () => {
      const owner = MemberRole.owner();
      const member = MemberRole.member();

      expect(owner.equals(member)).toBe(false);
    });
  });

  describe("toString", () => {
    it("ロールの文字列表現を返す", () => {
      expect(MemberRole.owner().toString()).toBe("OWNER");
      expect(MemberRole.member().toString()).toBe("MEMBER");
    });
  });

  describe("ヘルパーメソッド", () => {
    it("isOwner()はOWNERロールの場合のみtrueを返す", () => {
      expect(MemberRole.owner().isOwner()).toBe(true);
      expect(MemberRole.member().isOwner()).toBe(false);
    });

    it("isMember()はMEMBERロールの場合のみtrueを返す", () => {
      expect(MemberRole.owner().isMember()).toBe(false);
      expect(MemberRole.member().isMember()).toBe(true);
    });
  });
});
