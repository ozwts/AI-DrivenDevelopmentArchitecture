import { test, expect, describe } from "vitest";
import {
  DeleteProjectUseCaseImpl,
  type DeleteProjectUoWContext,
} from "./delete-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { TodoRepositoryDummy } from "@/domain/model/todo/todo.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { todoDummyFrom } from "@/domain/model/todo/todo.dummy";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { UnexpectedError, ValidationError } from "@/util/error-util";
import { UnitOfWorkRunnerDummy } from "@/domain/support/unit-of-work/unit-of-work-runner.dummy";

describe("DeleteProjectUseCaseのテスト", () => {
  describe("execute", () => {
    test("プロジェクトと関連TODOを削除できること", async () => {
      const existingProject = projectDummyFrom({
        id: "project-1",
        name: "削除対象プロジェクト",
      });

      const relatedTodos = [
        todoDummyFrom({ id: "todo-1", projectId: "project-1" }),
        todoDummyFrom({ id: "todo-2", projectId: "project-1" }),
      ];

      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: existingProject,
        },
        removeReturnValue: {
          success: true,
          data: undefined,
        },
      });

      const todoRepository = new TodoRepositoryDummy({
        findByProjectIdReturnValue: {
          success: true,
          data: relatedTodos,
        },
        removeReturnValue: {
          success: true,
          data: undefined,
        },
      });

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("プロジェクトが見つからない場合はValidationErrorを返すこと", async () => {
      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: undefined,
        },
      });

      const todoRepository = new TodoRepositoryDummy();

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "non-existent-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe("プロジェクトが見つかりませんでした");
      }
    });

    test("プロジェクト取得でエラーが発生した場合はUnexpectedErrorを返すこと", async () => {
      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: false,
          error: new UnexpectedError(),
        },
      });

      const todoRepository = new TodoRepositoryDummy();

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-2",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("TODO取得でエラーが発生した場合はUnexpectedErrorを返すこと", async () => {
      const existingProject = projectDummyFrom({
        id: "project-3",
      });

      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: existingProject,
        },
      });

      const todoRepository = new TodoRepositoryDummy({
        findByProjectIdReturnValue: {
          success: false,
          error: new UnexpectedError(),
        },
      });

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-3",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("TODO削除でエラーが発生した場合はUnexpectedErrorを返すこと", async () => {
      const existingProject = projectDummyFrom({
        id: "project-4",
      });

      const relatedTodos = [
        todoDummyFrom({ id: "todo-1", projectId: "project-4" }),
      ];

      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: existingProject,
        },
      });

      const todoRepository = new TodoRepositoryDummy({
        findByProjectIdReturnValue: {
          success: true,
          data: relatedTodos,
        },
        removeReturnValue: {
          success: false,
          error: new UnexpectedError(),
        },
      });

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-4",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("プロジェクト削除でエラーが発生した場合はUnexpectedErrorを返すこと", async () => {
      const existingProject = projectDummyFrom({
        id: "project-5",
      });

      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: existingProject,
        },
        removeReturnValue: {
          success: false,
          error: new UnexpectedError(),
        },
      });

      const todoRepository = new TodoRepositoryDummy({
        findByProjectIdReturnValue: {
          success: true,
          data: [],
        },
      });

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-5",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("関連TODOが0件のプロジェクトを削除できること", async () => {
      const existingProject = projectDummyFrom({
        id: "project-6",
        name: "関連TODO無しプロジェクト",
      });

      const projectRepository = new ProjectRepositoryDummy({
        findByIdReturnValue: {
          success: true,
          data: existingProject,
        },
        removeReturnValue: {
          success: true,
          data: undefined,
        },
      });

      const todoRepository = new TodoRepositoryDummy({
        findByProjectIdReturnValue: {
          success: true,
          data: [],
        },
      });

      const uowRunner = new UnitOfWorkRunnerDummy<DeleteProjectUoWContext>({
        projectRepository,
        todoRepository,
      });

      const deleteProjectUseCase = new DeleteProjectUseCaseImpl({
        logger: new LoggerDummy(),
        uowRunner,
      });

      const result = await deleteProjectUseCase.execute({
        projectId: "project-6",
      });

      expect(result.success).toBe(true);
    });
  });
});
