import { test, expect, describe } from "vitest";
import { UpdateAttachmentStatusUseCaseImpl } from "./update-attachment-status-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { attachmentDummyFrom } from "@/domain/model/todo/attachment.entity.dummy";
import { AttachmentStatus } from "@/domain/model/todo/attachment-status.vo";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Result } from "@/util/result";

describe("UpdateAttachmentStatusUseCaseのテスト", () => {
  const updatedAt = new Date("2024-01-02T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(updatedAt);

  describe("execute", () => {
    test("ステータスをUPLOADEDに更新できること", async () => {
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            saveReturnValue: Result.ok(undefined),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: AttachmentStatus.uploaded(),
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe(attachmentId);
        expect(result.data.status.isUploaded()).toBe(true);
      }
    });

    test("異なるステータスに更新できること", async () => {
      const statuses: AttachmentStatus[] = [
        AttachmentStatus.prepared(),
        AttachmentStatus.uploaded(),
      ];

      for (const status of statuses) {
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

        const updateAttachmentStatusUseCase =
          new UpdateAttachmentStatusUseCaseImpl({
            todoRepository: new TodoRepositoryDummy({
              findByIdReturnValue: Result.ok(existingTodo),
              saveReturnValue: Result.ok(undefined),
            }),
            fetchNow,
            logger: new LoggerDummy(),
          });

        const result = await updateAttachmentStatusUseCase.execute({
          todoId,
          attachmentId,
          status,
        });

        expect(result.isOk()).toBe(true);
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(undefined),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId: "non-existent-id",
        attachmentId: "attachment-1",
        status: AttachmentStatus.uploaded(),
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId: "non-existent-attachment-id",
        status: AttachmentStatus.uploaded(),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("添付ファイルが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.err(new UnexpectedError()),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId: "todo-1",
        attachmentId: "attachment-1",
        status: AttachmentStatus.uploaded(),
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
        status: AttachmentStatus.prepared(),
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            saveReturnValue: Result.err(new UnexpectedError()),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: AttachmentStatus.uploaded(),
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数の添付ファイルの中から特定のファイルのステータスを更新できること", async () => {
      const todoId = "todo-1";
      const attachmentId1 = "attachment-1";
      const attachmentId2 = "attachment-2";
      const attachmentId3 = "attachment-3";
      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
        status: AttachmentStatus.prepared(),
      });
      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        status: AttachmentStatus.prepared(),
      });
      const attachment3 = attachmentDummyFrom({
        id: attachmentId3,
        status: AttachmentStatus.prepared(),
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment1, attachment2, attachment3],
      });

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            saveReturnValue: Result.ok(undefined),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId: attachmentId2,
        status: AttachmentStatus.uploaded(),
      });

      expect(result.isOk()).toBe(true);
    });

    test("既にUPLOADEDのステータスのファイルを再度UPLOADEDに設定できること", async () => {
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: Result.ok(existingTodo),
            saveReturnValue: Result.ok(undefined),
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: AttachmentStatus.uploaded(),
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
