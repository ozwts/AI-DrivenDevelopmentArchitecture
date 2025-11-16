import { describe, expect, it } from "vitest";
import { Todo } from "./todo";

describe("Todo", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つTodoインスタンスを作成できる", () => {
      // Arrange & Act
      const todo = new Todo({
        id: "todo-123",
        title: "テスト用タスク",
        description: "これはテスト用のタスクです",
        status: "TODO",
        priority: "HIGH",
        dueDate: "2024-12-31T23:59:59.000Z",
        projectId: "project-456",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(todo.id).toBe("todo-123");
      expect(todo.title).toBe("テスト用タスク");
      expect(todo.description).toBe("これはテスト用のタスクです");
      expect(todo.status).toBe("TODO");
      expect(todo.priority).toBe("HIGH");
      expect(todo.dueDate).toBe("2024-12-31T23:59:59.000Z");
      expect(todo.projectId).toBe("project-456");
      expect(todo.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(todo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("オプショナルプロパティを省略してTodoインスタンスを作成できる", () => {
      // Arrange & Act
      const todo = new Todo({
        id: "todo-123",
        title: "必須項目のみのタスク",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(todo.id).toBe("todo-123");
      expect(todo.title).toBe("必須項目のみのタスク");
      expect(todo.description).toBeUndefined();
      expect(todo.status).toBe("TODO"); // デフォルト値
      expect(todo.priority).toBe("MEDIUM"); // デフォルト値
      expect(todo.dueDate).toBeUndefined();
      expect(todo.projectId).toBeUndefined();
    });

    it("statusのデフォルト値はTODO", () => {
      // Arrange & Act
      const todo = new Todo({
        id: "todo-123",
        title: "タスク",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(todo.status).toBe("TODO");
    });

    it("priorityのデフォルト値はMEDIUM", () => {
      // Arrange & Act
      const todo = new Todo({
        id: "todo-123",
        title: "タスク",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(todo.priority).toBe("MEDIUM");
    });
  });

  describe("changeStatus", () => {
    it("ステータスを変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeStatus(
        "IN_PROGRESS",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.status).toBe("IN_PROGRESS");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedTodo.id).toBe(originalTodo.id);
      expect(updatedTodo.title).toBe(originalTodo.title);
      expect(updatedTodo.priority).toBe(originalTodo.priority);
    });

    it("元のTodoインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalTodo.changeStatus("IN_PROGRESS", "2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalTodo.status).toBe("TODO");
      expect(originalTodo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        status: "TODO",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeStatus(
        "DONE",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo).not.toBe(originalTodo);
    });
  });

  describe("changePriority", () => {
    it("優先度を変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        priority: "MEDIUM",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changePriority(
        "HIGH",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.priority).toBe("HIGH");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedTodo.id).toBe(originalTodo.id);
      expect(updatedTodo.title).toBe(originalTodo.title);
      expect(updatedTodo.status).toBe(originalTodo.status);
    });

    it("元のTodoインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        priority: "MEDIUM",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalTodo.changePriority("HIGH", "2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalTodo.priority).toBe("MEDIUM");
      expect(originalTodo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        priority: "LOW",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changePriority(
        "HIGH",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo).not.toBe(originalTodo);
    });
  });

  describe("update", () => {
    it("すべてのフィールドを更新した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "元のタスク",
        description: "元の説明",
        status: "TODO",
        priority: "MEDIUM",
        dueDate: "2024-12-31T23:59:59.000Z",
        projectId: "project-1",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.update({
        title: "更新されたタスク",
        description: "更新された説明",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-06-30T23:59:59.000Z",
        projectId: "project-2",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedTodo.title).toBe("更新されたタスク");
      expect(updatedTodo.description).toBe("更新された説明");
      expect(updatedTodo.status).toBe("IN_PROGRESS");
      expect(updatedTodo.priority).toBe("HIGH");
      expect(updatedTodo.dueDate).toBe("2024-06-30T23:59:59.000Z");
      expect(updatedTodo.projectId).toBe("project-2");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedTodo.id).toBe(originalTodo.id);
      expect(updatedTodo.createdAt).toBe(originalTodo.createdAt);
    });

    it("一部のフィールドのみ更新した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "元のタスク",
        description: "元の説明",
        status: "TODO",
        priority: "MEDIUM",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.update({
        title: "更新されたタスク",
        status: "IN_PROGRESS",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedTodo.title).toBe("更新されたタスク");
      expect(updatedTodo.status).toBe("IN_PROGRESS");
      expect(updatedTodo.description).toBe(originalTodo.description);
      expect(updatedTodo.priority).toBe(originalTodo.priority);
      expect(updatedTodo.dueDate).toBe(originalTodo.dueDate);
      expect(updatedTodo.projectId).toBe(originalTodo.projectId);
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("元のTodoインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "元のタスク",
        description: "元の説明",
        status: "TODO",
        priority: "MEDIUM",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalTodo.update({
        title: "更新されたタスク",
        status: "IN_PROGRESS",
        priority: "HIGH",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(originalTodo.title).toBe("元のタスク");
      expect(originalTodo.description).toBe("元の説明");
      expect(originalTodo.status).toBe("TODO");
      expect(originalTodo.priority).toBe("MEDIUM");
      expect(originalTodo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalTodo = new Todo({
        id: "todo-123",
        title: "タスク",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.update({
        title: "更新されたタスク",
        updatedAt: "2024-01-02T00:00:00.000Z",
      });

      // Assert
      expect(updatedTodo).not.toBe(originalTodo);
    });
  });
});
