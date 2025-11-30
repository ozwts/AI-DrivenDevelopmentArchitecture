import { describe, expect, it } from "vitest";
import { TodoStatus } from "./todo-status.vo";
import { todoDummyFrom } from "./todo.dummy";
import { todoStatusDummyFrom } from "./todo-status.vo.dummy";
import { attachmentDummyFrom } from "./attachment.dummy";

describe("Todo", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つTodoインスタンスを作成できる", () => {
      // Arrange & Act
      const todo = todoDummyFrom({
        id: "todo-123",
        title: "テスト用タスク",
        description: "これはテスト用のタスクです",
        status: TodoStatus.todo(),
        priority: "HIGH",
        dueDate: "2024-12-31T23:59:59.000Z",
        projectId: "project-456",
        assigneeUserId: "user-123",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(todo.id).toBe("todo-123");
      expect(todo.title).toBe("テスト用タスク");
      expect(todo.description).toBe("これはテスト用のタスクです");
      expect(todo.status.status).toBe("TODO");
      expect(todo.priority).toBe("HIGH");
      expect(todo.dueDate).toBe("2024-12-31T23:59:59.000Z");
      expect(todo.projectId).toBe("project-456");
      expect(todo.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(todo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("オプショナルプロパティがundefinedのTodoインスタンスを作成できる", () => {
      // Arrange & Act
      const todo = todoDummyFrom({
        description: undefined,
        dueDate: undefined,
        projectId: undefined,
      });

      // Assert
      expect(todo.description).toBeUndefined();
      expect(todo.dueDate).toBeUndefined();
      expect(todo.projectId).toBeUndefined();
      // 必須フィールドは設定されている
      expect(todo.status).toBeDefined();
      expect(todo.priority).toBeDefined();
    });
  });

  describe("changeStatus", () => {
    it("ステータスを変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        status: TodoStatus.todo(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeStatus(
        TodoStatus.inProgress(),
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.status.status).toBe("IN_PROGRESS");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedTodo.id).toBe(originalTodo.id);
      expect(updatedTodo.title).toBe(originalTodo.title);
      expect(updatedTodo.priority).toBe(originalTodo.priority);
    });

    it("元のTodoインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        status: TodoStatus.todo(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalTodo.changeStatus(TodoStatus.inProgress(), "2024-01-02T00:00:00.000Z");

      // Assert
      expect(originalTodo.status.status).toBe("TODO");
      expect(originalTodo.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalTodo = todoDummyFrom();

      // Act
      const updatedTodo = originalTodo.changeStatus(
        TodoStatus.completed(),
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo).not.toBe(originalTodo);
    });
  });

  describe("changePriority", () => {
    it("優先度を変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        priority: "MEDIUM",
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
      const originalTodo = todoDummyFrom({
        priority: "MEDIUM",
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
      const originalTodo = todoDummyFrom();

      // Act
      const updatedTodo = originalTodo.changePriority(
        "HIGH",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo).not.toBe(originalTodo);
    });
  });

  describe("changeTitle", () => {
    it("タイトルを変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        title: "元のタイトル",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeTitle(
        "新しいタイトル",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.title).toBe("新しいタイトル");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
      expect(updatedTodo.id).toBe(originalTodo.id);
    });
  });

  describe("changeDescription", () => {
    it("説明を変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        description: "元の説明",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeDescription(
        "新しい説明",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.description).toBe("新しい説明");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("説明をundefinedに設定できる", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        description: "元の説明",
      });

      // Act
      const updatedTodo = originalTodo.changeDescription(
        undefined,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.description).toBeUndefined();
    });
  });

  describe("changeDueDate", () => {
    it("期限日を変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        dueDate: "2024-12-31T23:59:59.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeDueDate(
        "2024-06-30T23:59:59.000Z",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.dueDate).toBe("2024-06-30T23:59:59.000Z");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("期限日をundefinedに設定できる（期限なし）", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        dueDate: "2024-12-31T23:59:59.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeDueDate(
        undefined,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.dueDate).toBeUndefined();
    });
  });

  describe("changeProjectId", () => {
    it("プロジェクトIDを変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        projectId: "project-1",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeProjectId(
        "project-2",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.projectId).toBe("project-2");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("プロジェクトIDをundefinedに設定できる（プロジェクトに属さない）", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        projectId: "project-1",
      });

      // Act
      const updatedTodo = originalTodo.changeProjectId(
        undefined,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.projectId).toBeUndefined();
    });
  });

  describe("changeAssignee", () => {
    it("担当者を変更した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        assigneeUserId: "user-1",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedTodo = originalTodo.changeAssignee(
        "user-2",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.assigneeUserId).toBe("user-2");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });
  });

  describe("addAttachment", () => {
    it("添付ファイルを追加した新しいTodoインスタンスを返す", () => {
      // Arrange
      const originalTodo = todoDummyFrom({
        attachments: [],
      });
      const attachment = attachmentDummyFrom({ id: "attachment-1" });

      // Act
      const updatedTodo = originalTodo.addAttachment(
        attachment,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.attachments).toHaveLength(1);
      expect(updatedTodo.attachments[0].id).toBe("attachment-1");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("既存の添付ファイルに追加される", () => {
      // Arrange
      const existingAttachment = attachmentDummyFrom({ id: "attachment-1" });
      const originalTodo = todoDummyFrom({
        attachments: [existingAttachment],
      });
      const newAttachment = attachmentDummyFrom({ id: "attachment-2" });

      // Act
      const updatedTodo = originalTodo.addAttachment(
        newAttachment,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.attachments).toHaveLength(2);
      expect(updatedTodo.attachments[0].id).toBe("attachment-1");
      expect(updatedTodo.attachments[1].id).toBe("attachment-2");
    });
  });

  describe("removeAttachment", () => {
    it("添付ファイルを削除した新しいTodoインスタンスを返す", () => {
      // Arrange
      const attachment = attachmentDummyFrom({ id: "attachment-1" });
      const originalTodo = todoDummyFrom({
        attachments: [attachment],
      });

      // Act
      const updatedTodo = originalTodo.removeAttachment(
        "attachment-1",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.attachments).toHaveLength(0);
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });

    it("存在しないIDを指定した場合は変更なし", () => {
      // Arrange
      const attachment = attachmentDummyFrom({ id: "attachment-1" });
      const originalTodo = todoDummyFrom({
        attachments: [attachment],
      });

      // Act
      const updatedTodo = originalTodo.removeAttachment(
        "non-existent",
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.attachments).toHaveLength(1);
    });
  });

  describe("updateAttachment", () => {
    it("添付ファイルを更新した新しいTodoインスタンスを返す", () => {
      // Arrange
      const attachment = attachmentDummyFrom({
        id: "attachment-1",
        fileName: "old.pdf",
      });
      const originalTodo = todoDummyFrom({
        attachments: [attachment],
      });
      const updatedAttachment = attachmentDummyFrom({
        id: "attachment-1",
        fileName: "new.pdf",
      });

      // Act
      const updatedTodo = originalTodo.updateAttachment(
        updatedAttachment,
        "2024-01-02T00:00:00.000Z",
      );

      // Assert
      expect(updatedTodo.attachments).toHaveLength(1);
      expect(updatedTodo.attachments[0].fileName).toBe("new.pdf");
      expect(updatedTodo.updatedAt).toBe("2024-01-02T00:00:00.000Z");
    });
  });
});
