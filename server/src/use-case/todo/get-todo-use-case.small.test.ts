import { test, expect, describe } from "vitest";
import { GetTodoUseCaseImpl } from "./get-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { UnexpectedError } from "@/util/error-util";

describe("GetTodoUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのTODOを取得できること", async () => {
      const expectedTodo = todoDummyFrom({
        id: "test-todo-id-123",
        title: "テストタスク",
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: expectedTodo,
          },
        }),
      });

      const result = await getTodoUseCase.execute({
        todoId: "test-todo-id-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedTodo);
        expect(result.data.id).toBe("test-todo-id-123");
        expect(result.data.title).toBe("テストタスク");
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
        }),
      });

      const result = await getTodoUseCase.execute({
        todoId: "non-existent-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
      });

      const result = await getTodoUseCase.execute({
        todoId: "test-todo-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("異なるステータスのTODOを取得できること", async () => {
      const todoInProgress = todoDummyFrom({
        id: "todo-1",
        status: "IN_PROGRESS",
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: todoInProgress,
          },
        }),
      });

      const result = await getTodoUseCase.execute({
        todoId: "todo-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("IN_PROGRESS");
      }
    });

    test("異なる優先度のTODOを取得できること", async () => {
      const highPriorityTodo = todoDummyFrom({
        id: "todo-2",
        priority: "HIGH",
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: highPriorityTodo,
          },
        }),
      });

      const result = await getTodoUseCase.execute({
        todoId: "todo-2",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe("HIGH");
      }
    });
  });
});
