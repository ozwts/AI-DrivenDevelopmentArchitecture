import { test, expect, describe, beforeEach, afterAll } from "vitest";
import { DeleteTableCommand } from "@aws-sdk/client-dynamodb";
import {
  buildDdbClients,
  buildTodosTableParams,
  buildAttachmentsTableParams,
  buildProjectsTableParams,
  buildUsersTableParams,
  getRandomIdentifier,
  refreshTable,
} from "@/util/testing-util/dynamodb";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { TodoRepositoryImpl } from "@/infrastructure/repository/todo-repository";
import { ProjectRepositoryImpl } from "@/infrastructure/repository/project-repository";
import { UserRepositoryImpl } from "@/infrastructure/repository/user-repository";
import type { TodoRepository } from "@/domain/model/todo/todo-repository";
import type { ProjectRepository } from "@/domain/model/project/project-repository";
import type { UserRepository } from "@/domain/model/user/user-repository";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { ProjectColor } from "@/domain/model/project/project-color";
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { userDummyFrom } from "@/domain/model/user/user.dummy";
import { DynamoDBUnitOfWorkRunner } from "./dynamodb-unit-of-work-runner";

const { ddb, ddbDoc } = buildDdbClients();
const todosTableName = getRandomIdentifier();
const attachmentsTableName = getRandomIdentifier();
const projectsTableName = getRandomIdentifier();
const usersTableName = getRandomIdentifier();

