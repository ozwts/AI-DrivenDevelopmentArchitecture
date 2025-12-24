import { test, expect, describe } from "vitest";
import { ListTodosUseCaseImpl } from "./list-todos-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("ListTodosUseCaseのテスト", () => {
  describe("execute", () => {
    test("全てのTODOを取得できること", async () => {
      const todos = [
        todoDummyFrom({ id: "todo-1", title: "タスク1" }),
        todoDummyFrom({ id: "todo-2", title: "タスク2" }),
        todoDummyFrom({ id: "todo-3", title: "タスク3" }),
      ];

      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findAllReturnValue: Result.ok(todos),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(3);
        expect(result.data).toEqual(todos);
      }
    });

    test("ステータスを指定してTODOを取得できること", async () => {
      const inProgressTodos = [
        todoDummyFrom({ id: "todo-1", status: "IN_PROGRESS" }),
        todoDummyFrom({ id: "todo-2", status: "IN_PROGRESS" }),
      ];

      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByStatusReturnValue: Result.ok(inProgressTodos),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({
        status: "IN_PROGRESS",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((todo) => todo.status === "IN_PROGRESS")).toBe(
          true,
        );
      }
    });

    test("プロジェクトIDを指定してTODOを取得できること", async () => {
      const projectTodos = [
        todoDummyFrom({ id: "todo-1", projectId: "project-123" }),
        todoDummyFrom({ id: "todo-2", projectId: "project-123" }),
        todoDummyFrom({ id: "todo-3", projectId: "project-123" }),
      ];

      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByProjectIdReturnValue: Result.ok(projectTodos),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({
        projectId: "project-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(3);
        expect(
          result.data.every((todo) => todo.projectId === "project-123"),
        ).toBe(true);
      }
    });

    test("TODOが0件の場合は空配列を返すこと", async () => {
      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findAllReturnValue: Result.ok([]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({});

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findAllReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({});

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("TODOステータスでのフィルタリングが正しく動作すること", async () => {
      const doneTodos = [
        todoDummyFrom({
          id: "todo-1",
          status: "COMPLETED",
          title: "完了タスク1",
        }),
        todoDummyFrom({
          id: "todo-2",
          status: "COMPLETED",
          title: "完了タスク2",
        }),
      ];

      const listTodosUseCase = new ListTodosUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByStatusReturnValue: Result.ok(doneTodos),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listTodosUseCase.execute({
        status: "COMPLETED",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data.every((todo) => todo.status === "COMPLETED")).toBe(
          true,
        );
      }
    });
  });
});
