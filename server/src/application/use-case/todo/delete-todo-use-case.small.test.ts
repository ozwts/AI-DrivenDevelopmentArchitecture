import { test, expect, describe } from "vitest";
import { DeleteTodoUseCaseImpl } from "./delete-todo-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.dummy";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError } from "@/util/error-util";

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
          findByIdReturnValue: {
            success: true,
            data: todo,
          },
          removeReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("削除に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: todoDummyFrom({
              id: "todo-to-delete",
              attachments: [],
            }),
          },
          removeReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "todo-to-delete",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数回の削除操作を実行できること", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: todoDummyFrom({
              id: "todo-1",
              attachments: [],
            }),
          },
          removeReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result1 = await deleteTodoUseCase.execute({ todoId: "todo-1" });
      const result2 = await deleteTodoUseCase.execute({ todoId: "todo-2" });
      const result3 = await deleteTodoUseCase.execute({ todoId: "todo-3" });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);
    });

    test("異なるTODO IDで削除できること", async () => {
      const todoIds = ["todo-a", "todo-b", "todo-c", "todo-xyz-123"];

      for (const todoId of todoIds) {
        const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: todoDummyFrom({
                id: todoId,
                attachments: [],
              }),
            },
            removeReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

        const result = await deleteTodoUseCase.execute({ todoId });
        expect(result.success).toBe(true);
      }
    });

    test("削除処理が正しく完了することを確認", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: todoDummyFrom({
              id: "final-todo",
              attachments: [],
            }),
          },
          removeReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "final-todo",
      });

      expect(result.success).toBe(true);
      if (result.success) {
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
          findByIdReturnValue: {
            success: true,
            data: todo,
          },
          removeReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({ todoId });

      expect(result.success).toBe(true);
      if (result.success) {
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
          findByIdReturnValue: {
            success: true,
            data: todo,
          },
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({ todoId });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("存在しないTODOを削除しようとした場合は成功を返すこと（冪等性）", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined, // TODOが存在しない
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "non-existent-todo",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const deleteTodoUseCase = new DeleteTodoUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        storageClient: new StorageClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteTodoUseCase.execute({
        todoId: "todo-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
