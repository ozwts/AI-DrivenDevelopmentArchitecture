import { test, expect, describe } from "vitest";
import { DeleteAttachmentUseCaseImpl } from "./delete-attachment-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { attachmentDummyFrom } from "@/domain/model/todo/attachment.entity.dummy";
import { AttachmentStatus } from "@/domain/model/todo/attachment-status.vo";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId: "non-existent-id",
        attachmentId: "attachment-1",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId: "non-existent-attachment-id",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("添付ファイルが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId: "todo-1",
        attachmentId: "attachment-1",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
        }),
        storageClient: new StorageClientDummy({
          deleteObjectReturnValue: Result.err(
            new UnexpectedError("S3 deletion failed"),
          ),
        }),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.err(new UnexpectedError()),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId: attachmentId2,
      });

      expect(result.isOk()).toBe(true);
    });

    test("PREPAREDステータスのファイルも削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        status: AttachmentStatus.prepared(),
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isOk()).toBe(true);
    });

    test("UPLOADEDステータスのファイルも削除できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        status: AttachmentStatus.uploaded(),
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const deleteAttachmentUseCase = new DeleteAttachmentUseCaseImpl({
        todoRepository: new TodoRepositoryDummy({
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isOk()).toBe(true);
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
          findByIdReturnValue: Result.ok(existingTodo),
          saveReturnValue: Result.ok(undefined),
        }),
        storageClient: new StorageClientDummy(),
        fetchNow,
        logger: new LoggerDummy(),
      });

      const result = await deleteAttachmentUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
