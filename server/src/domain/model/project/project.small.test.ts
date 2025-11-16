import { describe, expect, it } from "vitest";
import { Project } from "./project";
import { ProjectColor } from "./project-color";

describe("Project", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つProjectインスタンスを作成できる", () => {
      // Arrange
      const colorResult = ProjectColor.fromString("#FF5733");
      expect(colorResult.success).toBe(true);
      if (!colorResult.success) return;

      // Act
      const project = new Project({
        id: "project-123",
        name: "新規プロジェクト",
        description: "プロジェクトの説明",
        color: colorResult.data,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(project.id).toBe("project-123");
      expect(project.name).toBe("新規プロジェクト");
      expect(project.description).toBe("プロジェクトの説明");
      expect(project.color.value).toBe("#FF5733");
      expect(project.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(project.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("オプショナルプロパティを省略してProjectインスタンスを作成できる", () => {
      // Arrange
      const color = ProjectColor.default();

      // Act
      const project = new Project({
        id: "project-123",
        name: "必須項目のみのプロジェクト",
        color,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(project.id).toBe("project-123");
      expect(project.name).toBe("必須項目のみのプロジェクト");
      expect(project.description).toBeUndefined();
      expect(project.color.value).toBe("#001964");
    });

    it("デフォルトカラーを使ってProjectインスタンスを作成できる", () => {
      // Arrange
      const color = ProjectColor.default();

      // Act
      const project = new Project({
        id: "project-123",
        name: "デフォルトカラーのプロジェクト",
        color,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(project.color.value).toBe("#001964");
    });
  });

  describe("update", () => {
    it("すべてのフィールドを更新した新しいProjectインスタンスを返す", () => {
      // Arrange
      const originalColorResult = ProjectColor.fromString("#FF5733");
      const newColorResult = ProjectColor.fromString("#00FF00");
      expect(originalColorResult.success).toBe(true);
      expect(newColorResult.success).toBe(true);
      if (!originalColorResult.success || !newColorResult.success) return;

      const originalProject = new Project({
        id: "project-123",
        name: "元のプロジェクト",
        description: "元の説明",
        color: originalColorResult.data,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.update({
        name: "更新されたプロジェクト",
        description: "更新された説明",
        color: newColorResult.data,
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedProject.name).toBe("更新されたプロジェクト");
      expect(updatedProject.description).toBe("更新された説明");
      expect(updatedProject.color.value).toBe("#00FF00");
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedProject.id).toBe(originalProject.id);
      expect(updatedProject.createdAt).toBe(originalProject.createdAt);
    });

    it("一部のフィールドのみ更新した新しいProjectインスタンスを返す", () => {
      // Arrange
      const colorResult = ProjectColor.fromString("#FF5733");
      expect(colorResult.success).toBe(true);
      if (!colorResult.success) return;

      const originalProject = new Project({
        id: "project-123",
        name: "元のプロジェクト",
        description: "元の説明",
        color: colorResult.data,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.update({
        name: "更新されたプロジェクト",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedProject.name).toBe("更新されたプロジェクト");
      expect(updatedProject.description).toBe(originalProject.description);
      expect(updatedProject.color.value).toBe(originalProject.color.value);
      expect(updatedProject.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("元のProjectインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalColorResult = ProjectColor.fromString("#FF5733");
      const newColorResult = ProjectColor.fromString("#00FF00");
      expect(originalColorResult.success).toBe(true);
      expect(newColorResult.success).toBe(true);
      if (!originalColorResult.success || !newColorResult.success) return;

      const originalProject = new Project({
        id: "project-123",
        name: "元のプロジェクト",
        description: "元の説明",
        color: originalColorResult.data,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalProject.update({
        name: "更新されたプロジェクト",
        description: "更新された説明",
        color: newColorResult.data,
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(originalProject.name).toBe("元のプロジェクト");
      expect(originalProject.description).toBe("元の説明");
      expect(originalProject.color.value).toBe("#FF5733");
      expect(originalProject.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const color = ProjectColor.default();
      const originalProject = new Project({
        id: "project-123",
        name: "元のプロジェクト",
        color,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.update({
        name: "更新されたプロジェクト",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedProject).not.toBe(originalProject);
    });

    it("カラーのみを更新できる", () => {
      // Arrange
      const originalColorResult = ProjectColor.fromString("#FF5733");
      const newColorResult = ProjectColor.fromString("#00FF00");
      expect(originalColorResult.success).toBe(true);
      expect(newColorResult.success).toBe(true);
      if (!originalColorResult.success || !newColorResult.success) return;

      const originalProject = new Project({
        id: "project-123",
        name: "プロジェクト",
        color: originalColorResult.data,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedProject = originalProject.update({
        color: newColorResult.data,
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedProject.color.value).toBe("#00FF00");
      expect(updatedProject.name).toBe(originalProject.name);
      expect(updatedProject.description).toBe(originalProject.description);
    });
  });
});
