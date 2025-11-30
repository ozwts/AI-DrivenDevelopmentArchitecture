import { test, expect, describe } from "vitest";
import { DeleteAttachmentUseCaseImpl } from "./delete-attachment-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.dummy";
import { StorageClientDummy } from "@/domain/support/storage-client/dummy";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";

describe("DeleteAttachmentUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);

  describe("execute", () => {
    test("添付ファイルを削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        storageKey: "attachments/todo-1/attachment-1/document.pdf",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId: "non-existent-id",
        attachmentId: "attachment-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("Attachmentが見つからない場合はNotFoundErrorを返すこと", async () => {
      const todoId = "todo-1";
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId: "non-existent-attachment-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("添付ファイルが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId: "todo-1",
        attachmentId: "attachment-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("S3削除に失敗した場合はエラーを返すこと", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingTodo,
          },
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: {
            success: false,
            error: new UnexpectedError("S3 deletion failed"),
          },
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はエラーを返すこと", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数の添付ファイルの中から特定のファイルのみを削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId1 = "attachment-1";
      const attachmentId2 = "attachment-2";
      const attachmentId3 = "attachment-3";
      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
      });
      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
      });
      const attachment3 = attachmentDummyFrom({
        id: attachmentId3,
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment1, attachment2, attachment3],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId: attachmentId2,
      });

      expect(result.success).toBe(true);
    });

    test("PREPAREDステータスのファイルも削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        status: "PREPARED",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
    });

    test("UPLOADEDステータスのファイルも削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        status: "UPLOADED",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
    });

    test("すべての添付ファイルを削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
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
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
    });
  });
});
