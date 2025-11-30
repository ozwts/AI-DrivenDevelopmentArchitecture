import { test, expect, describe } from "vitest";
import { UpdateAttachmentStatusUseCaseImpl } from "./update-attachment-status-use-case";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.dummy";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { buildFetchNowDummy } from "@/domain/support/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import type { AttachmentStatus } from "@/domain/model/attachment/attachment";

describe("UpdateAttachmentStatusUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const updatedAt = new Date("2024-01-02T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(updatedAt);

  describe("execute", () => {
    test("ステータスをUPLOADEDに更新できること", async () => {
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
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
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: "UPLOADED",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("異なるステータスに更新できること", async () => {
      const statuses: AttachmentStatus[] = ["PREPARED", "UPLOADED"];

      for (const status of statuses) {
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

        const updateAttachmentStatusUseCase =
          new UpdateAttachmentStatusUseCaseImpl({
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
            fetchNow,
            logger: new LoggerDummy(),
          });

        const result = await updateAttachmentStatusUseCase.execute({
          todoId,
          attachmentId,
          status,
        });

        expect(result.success).toBe(true);
      }
    });

    test("TODOが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: undefined,
            },
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId: "non-existent-id",
        attachmentId: "attachment-1",
        status: "UPLOADED",
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: true,
              data: existingTodo,
            },
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId: "non-existent-attachment-id",
        status: "UPLOADED",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.name).toBe("NotFoundError");
        expect(result.error.message).toBe("添付ファイルが見つかりません");
      }
    });

    test("TODO取得に失敗した場合はエラーを返すこと", async () => {
      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
          todoRepository: new TodoRepositoryDummy({
            findByIdReturnValue: {
              success: false,
              error: new UnexpectedError(),
            },
          }),
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId: "todo-1",
        attachmentId: "attachment-1",
        status: "UPLOADED",
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
        status: "PREPARED",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment],
      });

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
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
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: "UPLOADED",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
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
        status: "PREPARED",
      });
      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        status: "PREPARED",
      });
      const attachment3 = attachmentDummyFrom({
        id: attachmentId3,
        status: "PREPARED",
      });
      const existingTodo = todoDummyFrom({
        id: todoId,
        attachments: [attachment1, attachment2, attachment3],
      });

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
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
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId: attachmentId2,
        status: "UPLOADED",
      });

      expect(result.success).toBe(true);
    });

    test("既にUPLOADEDのステータスのファイルを再度UPLOADEDに設定できること", async () => {
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

      const updateAttachmentStatusUseCase =
        new UpdateAttachmentStatusUseCaseImpl({
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
          fetchNow,
          logger: new LoggerDummy(),
        });

      const result = await updateAttachmentStatusUseCase.execute({
        todoId,
        attachmentId,
        status: "UPLOADED",
      });

      expect(result.success).toBe(true);
    });
  });
});
