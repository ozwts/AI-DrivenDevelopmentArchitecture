import { test, expect, describe } from "vitest";
import { PrepareAttachmentUploadUseCaseImpl } from "./prepare-attachment-upload-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { StorageClientDummy } from "@/application/port/storage-client/dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

describe("PrepareAttachmentUploadUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);
  const userSub = "user-sub-123";
  const userId = "user-123";

  describe("execute", () => {
    test("正常にアップロード準備ができること", async () => {
      const todoId = "todo-1";
      const attachmentId = "attachment-1";
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [],
      });
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            attachmentIdReturnValue: attachmentId,
            saveReturnValue: Result.ok(undefined),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId,
        userSub,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.attachment.id).toBe(attachmentId);
        expect(result.data.uploadUrl).toBe(
          "https://example.com/upload-url?signature=dummy",
        );
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(undefined),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "non-existent-id",
        userSub,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("TODOが見つかりません");
      }
    });

    test("ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy(),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(undefined),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        userSub: "non-existent-sub",
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("ユーザーが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.err(new UnexpectedError()),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        userSub,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("Presigned URL生成に失敗した場合はエラーを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-1",
        attachments: [],
      });
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy({
            generatePresignedUploadUrlReturnValue: Result.err(
              new UnexpectedError("URL generation failed"),
            ),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        userSub,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はエラーを返すこと", async () => {
      const existingTodo = todoDummyFrom({
        id: "todo-1",
        attachments: [],
      });
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            saveReturnValue: Result.err(new UnexpectedError()),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId: "todo-1",
        userSub,
        fileName: "document.pdf",
        contentType: "application/pdf",
        fileSize: 1024,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
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
      const user = userDummyFrom({
        id: userId,
        sub: userSub,
      });

      const prepareAttachmentUploadUseCase =
        new PrepareAttachmentUploadUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            attachmentIdReturnValue: attachmentId1,
            saveReturnValue: Result.ok(undefined),
          }),
          userRepository: new UserRepositoryDummy({
            findBySubReturnValue: Result.ok(user),
          }),
          storageClient: new StorageClientDummy(),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await prepareAttachmentUploadUseCase.execute({
        todoId,
        userSub,
        fileName: "image.png",
        contentType: "image/png",
        fileSize: 2048,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.attachment.id).toBe(attachmentId1);
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
        const user = userDummyFrom({
          id: userId,
          sub: userSub,
        });

        const prepareAttachmentUploadUseCase =
          new PrepareAttachmentUploadUseCaseImpl({
            todoRepository: new TodoRepositoryDummy({
              findByIdReturnValue: Result.ok(existingTodo),
              saveReturnValue: Result.ok(undefined),
            }),
            userRepository: new UserRepositoryDummy({
              findBySubReturnValue: Result.ok(user),
            }),
            storageClient: new StorageClientDummy(),
            fetchNow,
            logger: new LoggerDummy(),
          });

        const result = await prepareAttachmentUploadUseCase.execute({
          todoId,
          userSub,
          fileName: `file.${contentType.split("/")[1]}`,
          contentType,
          fileSize: 1024,
        });

        expect(result.isOk()).toBe(true);
      }
    });
  });
});
