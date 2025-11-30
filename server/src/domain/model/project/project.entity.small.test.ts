import { describe, expect, it } from "vitest";
import { projectDummyFrom } from "./project.entity.dummy";

describe("Project", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つProjectインスタンスを作成できる", () => {
      // Act
      const project = projectDummyFrom({
        id: "project-123",
        name: "新規プロジェクト",
        description: "プロジェクトの説明",
        color: "#FF5733",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(project.id).toBe("project-123");
      expect(project.name).toBe("新規プロジェクト");
      expect(project.description).toBe("プロジェクトの説明");
      expect(project.color).toBe("#FF5733");
      expect(project.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(project.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("オプショナルプロパティがundefinedのProjectインスタンスを作成できる", () => {
      // Act
      const project = projectDummyFrom({
        description: undefined,
      });

      // Assert
      expect(project.description).toBeUndefined();
    });
  });

  describe("rename", () => {
    it("プロジェクト名を変更した新しいProjectインスタンスを返す", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        name: "元のプロジェクト",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.rename(
        "更新されたプロジェクト",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedProject.name).toBe("更新されたプロジェクト");
      expect(updatedProject.description).toBe(originalProject.description);
      expect(updatedProject.color).toBe(originalProject.color);
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedProject.id).toBe(originalProject.id);
      expect(updatedProject.createdAt).toBe(originalProject.createdAt);
    });

    it("元のProjectインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        name: "元のプロジェクト",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalProject.rename(
        "更新されたプロジェクト",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(originalProject.name).toBe("元のプロジェクト");
      expect(originalProject.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalProject = projectDummyFrom();

      // Act
      const updatedProject = originalProject.rename(
        "更新されたプロジェクト",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedProject).not.toBe(originalProject);
    });
  });

  describe("clarify", () => {
    it("プロジェクト説明を変更した新しいProjectインスタンスを返す", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        description: "元の説明",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.clarify(
        "更新された説明",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedProject.description).toBe("更新された説明");
      expect(updatedProject.name).toBe(originalProject.name);
      expect(updatedProject.color).toBe(originalProject.color);
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("説明をundefinedに設定できる", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        description: "元の説明",
      });

      // Act
      const updatedProject = originalProject.clarify(
        undefined,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedProject.description).toBeUndefined();
    });
  });

  describe("recolor", () => {
    it("プロジェクトカラーを変更した新しいProjectインスタンスを返す", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        color: "#FF5733",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.recolor(
        "#00FF00",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedProject.color).toBe("#00FF00");
      expect(updatedProject.name).toBe(originalProject.name);
      expect(updatedProject.description).toBe(originalProject.description);
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });
  });

  describe("メソッドチェーン", () => {
    it("複数の個別メソッドをチェーンして複合的な更新ができる", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        name: "元のプロジェクト",
        description: "元の説明",
        color: "#FF5733",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject
        .rename("更新されたプロジェクト", "2024-01-02T00:00:00.000Z")
        .clarify("更新された説明", "2024-01-02T00:00:00.000Z")
        .recolor("#00FF00", "2024-01-02T00:00:00.000Z");

      // Assert
      expect(updatedProject.name).toBe("更新されたプロジェクト");
      expect(updatedProject.description).toBe("更新された説明");
      expect(updatedProject.color).toBe("#00FF00");
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedProject.id).toBe(originalProject.id);
      expect(updatedProject.createdAt).toBe(originalProject.createdAt);
    });

    it("元のProjectインスタンスは変更されない（メソッドチェーンでもイミュータブル性を維持）", () => {
      // Arrange
      const originalProject = projectDummyFrom({
        name: "元のプロジェクト",
        description: "元の説明",
        color: "#FF5733",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalProject
        .rename("更新されたプロジェクト", "2024-01-02T00:00:00.000Z")
        .clarify("更新された説明", "2024-01-02T00:00:00.000Z")
        .recolor("#00FF00", "2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalProject.name).toBe("元のプロジェクト");
      expect(originalProject.description).toBe("元の説明");
      expect(originalProject.color).toBe("#FF5733");
      expect(originalProject.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });
  });
});