type UoWContext = {
  todoRepository: TodoRepository;
  projectRepository: ProjectRepository;
  userRepository: UserRepository;
};

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
  const userRepository = new UserRepositoryImpl({
    ddbDoc,
    usersTableName,
    logger,
  });

  const runner = new DynamoDBUnitOfWorkRunner<UoWContext>(
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
      userRepository: new UserRepositoryImpl({
        ddbDoc,
        usersTableName,
        logger,
        uow: uowInstance,
      }),
    }),
  );

  return {
    todoRepository,
    projectRepository,
    userRepository,
    runner,
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
  await refreshTable(
    buildUsersTableParams({
      ddb,
      usersTableName,
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
  await ddb.send(
    new DeleteTableCommand({
      TableName: usersTableName,
    }),
  );
});

describe("DynamoDBUnitOfWorkRunner", () => {
  describe("run", () => {
    test("[正常系] 単一のリポジトリ操作がトランザクション内で実行される", async () => {
      const { runner, todoRepository } = setUpDependencies();

      const todoId = "runner-test-id-1";

      const result = await runner.run(async (uow) => {
        const todo = todoDummyFrom({
          id: todoId,
          title: "ランナーテスト",
          createdAt: "2024-01-05T00:00:00.000+09:00",
          updatedAt: "2024-01-05T00:00:00.000+09:00",
        });

        await uow.todoRepository.save({ todo });
        return todo;
      });

      expect(result.id).toBe(todoId);

      // トランザクション外のリポジトリで確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.id).toBe(todoId);
        expect(findResult.data?.title).toBe("ランナーテスト");
      }
    });

    test("[正常系] 複数のリポジトリ操作がアトミックに実行される", async () => {
      const { runner, todoRepository } = setUpDependencies();

      const todoId1 = "runner-test-id-2";
      const todoId2 = "runner-test-id-3";

      await runner.run(async (uow) => {
        const todo1 = todoDummyFrom({
          id: todoId1,
          title: "トランザクションTODO1",
          createdAt: "2024-01-06T00:00:00.000+09:00",
          updatedAt: "2024-01-06T00:00:00.000+09:00",
        });

        const todo2 = todoDummyFrom({
          id: todoId2,
          title: "トランザクションTODO2",
          createdAt: "2024-01-06T01:00:00.000+09:00",
          updatedAt: "2024-01-06T01:00:00.000+09:00",
        });

        await uow.todoRepository.save({ todo: todo1 });
        await uow.todoRepository.save({ todo: todo2 });

        return { todo1, todo2 };
      });

      // 両方のTODOが保存されていることを確認
      const findResult1 = await todoRepository.findById({ id: todoId1 });
      const findResult2 = await todoRepository.findById({ id: todoId2 });

      expect(findResult1.success).toBe(true);
      expect(findResult2.success).toBe(true);
      if (findResult1.success) {
        expect(findResult1.data?.title).toBe("トランザクションTODO1");
      }
      if (findResult2.success) {
        expect(findResult2.data?.title).toBe("トランザクションTODO2");
      }
    });

    test("[正常系] 複数の異なるTODOの作成と更新が同一トランザクション内で実行される", async () => {
      const { runner, todoRepository } = setUpDependencies();

      const todoId1 = "runner-test-id-4";
      const todoId2 = "runner-test-id-4b";

      // 事前にtodoId2を作成しておく
      const existingTodo = todoDummyFrom({
        id: todoId2,
        title: "既存TODO",
        status: "TODO",
        createdAt: "2024-01-07T00:00:00.000+09:00",
        updatedAt: "2024-01-07T00:00:00.000+09:00",
      });
      await todoRepository.save({ todo: existingTodo });

      await runner.run(async (uow) => {
        // 新しいTODOを作成
        const newTodo = todoDummyFrom({
          id: todoId1,
          title: "新規TODO",
          status: "TODO",
          createdAt: "2024-01-07T10:00:00.000+09:00",
          updatedAt: "2024-01-07T10:00:00.000+09:00",
        });

        await uow.todoRepository.save({ todo: newTodo });

        // 既存のTODOを更新
        const updatedTodo = existingTodo.changeStatus(
          "IN_PROGRESS",
          "2024-01-07T12:00:00.000+09:00",
        );

        await uow.todoRepository.save({ todo: updatedTodo });

        return { newTodo, updatedTodo };
      });

      // 両方のTODOが正しく保存されていることを確認
      const findResult1 = await todoRepository.findById({ id: todoId1 });
      const findResult2 = await todoRepository.findById({ id: todoId2 });

      expect(findResult1.success).toBe(true);
      expect(findResult2.success).toBe(true);
      if (findResult1.success) {
        expect(findResult1.data?.title).toBe("新規TODO");
      }
      if (findResult2.success) {
        expect(findResult2.data?.status).toBe("IN_PROGRESS");
        expect(findResult2.data?.updatedAt).toBe(
          "2024-01-07T12:00:00.000+09:00",
        );
      }
    });

    test("[異常系] トランザクション内でエラーが発生した場合、すべてロールバックされる", async () => {
      const { runner, todoRepository } = setUpDependencies();

      const todoId1 = "runner-test-id-5";

      await expect(
        runner.run(async (uow) => {
          const todo1 = todoDummyFrom({
            id: todoId1,
            title: "ロールバックテストTODO1",
            createdAt: "2024-01-08T00:00:00.000+09:00",
            updatedAt: "2024-01-08T00:00:00.000+09:00",
          });

          await uow.todoRepository.save({ todo: todo1 });

          // 意図的にエラーを発生させる
          throw new Error("トランザクションエラーテスト");
        }),
      ).rejects.toThrow("トランザクションエラーテスト");

      // ロールバックされているため、todo1は保存されていないはず
      const findResult1 = await todoRepository.findById({ id: todoId1 });
      expect(findResult1.success).toBe(true);
      expect(findResult1.data).toBeUndefined();
    });

    test("[正常系] TODOの削除もトランザクション内で実行できる", async () => {
      const { runner, todoRepository } = setUpDependencies();

      const todoId = "runner-test-id-7";

      // まず通常の方法でTODOを作成
      const initialTodo = todoDummyFrom({
        id: todoId,
        title: "削除テストTODO",
        createdAt: "2024-01-09T00:00:00.000+09:00",
        updatedAt: "2024-01-09T00:00:00.000+09:00",
      });
      await todoRepository.save({ todo: initialTodo });

      // トランザクション内で削除
      await runner.run(async (uow) => {
        await uow.todoRepository.remove({ id: todoId });
      });

      // 削除されていることを確認
      const findResult = await todoRepository.findById({ id: todoId });
      expect(findResult.success).toBe(true);
      expect(findResult.data).toBeUndefined();
    });

    test("[正常系] ProjectRepositoryを使用した単一の操作がトランザクション内で実行される", async () => {
      const { runner, projectRepository } = setUpDependencies();

      const projectId = "runner-project-test-id-1";

      const colorResult = ProjectColor.fromString("#E91E63");
      if (!colorResult.success) throw colorResult.error;

      const result = await runner.run(async (uow) => {
        const project = projectDummyFrom({
          id: projectId,
          name: "UoWテストプロジェクト",
          color: colorResult.data,
          createdAt: "2024-01-10T00:00:00.000+09:00",
          updatedAt: "2024-01-10T00:00:00.000+09:00",
        });

        await uow.projectRepository.save({ project });
        return project;
      });

      expect(result.id).toBe(projectId);

      // トランザクション外のリポジトリで確認
      const findResult = await projectRepository.findById({ id: projectId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.id).toBe(projectId);
        expect(findResult.data?.name).toBe("UoWテストプロジェクト");
      }
    });

    test("[正常系] Project作成とTodo作成を同一トランザクション内で実行する", async () => {
      const { runner, todoRepository, projectRepository } = setUpDependencies();

      const projectId = "runner-project-test-id-2";
      const todoId = "runner-todo-test-id-8";

      const colorResult = ProjectColor.fromString("#673AB7");
      if (!colorResult.success) throw colorResult.error;

      await runner.run(async (uow) => {
        // プロジェクトを作成
        const project = projectDummyFrom({
          id: projectId,
          name: "複合トランザクションプロジェクト",
          color: colorResult.data,
          createdAt: "2024-01-11T00:00:00.000+09:00",
          updatedAt: "2024-01-11T00:00:00.000+09:00",
        });

        await uow.projectRepository.save({ project });

        // そのプロジェクトに関連するTODOを作成
        const todo = todoDummyFrom({
          id: todoId,
          title: "プロジェクトに紐づくTODO",
          projectId,
          createdAt: "2024-01-11T00:30:00.000+09:00",
          updatedAt: "2024-01-11T00:30:00.000+09:00",
        });

        await uow.todoRepository.save({ todo });

        return { project, todo };
      });

      // 両方が保存されていることを確認
      const projectFindResult = await projectRepository.findById({
        id: projectId,
      });
      const todoFindResult = await todoRepository.findById({ id: todoId });

      expect(projectFindResult.success).toBe(true);
      expect(todoFindResult.success).toBe(true);
      if (projectFindResult.success) {
        expect(projectFindResult.data?.name).toBe(
          "複合トランザクションプロジェクト",
        );
      }
      if (todoFindResult.success) {
        expect(todoFindResult.data?.title).toBe("プロジェクトに紐づくTODO");
        expect(todoFindResult.data?.projectId).toBe(projectId);
      }
    });

    test("[正常系] Project削除と関連するTodo削除を同一トランザクション内で実行する", async () => {
      const { runner, todoRepository, projectRepository } = setUpDependencies();

      const projectId = "runner-project-test-id-3";
      const todoId1 = "runner-todo-test-id-9";
      const todoId2 = "runner-todo-test-id-10";

      // 事前にプロジェクトとTODOを作成
      const colorResult = ProjectColor.fromString("#00BCD4");
      if (!colorResult.success) throw colorResult.error;

      const project = projectDummyFrom({
        id: projectId,
        name: "削除テストプロジェクト",
        color: colorResult.data,
        createdAt: "2024-01-12T00:00:00.000+09:00",
        updatedAt: "2024-01-12T00:00:00.000+09:00",
      });
      await projectRepository.save({ project });

      const todo1 = todoDummyFrom({
        id: todoId1,
        title: "削除対象TODO1",
        projectId,
        createdAt: "2024-01-12T01:00:00.000+09:00",
        updatedAt: "2024-01-12T01:00:00.000+09:00",
      });
      const todo2 = todoDummyFrom({
        id: todoId2,
        title: "削除対象TODO2",
        projectId,
        createdAt: "2024-01-12T02:00:00.000+09:00",
        updatedAt: "2024-01-12T02:00:00.000+09:00",
      });
      await todoRepository.save({ todo: todo1 });
      await todoRepository.save({ todo: todo2 });

      // トランザクション内でプロジェクトとTODOを削除
      await runner.run(async (uow) => {
        await uow.todoRepository.remove({ id: todoId1 });
        await uow.todoRepository.remove({ id: todoId2 });
        await uow.projectRepository.remove({ id: projectId });
      });

      // すべて削除されていることを確認
      const projectFindResult = await projectRepository.findById({
        id: projectId,
      });
      const todo1FindResult = await todoRepository.findById({ id: todoId1 });
      const todo2FindResult = await todoRepository.findById({ id: todoId2 });

      expect(projectFindResult.success).toBe(true);
      expect(projectFindResult.data).toBeUndefined();
      expect(todo1FindResult.success).toBe(true);
      expect(todo1FindResult.data).toBeUndefined();
      expect(todo2FindResult.success).toBe(true);
      expect(todo2FindResult.data).toBeUndefined();
    });

    test("[異常系] ProjectとTodoの複合トランザクションでエラーが発生した場合、すべてロールバックされる", async () => {
      const { runner, todoRepository, projectRepository } = setUpDependencies();

      const projectId = "runner-project-test-id-4";
      const todoId = "runner-todo-test-id-11";

      const colorResult = ProjectColor.fromString("#4CAF50");
      if (!colorResult.success) throw colorResult.error;

      await expect(
        runner.run(async (uow) => {
          const project = projectDummyFrom({
            id: projectId,
            name: "ロールバックテストプロジェクト",
            color: colorResult.data,
            createdAt: "2024-01-13T00:00:00.000+09:00",
            updatedAt: "2024-01-13T00:00:00.000+09:00",
          });

          await uow.projectRepository.save({ project });

          const todo = todoDummyFrom({
            id: todoId,
            title: "ロールバックテストTODO",
            projectId,
            createdAt: "2024-01-13T01:00:00.000+09:00",
            updatedAt: "2024-01-13T01:00:00.000+09:00",
          });

          await uow.todoRepository.save({ todo });

          // 意図的にエラーを発生させる
          throw new Error("複合トランザクションエラーテスト");
        }),
      ).rejects.toThrow("複合トランザクションエラーテスト");

      // ロールバックされているため、どちらも保存されていないはず
      const projectFindResult = await projectRepository.findById({
        id: projectId,
      });
      const todoFindResult = await todoRepository.findById({ id: todoId });

      expect(projectFindResult.success).toBe(true);
      expect(projectFindResult.data).toBeUndefined();
      expect(todoFindResult.success).toBe(true);
      expect(todoFindResult.data).toBeUndefined();
    });

    test("[正常系] UserRepositoryを使用した単一の操作がトランザクション内で実行される", async () => {
      const { runner, userRepository } = setUpDependencies();

      const userId = "runner-user-test-id-1";

      const result = await runner.run(async (uow) => {
        const user = userDummyFrom({
          id: userId,
          sub: "cognito-sub-test-1",
          name: "UoWテストユーザー",
          email: "test@example.com",
          emailVerified: true,
          createdAt: "2024-01-14T00:00:00.000+09:00",
          updatedAt: "2024-01-14T00:00:00.000+09:00",
        });

        await uow.userRepository.save({ user });
        return user;
      });

      expect(result.id).toBe(userId);

      // トランザクション外のリポジトリで確認
      const findResult = await userRepository.findById({ id: userId });
      expect(findResult.success).toBe(true);
      if (findResult.success) {
        expect(findResult.data?.id).toBe(userId);
        expect(findResult.data?.name).toBe("UoWテストユーザー");
        expect(findResult.data?.email).toBe("test@example.com");
      }
    });

    test("[正常系] User作成とTodo作成を同一トランザクション内で実行する", async () => {
      const { runner, todoRepository, userRepository } = setUpDependencies();

      const userId = "runner-user-test-id-2";
      const todoId = "runner-todo-test-id-12";

      const result = await runner.run(async (uow) => {
        const user = userDummyFrom({
          id: userId,
          sub: "cognito-sub-test-2",
          name: "複合トランザクションユーザー",
          email: "user@example.com",
          emailVerified: true,
          createdAt: "2024-01-15T00:00:00.000+09:00",
          updatedAt: "2024-01-15T00:00:00.000+09:00",
        });

        await uow.userRepository.save({ user });

        const todo = todoDummyFrom({
          id: todoId,
          title: "ユーザーに紐づくTODO",
          createdAt: "2024-01-15T01:00:00.000+09:00",
          updatedAt: "2024-01-15T01:00:00.000+09:00",
        });

        await uow.todoRepository.save({ todo });

        return { user, todo };
      });

      // 両方が保存されていることを確認
      const userFindResult = await userRepository.findById({
        id: userId,
      });
      const todoFindResult = await todoRepository.findById({ id: todoId });

      expect(userFindResult.success).toBe(true);
      expect(todoFindResult.success).toBe(true);
      if (userFindResult.success) {
        expect(userFindResult.data?.name).toBe("複合トランザクションユーザー");
      }
      if (todoFindResult.success) {
        expect(todoFindResult.data?.title).toBe("ユーザーに紐づくTODO");
      }
    });
  });
});
