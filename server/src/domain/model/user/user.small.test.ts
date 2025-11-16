import { describe, expect, it } from "vitest";
import { User } from "./user";

describe("User", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つUserインスタンスを作成できる", () => {
      // Arrange & Act
      const user = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "john.doe@example.com",
        emailVerified: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(user.id).toBe("user-123");
      expect(user.sub).toBe("cognito-sub-456");
      expect(user.name).toBe("John Doe");
      expect(user.email).toBe("john.doe@example.com");
      expect(user.emailVerified).toBe(true);
      expect(user.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(user.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("emailVerified が false のUserインスタンスを作成できる", () => {
      // Arrange & Act
      const user = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "Jane Smith",
        email: "jane.smith@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(user.emailVerified).toBe(false);
    });
  });

  describe("updateEmail", () => {
    it("メールアドレスと検証状態を更新した新しいUserインスタンスを返す", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "old@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedUser = originalUser.updateEmail(
        "new@example.com",
        true,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedUser.email).toBe("new@example.com");
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedUser.id).toBe(originalUser.id);
      expect(updatedUser.sub).toBe(originalUser.sub);
      expect(updatedUser.name).toBe(originalUser.name);
      expect(updatedUser.createdAt).toBe(originalUser.createdAt);
    });

    it("元のUserインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "old@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalUser.updateEmail(
        "new@example.com",
        true,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(originalUser.email).toBe("old@example.com");
      expect(originalUser.emailVerified).toBe(false);
      expect(originalUser.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "old@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedUser = originalUser.updateEmail(
        "new@example.com",
        true,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedUser).not.toBe(originalUser);
    });
  });

  describe("update", () => {
    it("すべてのフィールドを更新した新しいUserインスタンスを返す", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedUser = originalUser.update({
        name: "Jane Smith",
        email: "jane@example.com",
        emailVerified: true,
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedUser.name).toBe("Jane Smith");
      expect(updatedUser.email).toBe("jane@example.com");
      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedUser.id).toBe(originalUser.id);
      expect(updatedUser.sub).toBe(originalUser.sub);
      expect(updatedUser.createdAt).toBe(originalUser.createdAt);
    });

    it("一部のフィールドのみ更新した新しいUserインスタンスを返す", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedUser = originalUser.update({
        name: "John Smith",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedUser.name).toBe("John Smith");
      expect(updatedUser.email).toBe(originalUser.email);
      expect(updatedUser.emailVerified).toBe(originalUser.emailVerified);
      expect(updatedUser.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("元のUserインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalUser.update({
        name: "Jane Smith",
        email: "jane@example.com",
        emailVerified: true,
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(originalUser.name).toBe("John Doe");
      expect(originalUser.email).toBe("john@example.com");
      expect(originalUser.emailVerified).toBe(false);
      expect(originalUser.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalUser = new User({
        id: "user-123",
        sub: "cognito-sub-456",
        name: "John Doe",
        email: "john@example.com",
        emailVerified: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedUser = originalUser.update({
        name: "Jane Smith",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedUser).not.toBe(originalUser);
    });
  });

  describe("generateNameFromEmail", () => {
    it("メールアドレスから@より前の部分を抽出する", () => {
      // Act & Assert
      expect(User.generateNameFromEmail("john.doe@example.com")).toBe(
        "john.doe",
      );
      expect(User.generateNameFromEmail("jane@company.co.jp")).toBe("jane");
      expect(User.generateNameFromEmail("user123@test.org")).toBe("user123");
    });

    it("@がない場合はメールアドレスそのものを返す", () => {
      // Act & Assert
      expect(User.generateNameFromEmail("invalid-email")).toBe("invalid-email");
    });

    it("@が先頭にある場合は空文字を返す", () => {
      // Act & Assert
      expect(User.generateNameFromEmail("@example.com")).toBe("");
    });

    it("複数の@がある場合は最初の@より前の部分を返す", () => {
      // Act & Assert
      expect(User.generateNameFromEmail("user@name@example.com")).toBe("user");
    });
  });
});
