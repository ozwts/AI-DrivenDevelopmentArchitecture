import { test, expect, describe } from "vitest";
import { GetAttachmentDownloadUrlUseCaseImpl } from "./get-attachment-download-url-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.dummy";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError } from "@/util/error-util";

describe("GetAttachmentDownloadUrlUseCaseのテスト", () => {
  describe("execute", () => {
    test("ダウンロードURLを取得できること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
        storageKey: "attachments/todo-1/attachment-1/document.pdf",
        status: "UPLOADED",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.downloadUrl).toBe(
          "https://example.com/download-url?signature=dummy",
        );
        expect(result.data.fileName).toBe("document.pdf");
        expect(result.data.contentType).toBe("application/pdf");
        expect(result.data.fileSize).toBe(1024);
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
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

      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
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
      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: false,
              error: new UnexpectedError(),
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
        todoId: "todo-1",
        attachmentId: "attachment-1",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("Presigned URL生成に失敗した場合はエラーを返すこと", async () => {
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

      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy({
            generatePresignedDownloadUrlReturnValue: {
              success: false,
              error: new UnexpectedError("URL generation failed"),
            },
          }),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数の添付ファイルの中から特定のファイルのダウンロードURLを取得できること", async () => {
      const todoId = "todo-1";
      const attachmentId1 = "attachment-1";
      const attachmentId2 = "attachment-2";
      const attachmentId3 = "attachment-3";
      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
        fileName: "file1.pdf",
      });
      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        fileName: "file2.jpg",
      });
      const attachment3 = attachmentDummyFrom({
        id: attachmentId3,
        fileName: "file3.png",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment1, attachment2, attachment3],
      });

      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
        todoId,
        attachmentId: attachmentId2,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fileName).toBe("file2.jpg");
      }
    });

    test("異なるコンテンツタイプのファイルのダウンロードURLを取得できること", async () => {
      const contentTypes = [
        { type: "application/pdf", size: 1024 },
        { type: "image/jpeg", size: 2048 },
        { type: "image/png", size: 3072 },
        { type: "text/plain", size: 512 },
      ];

      for (const { type, size } of contentTypes) {
        const todoId = "todo-1";
        const attachmentId = "attachment-1";
        const attachment = attachmentDummyFrom({
          id: attachmentId,
          contentType: type,
          fileSize: size,
        });
        const existingTodo = todoDummyFrom({
          id: todoId,
          attachments: [attachment],
        });

        const getAttachmentDownloadUrlUseCase =
          new GetAttachmentDownloadUrlUseCaseImpl({
            todoRepository: new TodoRepositoryDummy({
              findByIdReturnValue: {
                success: true,
                data: existingTodo,
              },
            }),
            storageClient: new StorageClientDummy(),
            logger: new LoggerDummy(),
          });

        const result = await getAttachmentDownloadUrlUseCase.execute({
          todoId,
          attachmentId,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.contentType).toBe(type);
          expect(result.data.fileSize).toBe(size);
        }
      }
    });

    test("PREPAREDステータスのファイルでもダウンロードURLを取得できること", async () => {
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

      const getAttachmentDownloadUrlUseCase =
        new GetAttachmentDownloadUrlUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          storageClient: new StorageClientDummy(),
          logger: new LoggerDummy(),
        });

      const result = await getAttachmentDownloadUrlUseCase.execute({
        todoId,
        attachmentId,
      });

      expect(result.success).toBe(true);
    });
  });
});
