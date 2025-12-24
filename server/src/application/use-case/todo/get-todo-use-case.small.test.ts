import { test, expect, describe } from "vitest";
import { GetTodoUseCaseImpl } from "./get-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { TodoStatus } from "@/domain/model/todo/todo-status.vo";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("GetTodoUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのTODOを取得できること", async () => {
      const expectedTodo = todoDummyFrom({
        id: "test-todo-id-123",
        title: "テストタスク",
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(expectedTodo),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getTodoUseCase.execute({
        todoId: "test-todo-id-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toEqual(expectedTodo);
        expect(result.data.id).toBe("test-todo-id-123");
        expect(result.data.title).toBe("テストタスク");
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getTodoUseCase.execute({
        todoId: "non-existent-id",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getTodoUseCase.execute({
        todoId: "test-todo-id",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("異なるステータスのTODOを取得できること", async () => {
      const todoInProgress = todoDummyFrom({
        id: "todo-1",
        status: TodoStatus.inProgress(),
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(todoInProgress),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getTodoUseCase.execute({
        todoId: "todo-1",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.status.isInProgress()).toBe(true);
      }
    });

    test("異なる優先度のTODOを取得できること", async () => {
      const highPriorityTodo = todoDummyFrom({
        id: "todo-2",
        priority: "HIGH",
      });

      const getTodoUseCase = new GetTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(highPriorityTodo),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getTodoUseCase.execute({
        todoId: "todo-2",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.priority).toBe("HIGH");
      }
    });
  });
});
