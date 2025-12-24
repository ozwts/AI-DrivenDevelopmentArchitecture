import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildTodosTableParams,
  buildAttachmentsTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { TodoRepositoryImpl } from "@/infrastructure/repository/todo-repository";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { DynamoDBUnitOfWork } from "./dynamodb-unit-of-work";

const { ddb, ddbDoc } = buildDdbClients();
const todosTableName = getRandomIdentifier();
const attachmentsTableName = getRandomIdentifier();

const setUpDependencies = () => {
  const logger = new LoggerDummy();
  const todoRepository = new TodoRepositoryImpl({
    ddbDoc,
    todosTableName,
    attachmentsTableName,
    logger,
  });

  return {
    todoRepository,
    logger,
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

describe("DynamoDBUnitOfWork", () => {
  describe("registerOperation", () => {
    test("[正常系] 操作を登録できる", () => {
      const { logger } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      const operation = {
        Put: {
          TableName: todosTableName,
          Item: { id: "test-id", title: "test" },
        },
      };

      uow.registerOperation(operation);

      expect(uow.getOperationCount()).toBe(1);
    });

    test("[正常系] 複数の操作を登録できる", () => {
      const { logger } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      for (let i = 0; i < 10; i++) {
        uow.registerOperation({
          Put: {
            TableName: todosTableName,
            Item: { id: `test-id-${i}`, title: `test-${i}` },
          },
        });
      }

      expect(uow.getOperationCount()).toBe(10);
    });

    test("[異常系] 100個を超える操作を登録しようとするとエラーが発生する", () => {
      const { logger } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      // 100個の操作を登録
      for (let i = 0; i < 100; i++) {
        uow.registerOperation({
          Put: {
            TableName: todosTableName,
            Item: { id: `test-id-${i}`, title: `test-${i}` },
          },
        });
      }

      expect(uow.getOperationCount()).toBe(100);

      // 101個目を登録しようとするとエラー
      expect(() => {
        uow.registerOperation({
          Put: {
            TableName: todosTableName,
            Item: { id: "test-id-101", title: "test-101" },
          },
        });
      }).toThrow("単一トランザクションに100個を超える操作を追加できません");
    });
  });

  describe("commit", () => {
    test("[正常系] 単一の操作をコミットできる", async () => {
      const { logger, todoRepository } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      const todoId = "commit-test-id-1";
      const todo = todoDummyFrom({
        id: todoId,
        title: "コミットテスト",
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });

      uow.registerOperation({
        Put: {
          TableName: todosTableName,
          Item: {
            todoId: todo.id,
            title: todo.title,
            description: todo.description,
            status: todo.status.status,
            priority: todo.priority,
            dueDate: todo.dueDate,
            projectId: todo.projectId,
            assigneeUserId: todo.assigneeUserId,
            createdAt: todo.createdAt,
            updatedAt: todo.updatedAt,
          },
        },
      });

      await uow.commit(ddbDoc);

      // コミット後にデータが存在することを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.isOk()).toBe(true);
      if (findResult.isOk()) {
        expect(findResult.data?.id).toBe(todoId);
        expect(findResult.data?.title).toBe("コミットテスト");
      }
    });

    test("[正常系] 操作がない場合は何もしない", async () => {
      const { logger } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      // 操作を登録せずにコミット
      await expect(uow.commit(ddbDoc)).resolves.not.toThrow();
    });
  });

  describe("rollback", () => {
    test("[正常系] ロールバックで操作がクリアされる", () => {
      const { logger } = setUpDependencies();
      const uow = new DynamoDBUnitOfWork(logger);

      uow.registerOperation({
        Put: {
          TableName: todosTableName,
          Item: { id: "rollback-test-id", title: "test" },
        },
      });

      expect(uow.getOperationCount()).toBe(1);

      uow.rollback();

      expect(uow.getOperationCount()).toBe(0);
    });
  });
});
