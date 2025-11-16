import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildTodosTableParams,
  buildAttachmentsTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { TodoRepositoryImpl } from "./todo-repository";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import { Todo } from "@/domain/model/todo/todo";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { attachmentDummyFrom } from "@/domain/model/attachment/attachment.dummy";

const { ddb, ddbDoc } = buildDdbClients();
const todosTableName = getRandomIdentifier();
const attachmentsTableName = getRandomIdentifier();

const setUpDependencies = (): {
  todoRepository: TodoRepository;
} => {
  const logger = new LoggerDummy();
  const todoRepository = new TodoRepositoryImpl({
    ddbDoc,
    todosTableName,
    attachmentsTableName,
    logger,
  });

  return {
    todoRepository,
  };
};

beforeEach(async () => {
  await refreshTable(
    buildTodosTableParams({
      ddb,
      todosTableName,
    }),
  );
  await refreshTable(
    buildAttachmentsTableParams({
      ddb,
      attachmentsTableName,
    }),
  );
});

afterAll(async () => {
  await ddb.send(
    new DeleteTableCommand({
      TableName: todosTableName,
    }),
  );
  await ddb.send(
    new DeleteTableCommand({
      TableName: attachmentsTableName,
    }),
  );
});

describe("TodoRepositoryImpl", () => {
  describe("todoId", () => {
    test("[正常系] 新しいTodo IDを生成する", () => {
      const { todoRepository } = setUpDependencies();

      const id1 = todoRepository.todoId();
      const id2 = todoRepository.todoId();

      // UUIDの形式を満たしている
      expect(id1).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
      expect(id2).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      // 毎回異なるIDが生成される
      expect(id1).not.toBe(id2);
    });
  });

  describe("save", () => {
    test("[正常系] 包括的なTodo操作（全フィールド）", async () => {
      const { todoRepository } = setUpDependencies();

      // 1. 包括的なTODOを作成・保存
      const todoId = todoRepository.todoId();
      const todo = todoDummyFrom({
        id: todoId,
        title: "要件定義書の作成",
        description: "顧客要件をまとめた要件定義書を作成する",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: "2024-01-31T23:59:59.999+09:00",
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      const saveResult = await todoRepository.save({ todo });
      expect(saveResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 2. 保存したTODOを取得して確認
      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toStrictEqual(todo);
      }
    });

    test("[正常系] 最小限のTodo操作（必須フィールドのみ）", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const todo = todoDummyFrom({
        id: todoId,
        title: "最小限TODO",
        status: "TODO",
        priority: "MEDIUM",
        createdAt: "2024-01-02T00:00:00.000+09:00",
        updatedAt: "2024-01-02T00:00:00.000+09:00",
      });

      const saveResult = await todoRepository.save({ todo });
      expect(saveResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toStrictEqual(todo);
        // デフォルト値の確認
        expect(findResult.data?.status).toBe("TODO");
        expect(findResult.data?.priority).toBe("MEDIUM");
      }
    });

    test("[正常系] 既存のTodoを更新する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const originalTodo = todoDummyFrom({
        id: todoId,
        title: "元のTODO",
        status: "TODO",
        createdAt: "2024-01-03T00:00:00.000+09:00",
        updatedAt: "2024-01-03T00:00:00.000+09:00",
      });

      await todoRepository.save({ todo: originalTodo });

      // ステータスを変更
      const updatedTodo = originalTodo.changeStatus(
        "IN_PROGRESS",
        "2024-01-03T12:00:00.000+09:00",
      );

      const updateResult = await todoRepository.save({ todo: updatedTodo });
      expect(updateResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toStrictEqual(updatedTodo);
        expect(findResult.data?.status).toBe("IN_PROGRESS");
        expect(findResult.data?.updatedAt).toBe(
          "2024-01-03T12:00:00.000+09:00",
        );
      }
    });

    test("[正常系] 添付ファイルを含むTodoを保存・取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId1 = todoRepository.attachmentId();
      const attachmentId2 = todoRepository.attachmentId();

      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
        fileName: "document.pdf",
        storageKey: `attachments/${todoId}/${attachmentId1}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-03T10:00:00.000+09:00",
        updatedAt: "2024-01-03T10:00:00.000+09:00",
      });

      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        fileName: "screenshot.png",
        storageKey: `attachments/${todoId}/${attachmentId2}`,
        contentType: "image/png",
        fileSize: 2048,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-03T10:01:00.000+09:00",
        updatedAt: "2024-01-03T10:01:00.000+09:00",
      });

      const todo = todoDummyFrom({
        id: todoId,
        title: "添付ファイル付きTODO",
        status: "TODO",
        attachments: [attachment1, attachment2],
        createdAt: "2024-01-03T10:00:00.000+09:00",
        updatedAt: "2024-01-03T10:00:00.000+09:00",
      });

      // 保存
      const saveResult = await todoRepository.save({ todo });
      expect(saveResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 取得して添付ファイルが復元されることを確認
      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.id).toBe(todo.id);
        expect(findResult.data?.title).toBe(todo.title);
        expect(findResult.data?.attachments).toHaveLength(2);
        // DynamoDBからの取得順序はattachmentIdの辞書順になるため、順序に依存しない検証
        expect(findResult.data?.attachments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: attachment1.id }),
            expect.objectContaining({ id: attachment2.id }),
          ]),
        );
      }
    });

    test("[正常系] 添付ファイルを削除した後の保存（Replace戦略）", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId1 = todoRepository.attachmentId();
      const attachmentId2 = todoRepository.attachmentId();

      // 1. 2つの添付ファイルを持つTodoを作成
      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
        fileName: "file1.pdf",
        storageKey: `attachments/${todoId}/${attachmentId1}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-06T10:00:00.000+09:00",
        updatedAt: "2024-01-06T10:00:00.000+09:00",
      });

      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        fileName: "file2.png",
        storageKey: `attachments/${todoId}/${attachmentId2}`,
        contentType: "image/png",
        fileSize: 2048,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-06T10:01:00.000+09:00",
        updatedAt: "2024-01-06T10:01:00.000+09:00",
      });

      const todoWithTwoAttachments = todoDummyFrom({
        id: todoId,
        title: "添付ファイル削除テスト",
        status: "TODO",
        attachments: [attachment1, attachment2],
        createdAt: "2024-01-06T10:00:00.000+09:00",
        updatedAt: "2024-01-06T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todoWithTwoAttachments });

      // 2. 1つの添付ファイルを削除（removeAttachmentメソッド使用）
      const todoWithOneAttachment = todoWithTwoAttachments.removeAttachment(
        attachmentId1,
        "2024-01-06T11:00:00.000+09:00",
      );

      const updateResult = await todoRepository.save({
        todo: todoWithOneAttachment,
      });
      expect(updateResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 3. DBから取得して、削除された添付ファイルが存在しないことを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.attachments).toHaveLength(1);
        expect(findResult.data?.attachments[0].id).toBe(attachmentId2);
        expect(findResult.data?.attachments[0].fileName).toBe("file2.png");
        // 削除された添付ファイルが含まれていないことを確認
        expect(
          findResult.data?.attachments.find((a) => a.id === attachmentId1),
        ).toBeUndefined();
      }
    });

    test("[正常系] 添付ファイルを追加した後の保存（Replace戦略）", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId1 = todoRepository.attachmentId();
      const attachmentId2 = todoRepository.attachmentId();

      // 1. 1つの添付ファイルを持つTodoを作成
      const attachment1 = attachmentDummyFrom({
        id: attachmentId1,
        fileName: "original.pdf",
        storageKey: `attachments/${todoId}/${attachmentId1}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-07T10:00:00.000+09:00",
        updatedAt: "2024-01-07T10:00:00.000+09:00",
      });

      const todoWithOneAttachment = todoDummyFrom({
        id: todoId,
        title: "添付ファイル追加テスト",
        status: "TODO",
        attachments: [attachment1],
        createdAt: "2024-01-07T10:00:00.000+09:00",
        updatedAt: "2024-01-07T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todoWithOneAttachment });

      // 2. 新しい添付ファイルを追加
      const attachment2 = attachmentDummyFrom({
        id: attachmentId2,
        fileName: "new.png",
        storageKey: `attachments/${todoId}/${attachmentId2}`,
        contentType: "image/png",
        fileSize: 2048,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-07T11:00:00.000+09:00",
        updatedAt: "2024-01-07T11:00:00.000+09:00",
      });

      const todoWithTwoAttachments = todoWithOneAttachment.update({
        attachments: [attachment1, attachment2],
        updatedAt: "2024-01-07T11:00:00.000+09:00",
      });

      const updateResult = await todoRepository.save({
        todo: todoWithTwoAttachments,
      });
      expect(updateResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 3. DBから取得して、新しい添付ファイルが追加されていることを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.attachments).toHaveLength(2);
        expect(findResult.data?.attachments).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: attachmentId1 }),
            expect.objectContaining({ id: attachmentId2 }),
          ]),
        );
      }
    });

    test("[正常系] 添付ファイルを全て削除した後の保存（Replace戦略）", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      // 1. 添付ファイルを持つTodoを作成
      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "to-be-deleted.pdf",
        storageKey: `attachments/${todoId}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-08T10:00:00.000+09:00",
        updatedAt: "2024-01-08T10:00:00.000+09:00",
      });

      const todoWithAttachment = todoDummyFrom({
        id: todoId,
        title: "全添付ファイル削除テスト",
        status: "TODO",
        attachments: [attachment],
        createdAt: "2024-01-08T10:00:00.000+09:00",
        updatedAt: "2024-01-08T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todoWithAttachment });

      // 2. 全ての添付ファイルを削除
      const todoWithoutAttachments = todoWithAttachment.removeAttachment(
        attachmentId,
        "2024-01-08T11:00:00.000+09:00",
      );

      const updateResult = await todoRepository.save({
        todo: todoWithoutAttachments,
      });
      expect(updateResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 3. DBから取得して、添付ファイルが空配列であることを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.attachments).toHaveLength(0);
        expect(findResult.data?.attachments).toEqual([]);
      }
    });

    test("[正常系] 添付ファイルのステータスを更新した後の保存（Replace戦略）", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      // 1. PREPAREDステータスの添付ファイルを持つTodoを作成
      const preparedAttachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "pending-upload.pdf",
        storageKey: `attachments/${todoId}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "PREPARED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-09T10:00:00.000+09:00",
        updatedAt: "2024-01-09T10:00:00.000+09:00",
      });

      const todoWithPreparedAttachment = todoDummyFrom({
        id: todoId,
        title: "添付ファイルステータス更新テスト",
        status: "TODO",
        attachments: [preparedAttachment],
        createdAt: "2024-01-09T10:00:00.000+09:00",
        updatedAt: "2024-01-09T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todoWithPreparedAttachment });

      // 2. 添付ファイルのステータスをUPLOADEDに更新
      const uploadedAttachment = attachmentDummyFrom({
        ...preparedAttachment,
        status: "UPLOADED",
        updatedAt: "2024-01-09T11:00:00.000+09:00",
      });

      const todoWithUploadedAttachment = todoWithPreparedAttachment.update({
        attachments: [uploadedAttachment],
        updatedAt: "2024-01-09T11:00:00.000+09:00",
      });

      const updateResult = await todoRepository.save({
        todo: todoWithUploadedAttachment,
      });
      expect(updateResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      // 3. DBから取得して、ステータスが更新されていることを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.attachments).toHaveLength(1);
        expect(findResult.data?.attachments[0].id).toBe(attachmentId);
        expect(findResult.data?.attachments[0].status).toBe("UPLOADED");
        expect(findResult.data?.attachments[0].updatedAt).toBe(
          "2024-01-09T11:00:00.000+09:00",
        );
      }
    });

    test("[異常系] 登録するデータの値がバリデーション違反の場合、エラーを返す", async () => {
      const { todoRepository } = setUpDependencies();

      const invalidTodo = todoDummyFrom({
        id: "invalid-id",
        title: "Invalid TODO",
        assigneeUserId: "", // 空文字列は不正
        createdAt: "2024-01-05T00:00:00.000+09:00",
        updatedAt: "2024-01-05T00:00:00.000+09:00",
      });

      await expect(todoRepository.save({ todo: invalidTodo })).rejects.toThrow(
        "assigneeUserIdは必須です",
      );
    });
  });

  describe("findById", () => {
    test("[正常系] 存在するTodoをIDで取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const todo = todoDummyFrom({
        id: todoId,
        title: "検索テストTODO",
        createdAt: "2024-01-04T00:00:00.000+09:00",
        updatedAt: "2024-01-04T00:00:00.000+09:00",
      });

      await todoRepository.save({ todo });

      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult).toStrictEqual({
        success: true,
        data: todo,
      });
    });

    test("[正常系] 存在しないTodoを検索するとundefinedを返す", async () => {
      const { todoRepository } = setUpDependencies();

      const findResult = await todoRepository.findById({
        id: "non-existent-id",
      });
      expect(findResult).toStrictEqual({
        success: true,
        data: undefined,
      });
    });

    test("[正常系] 添付ファイル付きTodoをIDで取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "report.pdf",
        storageKey: `attachments/${todoId}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 2048,
        status: "UPLOADED",
        uploadedBy: "user-sub-456",
        createdAt: "2024-01-04T10:00:00.000+09:00",
        updatedAt: "2024-01-04T10:00:00.000+09:00",
      });

      const todo = todoDummyFrom({
        id: todoId,
        title: "添付ファイル付き検索テストTODO",
        attachments: [attachment],
        createdAt: "2024-01-04T10:00:00.000+09:00",
        updatedAt: "2024-01-04T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo });

      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.id).toBe(todo.id);
        expect(findResult.data?.title).toBe(todo.title);
        expect(findResult.data?.attachments).toHaveLength(1);
        expect(findResult.data?.attachments[0].id).toBe(attachment.id);
        expect(findResult.data?.attachments[0].fileName).toBe(
          attachment.fileName,
        );
      }
    });
  });

  describe("findAll", () => {
    test("[正常系] 全てのTodoを取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todo1 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "全件検索TODO1",
        createdAt: "2024-01-10T00:00:00.000+09:00",
        updatedAt: "2024-01-10T00:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "全件検索TODO2",
        createdAt: "2024-01-10T01:00:00.000+09:00",
        updatedAt: "2024-01-10T01:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      const findAllResult = await todoRepository.findAll();
      expect(findAllResult.success).toBe(true);
      if (findAllResult.success) {
        expect(findAllResult.data).toHaveLength(2);
        expect(findAllResult.data.map((t: Todo) => t.id)).toContain(todo1.id);
        expect(findAllResult.data.map((t: Todo) => t.id)).toContain(todo2.id);
      }
    });

    test("[正常系] 添付ファイル付きTodoを含む全件取得", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId1 = todoRepository.todoId();
      const todoId2 = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "test.pdf",
        storageKey: `attachments/${todoId1}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-123",
        createdAt: "2024-01-10T00:00:00.000+09:00",
        updatedAt: "2024-01-10T00:00:00.000+09:00",
      });

      const todo1 = todoDummyFrom({
        id: todoId1,
        title: "添付あり",
        attachments: [attachment],
        createdAt: "2024-01-10T00:00:00.000+09:00",
        updatedAt: "2024-01-10T00:00:00.000+09:00",
      });

      const todo2 = todoDummyFrom({
        id: todoId2,
        title: "添付なし",
        createdAt: "2024-01-10T01:00:00.000+09:00",
        updatedAt: "2024-01-10T01:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      const findAllResult = await todoRepository.findAll();
      expect(findAllResult.success).toBe(true);
      if (findAllResult.success) {
        expect(findAllResult.data).toHaveLength(2);
        const foundTodo1 = findAllResult.data.find(
          (t: Todo) => t.id === todoId1,
        );
        const foundTodo2 = findAllResult.data.find(
          (t: Todo) => t.id === todoId2,
        );
        expect(foundTodo1?.attachments).toHaveLength(1);
        expect(foundTodo1?.attachments[0]).toStrictEqual(attachment);
        expect(foundTodo2?.attachments).toHaveLength(0);
      }
    });

    test("[正常系] Todoが存在しない場合、空配列を返す", async () => {
      const { todoRepository } = setUpDependencies();

      const findAllResult = await todoRepository.findAll();
      expect(findAllResult).toStrictEqual({
        success: true,
        data: [],
      });
    });
  });

  describe("findByStatus", () => {
    test("[正常系] 指定したステータスのTodoを取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todo1 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "TODO状態のタスク",
        status: "TODO",
        createdAt: "2024-01-11T00:00:00.000+09:00",
        updatedAt: "2024-01-11T00:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "IN_PROGRESS状態のタスク",
        status: "IN_PROGRESS",
        createdAt: "2024-01-11T01:00:00.000+09:00",
        updatedAt: "2024-01-11T01:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      const findResult = await todoRepository.findByStatus({ status: "TODO" });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toHaveLength(1);
        expect(findResult.data[0].id).toBe(todo1.id);
        expect(findResult.data[0].status).toBe("TODO");
      }
    });

    test("[正常系] 添付ファイル付きTodoをステータスで取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "status-test.pdf",
        storageKey: `attachments/${todoId}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 1024,
        status: "UPLOADED",
        uploadedBy: "user-sub-789",
        createdAt: "2024-01-11T10:00:00.000+09:00",
        updatedAt: "2024-01-11T10:00:00.000+09:00",
      });

      const todo = todoDummyFrom({
        id: todoId,
        title: "ステータス検索用添付ファイル付きTODO",
        status: "IN_PROGRESS",
        attachments: [attachment],
        createdAt: "2024-01-11T10:00:00.000+09:00",
        updatedAt: "2024-01-11T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo });

      const findResult = await todoRepository.findByStatus({
        status: "IN_PROGRESS",
      });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        const foundTodo = findResult.data.find((t: Todo) => t.id === todoId);
        expect(foundTodo?.attachments).toHaveLength(1);
        expect(foundTodo?.attachments[0].id).toBe(attachment.id);
      }
    });
  });

  describe("findByProjectId", () => {
    test("[正常系] 指定したプロジェクトIDのTodoを取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const projectId = "project-abc";
      const todo1 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "プロジェクトABCのタスク1",
        projectId,
        createdAt: "2024-01-12T00:00:00.000+09:00",
        updatedAt: "2024-01-12T00:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "プロジェクトABCのタスク2",
        projectId,
        createdAt: "2024-01-12T01:00:00.000+09:00",
        updatedAt: "2024-01-12T01:00:00.000+09:00",
      });
      const todo3 = todoDummyFrom({
        id: todoRepository.todoId(),
        title: "別プロジェクトのタスク",
        projectId: "project-xyz",
        createdAt: "2024-01-12T02:00:00.000+09:00",
        updatedAt: "2024-01-12T02:00:00.000+09:00",
      });

      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });
      await todoRepository.save({ todo: todo3 });

      const findResult = await todoRepository.findByProjectId({ projectId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data).toHaveLength(2);
        expect(findResult.data.map((t: Todo) => t.id)).toContain(todo1.id);
        expect(findResult.data.map((t: Todo) => t.id)).toContain(todo2.id);
      }
    });

    test("[正常系] 添付ファイル付きTodoをプロジェクトIDで取得する", async () => {
      const { todoRepository } = setUpDependencies();

      const projectId = "project-def";
      const todoId = todoRepository.todoId();
      const attachmentId = todoRepository.attachmentId();

      const attachment = attachmentDummyFrom({
        id: attachmentId,
        fileName: "project-test.pdf",
        storageKey: `attachments/${todoId}/${attachmentId}`,
        contentType: "application/pdf",
        fileSize: 3072,
        status: "UPLOADED",
        uploadedBy: "user-sub-012",
        createdAt: "2024-01-12T10:00:00.000+09:00",
        updatedAt: "2024-01-12T10:00:00.000+09:00",
      });

      const todo = todoDummyFrom({
        id: todoId,
        title: "プロジェクト検索用添付ファイル付きTODO",
        projectId,
        attachments: [attachment],
        createdAt: "2024-01-12T10:00:00.000+09:00",
        updatedAt: "2024-01-12T10:00:00.000+09:00",
      });

      await todoRepository.save({ todo });

      const findResult = await todoRepository.findByProjectId({ projectId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        const foundTodo = findResult.data.find((t: Todo) => t.id === todoId);
        expect(foundTodo?.attachments).toHaveLength(1);
        expect(foundTodo?.attachments[0].id).toBe(attachment.id);
      }
    });
  });

  describe("remove", () => {
    test("[正常系] 存在するTodoを削除する", async () => {
      const { todoRepository } = setUpDependencies();

      const todoId = todoRepository.todoId();
      const todo = todoDummyFrom({
        id: todoId,
        title: "削除テストTODO",
        createdAt: "2024-01-12T00:00:00.000+09:00",
        updatedAt: "2024-01-12T00:00:00.000+09:00",
      });

      await todoRepository.save({ todo });

      const removeResult = await todoRepository.remove({
        id: todoId,
      });
      expect(removeResult).toStrictEqual({
        success: true,
        data: undefined,
      });

      const findResult = await todoRepository.findById({
        id: todoId,
      });
      expect(findResult).toStrictEqual({
        success: true,
        data: undefined,
      });
    });
  });
});
