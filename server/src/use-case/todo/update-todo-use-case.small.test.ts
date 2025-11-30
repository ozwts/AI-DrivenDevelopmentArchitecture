import { test, expect, describe } from "vitest";
import { UpdateTodoUseCaseImpl } from "./update-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";

describe("UpdateTodoUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const updatedAt = new Date("2024-01-02T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(updatedAt);

  describe("execute", () => {
    test("TODOのタイトルを更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-1",
        title: "古いタイトル",
        createdAt: now.toISOString(),
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-1",
        title: "新しいタイトル",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("新しいタイトル");
        expect(result.data.updatedAt).toBe(updatedAt.toISOString());
      }
    });

    test("TODOのステータスを更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-2",
        status: "TODO",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-2",
        status: "IN_PROGRESS",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("IN_PROGRESS");
      }
    });

    test("TODOの優先度を更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-3",
        priority: "MEDIUM",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-3",
        priority: "HIGH",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("HIGH");
      }
    });

    test("複数のフィールドを同時に更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-4",
        title: "古いタイトル",
        status: "TODO",
        priority: "LOW",
        description: "古い説明",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-4",
        title: "新しいタイトル",
        status: "COMPLETED",
        priority: "HIGH",
        description: "新しい説明",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("新しいタイトル");
        expect(result.data.status).toBe("COMPLETED");
        expect(result.data.priority).toBe("HIGH");
        expect(result.data.description).toBe("新しい説明");
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "non-existent-id",
        title: "新しいタイトル",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("findByIdでエラーが発生した場合はそのエラーを返すこと", async () => {
      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-5",
        title: "新しいタイトル",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-6",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-6",
        title: "新しいタイトル",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("期限日とプロジェクトIDを更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-7",
        dueDate: undefined,
        projectId: undefined,
      });

      const newDueDate = "2024-12-31T23:59:59.000Z";
      const newProjectId = "project-456";

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-7",
        dueDate: newDueDate,
        projectId: newProjectId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dueDate).toBe(newDueDate);
        expect(result.data.projectId).toBe(newProjectId);
      }
    });

    test("更新後もcreatedAtは変わらないこと", async () => {
      const createdAt = "2024-01-01T00:00:00.000Z";
      const existingTodo = todoDummyFrom({
        id: "todo-8",
        title: "古いタイトル",
        createdAt,
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        fetchNow,
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-8",
        title: "新しいタイトル",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBe(createdAt);
        expect(result.data.updatedAt).not.toBe(createdAt);
      }
    });
  });
});
