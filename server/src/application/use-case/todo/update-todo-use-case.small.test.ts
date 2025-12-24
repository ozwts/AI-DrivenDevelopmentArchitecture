import { test, expect, describe } from "vitest";
import { UpdateTodoUseCaseImpl } from "./update-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { TodoStatus } from "@/domain/model/todo/todo-status.vo";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";
import { dateToIsoString } from "@/util/date-util";

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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-1",
        title: "新しいタイトル",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.title).toBe("新しいタイトル");
        expect(result.data.updatedAt).toBe(dateToIsoString(updatedAt));
      }
    });

    test("TODOのステータスを更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-2",
        status: TodoStatus.todo(),
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-2",
        status: TodoStatus.inProgress(),
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.status.isInProgress()).toBe(true);
      }
    });

    test("TODOの優先度を更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-3",
        priority: "MEDIUM",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-3",
        priority: "HIGH",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.priority).toBe("HIGH");
      }
    });

    test("複数のフィールドを同時に更新できること", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-4",
        title: "古いタイトル",
        status: TodoStatus.todo(),
        priority: "LOW",
        description: "古い説明",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-4",
        title: "新しいタイトル",
        status: TodoStatus.completed(),
        priority: "HIGH",
        description: "新しい説明",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.title).toBe("新しいタイトル");
        expect(result.data.status.isCompleted()).toBe(true);
        expect(result.data.priority).toBe("HIGH");
        expect(result.data.description).toBe("新しい説明");
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "non-existent-id",
        title: "新しいタイトル",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("findByIdでエラーが発生した場合はそのエラーを返すこと", async () => {
      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-5",
        title: "新しいタイトル",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-6",
      });

      const updateTodoUseCase = new UpdateTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.err(new UnexpectedError()),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-6",
        title: "新しいタイトル",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-7",
        dueDate: newDueDate,
        projectId: newProjectId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await updateTodoUseCase.execute({
        todoId: "todo-8",
        title: "新しいタイトル",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.createdAt).toBe(createdAt);
        expect(result.data.updatedAt).not.toBe(createdAt);
      }
    });
  });
});
