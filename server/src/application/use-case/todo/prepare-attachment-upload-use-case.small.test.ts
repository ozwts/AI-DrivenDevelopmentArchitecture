import { test, expect, describe } from "vitest";
import { PrepareAttachmentUploadUseCaseImpl } from "./prepare-attachment-upload-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";

describe("PrepareAttachmentUploadUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);
  const uploadedBy = "user-123";

  describe("execute", () => {
    test("正常にアップロード準備ができること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [],
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
            attachmentIdReturnValue: attachmentId,
            saveReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attachmentId).toBe(attachmentId);
        expect(result.data.uploadUrl).toBe(
          "https://example.com/upload-url?signature=dummy",
        );
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
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

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "non-existent-id",
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
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

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("Presigned URL生成に失敗した場合はエラーを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-1",
        attachments: [],
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy({
            generatePresignedUploadUrlReturnValue: {
              success: false,
              error: new UnexpectedError("URL generation failed"),
            },
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はエラーを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-1",
        attachments: [],
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
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

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        uploadedBy,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数の添付ファイルを追加できること", async () => {
      const todoId = "todo-1";
      const attachmentId1 = "attachment-1";
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [],
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
            attachmentIdReturnValue: attachmentId1,
            saveReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId,
        fileName: "image.png",
        contentType: "image/png",
        fileSize: 2048,
        uploadedBy,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.attachmentId).toBe(attachmentId1);
      }
    });

    test("異なるコンテンツタイプのファイルをアップロード準備できること", async () => {
      const contentTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "text/plain",
        "application/zip",
      ];

      for (const contentType of contentTypes) {
        const todoId = "todo-1";
        const existingTodo = todoDummyFrom({
          id: todoId,
          attachments: [],
        });

        const prepareAttachmentUploadUseCase =
          new PrepareAttachmentUploadUseCaseImpl({
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

        const result = await prepareAttachmentUploadUseCase.execute({
          todoId,
          fileName: `file.${contentType.split("/")[1]}`,
          contentType,
          fileSize: 1024,
          uploadedBy,
        });

        expect(result.success).toBe(true);
      }
    });
  });
});
