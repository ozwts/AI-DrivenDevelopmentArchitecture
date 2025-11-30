import { test, expect, describe } from "vitest";
import { RegisterTodoUseCaseImpl } from "./register-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.dummy";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";
import { UnexpectedError, ValidationError } from "@/util/error-util";
import { Todo } from "@/domain/model/todo/todo";
import { dateToIsoString } from "@/util/date-util";

describe("RegisterTodoUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);
  const nowString = dateToIsoString(now);
  const userSub = "user-sub-123";
  const creatorUserId = "creator-user-123";

  describe("execute", () => {
    test("最小限の情報でTODOを作成できること", async () => {
      const todoId = "test-todo-id-123";
      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          todoIdReturnValue: todoId,
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "テストタスク",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(todoId);
        expect(result.data.title).toBe("テストタスク");
        expect(result.data.description).toBeUndefined();
        expect(result.data.status).toBe("TODO");
        expect(result.data.priority).toBe("MEDIUM");
        expect(result.data.dueDate).toBeUndefined();
        expect(result.data.projectId).toBeUndefined();
        expect(result.data.assigneeUserId).toBe(creatorUserId); // デフォルトで作成者が担当者
        expect(result.data.createdAt).toBe(nowString);
        expect(result.data.updatedAt).toBe(nowString);
      }
    });

    test("全ての情報を指定してTODOを作成できること", async () => {
      const todoId = "test-todo-id-456";
      const dueDate = "2024-12-31T23:59:59.000Z";
      const projectId = "project-123";
      const assigneeUserId = "assignee-user-456";

      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          todoIdReturnValue: todoId,
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "完全なタスク",
        description: "詳細な説明",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate,
        projectId,
        assigneeUserId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(todoId);
        expect(result.data.title).toBe("完全なタスク");
        expect(result.data.description).toBe("詳細な説明");
        expect(result.data.status).toBe("IN_PROGRESS");
        expect(result.data.priority).toBe("HIGH");
        expect(result.data.dueDate).toBe(dueDate);
        expect(result.data.projectId).toBe(projectId);
        expect(result.data.assigneeUserId).toBe(assigneeUserId); // 指定された担当者
      }
    });

    test("タイトルが空文字の場合はValidationErrorを返すこと", async () => {
      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy(),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe("TODOタイトルを入力してください");
      }
    });

    test("タイトルが空白文字のみの場合はValidationErrorを返すこと", async () => {
      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy(),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "   ",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe("TODOタイトルを入力してください");
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          saveReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "テストタスク",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("異なるステータスでTODOを作成できること", async () => {
      const statuses: Array<"TODO" | "IN_PROGRESS" | "COMPLETED"> = [
        "TODO",
        "IN_PROGRESS",
        "COMPLETED",
      ];

      for (const status of statuses) {
        const registerTodoUseCase = new RegisterTodoUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            saveReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: {
              success: true,
              data: userDummyFrom({ id: creatorUserId, sub: userSub }),
            },
          }),
          logger: new LoggerDummy(),
          fetchNow,
        });

        const result = await registerTodoUseCase.execute({
          userSub,
          title: `${status}タスク`,
          status,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });

    test("異なる優先度でTODOを作成できること", async () => {
      const priorities: Array<"LOW" | "MEDIUM" | "HIGH"> = [
        "LOW",
        "MEDIUM",
        "HIGH",
      ];

      for (const priority of priorities) {
        const registerTodoUseCase = new RegisterTodoUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            saveReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: {
              success: true,
              data: userDummyFrom({ id: creatorUserId, sub: userSub }),
            },
          }),
          logger: new LoggerDummy(),
          fetchNow,
        });

        const result = await registerTodoUseCase.execute({
          userSub,
          title: `${priority}タスク`,
          priority,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priority).toBe(priority);
        }
      }
    });

    test("生成されたTodoインスタンスが正しいプロパティを持つこと", async () => {
      const todoId = "test-todo-id-789";
      const registerTodoUseCase = new RegisterTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          todoIdReturnValue: todoId,
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: true,
            data: userDummyFrom({ id: creatorUserId, sub: userSub }),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await registerTodoUseCase.execute({
        userSub,
        title: "検証用タスク",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeInstanceOf(Todo);
        expect(typeof result.data.id).toBe("string");
        expect(typeof result.data.title).toBe("string");
        expect(typeof result.data.createdAt).toBe("string");
        expect(typeof result.data.updatedAt).toBe("string");
      }
    });
  });
});
