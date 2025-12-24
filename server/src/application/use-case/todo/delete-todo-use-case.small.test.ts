import { test, expect, describe } from "vitest";
import { DeleteTodoUseCaseImpl } from "./delete-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { attachmentDummyFrom } from "@/domain/model/todo/attachment.entity.dummy";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

describe("DeleteTodoUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのTODOを削除できること", async () => {
      const todoId = "todo-to-delete";
      const todo = todoDummyFrom({
        id: todoId,
        title: "削除するTODO",
        attachments: [],
      });

      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(todo),
          removeReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("削除に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(
            todoDummyFrom({
              id: "todo-to-delete",
              attachments: [],
            }),
          ),
          removeReturnValue: Result.err(new UnexpectedError()),
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "todo-to-delete",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数回の削除操作を実行できること", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(
            todoDummyFrom({
              id: "todo-1",
              attachments: [],
            }),
          ),
          removeReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result1 = await deleteTodoUseCase.execute({ todoId: "todo-1" });
      const result2 = await deleteTodoUseCase.execute({ todoId: "todo-2" });
      const result3 = await deleteTodoUseCase.execute({ todoId: "todo-3" });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      expect(result3.isOk()).toBe(true);
    });

    test("異なるTODO IDで削除できること", async () => {
      const todoIds = ["todo-a", "todo-b", "todo-c", "todo-xyz-123"];

      for (const todoId of todoIds) {
        const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(
              todoDummyFrom({
                id: todoId,
                attachments: [],
              }),
            ),
            removeReturnValue: Result.ok(undefined),
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

        const result = await deleteTodoUseCase.execute({ todoId });
        expect(result.isOk()).toBe(true);
      }
    });

    test("削除処理が正しく完了することを確認", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(
            todoDummyFrom({
              id: "final-todo",
              attachments: [],
            }),
          ),
          removeReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "final-todo",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("添付ファイル付きTODOを削除する際にS3からも削除されること", async () => {
      const todoId = "todo-with-attachments";
      const attachment1 = attachmentDummyFrom({
        id: "attachment-1",
        fileName: "file1.pdf",
        storageKey: "storage/key/file1.pdf",
      });
      const attachment2 = attachmentDummyFrom({
        id: "attachment-2",
        fileName: "file2.jpg",
        storageKey: "storage/key/file2.jpg",
      });
      const todo = todoDummyFrom({
        id: todoId,
        attachments: [attachment1, attachment2],
      });

      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(todo),
          removeReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({ todoId });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("S3からの添付ファイル削除に失敗した場合はエラーを返すこと", async () => {
      const todoId = "todo-with-attachment";
      const attachment = attachmentDummyFrom({
        id: "attachment-1",
        fileName: "file.pdf",
        storageKey: "storage/key/file.pdf",
      });
      const todo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(todo),
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({ todoId });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("存在しないTODOを削除しようとした場合は成功を返すこと（冪等性）", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined), // TODOが存在しない
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "non-existent-todo",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "todo-id",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
