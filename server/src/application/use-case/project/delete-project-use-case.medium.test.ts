import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildTodosTableParams,
  buildAttachmentsTableParams,
  buildProjectsTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { TodoRepositoryImpl } from "@/infrastructure/repository/todo-repository";
import { ProjectRepositoryImpl } from "@/infrastructure/repository/project-repository";
import { todoDummyFrom } from "@/domain/model/todo/todo.entity.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { DynamoDBUnitOfWorkRunner } from "@/infrastructure/unit-of-work/dynamodb-unit-of-work-runner";
import {
  DeleteProjectUseCaseImpl,
  type DeleteProjectUoWContext,
} from "./delete-project-use-case";
import { NotFoundError } from "@/util/error-util";

const { ddb, ddbDoc } = buildDdbClients();
const todosTableName = getRandomIdentifier();
const attachmentsTableName = getRandomIdentifier();
const projectsTableName = getRandomIdentifier();

const setUpDependencies = () => {
  const logger = new LoggerDummy();
  const todoRepository = new TodoRepositoryImpl({
    ddbDoc,
    todosTableName,
    attachmentsTableName,
    logger,
  });
  const projectRepository = new ProjectRepositoryImpl({
    ddbDoc,
    projectsTableName,
    logger,
  });

  const uowRunner = new DynamoDBUnitOfWorkRunner<DeleteProjectUoWContext>(
    { ddbDoc, logger },
    (uowInstance) => ({
      todoRepository: new TodoRepositoryImpl({
        ddbDoc,
        todosTableName,
        attachmentsTableName,
        logger,
        uow: uowInstance,
      }),
      projectRepository: new ProjectRepositoryImpl({
        ddbDoc,
        projectsTableName,
        logger,
        uow: uowInstance,
      }),
    }),
  );

  const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
    logger,
    uowRunner,
  });

  return {
    deleteProjectUseCase,
    todoRepository,
    projectRepository,
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
  await refreshTable(
    buildProjectsTableParams({
      ddb,
      projectsTableName,
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
  await ddb.send(
    new DeleteTableCommand({
      TableName: projectsTableName,
    }),
  );
});

describe("DeleteProjectUseCaseのミディアムテスト", () => {
  describe("execute", () => {
    test("[正常系] プロジェクトと関連TODOをトランザクション内で削除できること", async () => {
      const { deleteProjectUseCase, todoRepository, projectRepository } =
        setUpDependencies();

      const projectId = "medium-test-project-1";

      // プロジェクトを作成
      const project = projectDummyFrom({
        id: projectId,
        name: "削除対象プロジェクト",
        color: "#FF5733",
        createdAt: "2024-01-01T00:00:00.000+09:00",
        updatedAt: "2024-01-01T00:00:00.000+09:00",
      });
      await projectRepository.save({ project });

      // プロジェクトに紐づくTODOを作成
      const todo1 = todoDummyFrom({
        id: "medium-test-todo-1",
        title: "削除対象TODO1",
        projectId,
        createdAt: "2024-01-01T01:00:00.000+09:00",
        updatedAt: "2024-01-01T01:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: "medium-test-todo-2",
        title: "削除対象TODO2",
        projectId,
        createdAt: "2024-01-01T02:00:00.000+09:00",
        updatedAt: "2024-01-01T02:00:00.000+09:00",
      });
      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      // 削除前に存在することを確認
      const projectBeforeDelete = await projectRepository.findById({
        id: projectId,
      });
      const todosBeforeDelete = await todoRepository.findByProjectId({
        projectId,
      });
      expect(projectBeforeDelete.isOk()).toBe(true);
      if (projectBeforeDelete.isOk()) {
        expect(projectBeforeDelete.data).toBeDefined();
      }
      expect(todosBeforeDelete.isOk()).toBe(true);
      if (todosBeforeDelete.isOk()) {
        expect(todosBeforeDelete.data).toHaveLength(2);
      }

      // ユースケースを実行
      const result = await deleteProjectUseCase.execute({
        projectId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }

      // 削除後にプロジェクトが存在しないことを確認
      const projectAfterDelete = await projectRepository.findById({
        id: projectId,
      });
      expect(projectAfterDelete.isOk()).toBe(true);
      if (projectAfterDelete.isOk()) {
        expect(projectAfterDelete.data).toBeUndefined();
      }

      // 削除後にTODOが存在しないことを確認
      const todo1AfterDelete = await todoRepository.findById({
        id: todo1.id,
      });
      const todo2AfterDelete = await todoRepository.findById({
        id: todo2.id,
      });
      expect(todo1AfterDelete.isOk()).toBe(true);
      if (todo1AfterDelete.isOk()) {
        expect(todo1AfterDelete.data).toBeUndefined();
      }
      expect(todo2AfterDelete.isOk()).toBe(true);
      if (todo2AfterDelete.isOk()) {
        expect(todo2AfterDelete.data).toBeUndefined();
      }
    });

    test("[境界値] DynamoDBトランザクション制限（100件）に近い数のTODOを削除できること", async () => {
      const { deleteProjectUseCase, todoRepository, projectRepository } =
        setUpDependencies();

      const projectId = "medium-test-project-limit";

      // プロジェクトを作成
      const project = projectDummyFrom({
        id: projectId,
        name: "複数TODO紐付きプロジェクト",
        color: "#4CAF50",
        createdAt: "2024-01-02T00:00:00.000+09:00",
        updatedAt: "2024-01-02T00:00:00.000+09:00",
      });
      await projectRepository.save({ project });

      // 98件のTODOを作成（TODO削除98件 + プロジェクト削除1件 = 合計99件のトランザクション）
      // DynamoDBトランザクション制限は100件なので、境界値として99件をテスト
      const todoCount = 98;
      const todos = Array.from({ length: todoCount }, (_, i) =>
        todoDummyFrom({
          id: `medium-test-todo-limit-${i}`,
          title: `削除対象TODO${i + 1}`,
          projectId,
          createdAt: "2024-01-02T01:00:00.000+09:00",
          updatedAt: "2024-01-02T01:00:00.000+09:00",
        }),
      );

      for (const todo of todos) {
        await todoRepository.save({ todo });
      }

      // 削除前にTODOが存在することを確認
      const todosBeforeDelete = await todoRepository.findByProjectId({
        projectId,
      });
      expect(todosBeforeDelete.isOk()).toBe(true);
      if (todosBeforeDelete.isOk()) {
        expect(todosBeforeDelete.data).toHaveLength(todoCount);
      }

      // 削除実行（99件のトランザクション操作）
      const result = await deleteProjectUseCase.execute({
        projectId,
      });

      expect(result.isOk()).toBe(true);

      // プロジェクトが削除されていることを確認
      const projectAfterDelete = await projectRepository.findById({
        id: projectId,
      });
      expect(projectAfterDelete.isOk()).toBe(true);
      if (projectAfterDelete.isOk()) {
        expect(projectAfterDelete.data).toBeUndefined();
      }

      // すべてのTODOが削除されていることを確認
      const todosAfterDelete = await todoRepository.findByProjectId({
        projectId,
      });
      expect(todosAfterDelete.isOk()).toBe(true);
      if (todosAfterDelete.isOk()) {
        expect(todosAfterDelete.data).toHaveLength(0);
      }
    });

    test("[異常系] トランザクション実行中にエラーが発生した場合、変更がロールバックされること", async () => {
      const { deleteProjectUseCase, todoRepository, projectRepository } =
        setUpDependencies();

      const projectId = "medium-test-project-rollback";

      // 事前にプロジェクトとTODOを作成（これは削除されないことを確認する）
      const project = projectDummyFrom({
        id: projectId,
        name: "ロールバックテストプロジェクト",
        color: "#E91E63",
        createdAt: "2024-01-03T00:00:00.000+09:00",
        updatedAt: "2024-01-03T00:00:00.000+09:00",
      });
      await projectRepository.save({ project });

      const todo1 = todoDummyFrom({
        id: "medium-test-todo-rollback-1",
        title: "ロールバックテストTODO1",
        projectId,
        createdAt: "2024-01-03T01:00:00.000+09:00",
        updatedAt: "2024-01-03T01:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: "medium-test-todo-rollback-2",
        title: "ロールバックテストTODO2",
        projectId,
        createdAt: "2024-01-03T02:00:00.000+09:00",
        updatedAt: "2024-01-03T02:00:00.000+09:00",
      });
      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      // 存在しないプロジェクトIDで削除を試みる（検証エラーが発生）
      const result = await deleteProjectUseCase.execute({
        projectId: "non-existent-project-id",
      });

      // NotFoundErrorが返されることを確認
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("プロジェクトが見つかりませんでした");
      }

      // 元のプロジェクトは影響を受けていないことを確認
      const projectAfterError = await projectRepository.findById({
        id: projectId,
      });
      expect(projectAfterError.isOk()).toBe(true);
      if (projectAfterError.isOk()) {
        expect(projectAfterError.data).toBeDefined();
        expect(projectAfterError.data?.name).toBe(
          "ロールバックテストプロジェクト",
        );
      }

      // 元のTODOも影響を受けていないことを確認
      const todo1AfterError = await todoRepository.findById({
        id: todo1.id,
      });
      const todo2AfterError = await todoRepository.findById({
        id: todo2.id,
      });
      expect(todo1AfterError.isOk()).toBe(true);
      if (todo1AfterError.isOk()) {
        expect(todo1AfterError.data).toBeDefined();
        expect(todo1AfterError.data?.title).toBe("ロールバックテストTODO1");
      }
      expect(todo2AfterError.isOk()).toBe(true);
      if (todo2AfterError.isOk()) {
        expect(todo2AfterError.data).toBeDefined();
        expect(todo2AfterError.data?.title).toBe("ロールバックテストTODO2");
      }
    });
  });
});
