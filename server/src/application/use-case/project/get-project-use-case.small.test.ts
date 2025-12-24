import { test, expect, describe } from "vitest";
import { GetProjectUseCaseImpl } from "./get-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("GetProjectUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのプロジェクトを取得できること", async () => {
      const expectedProject = projectDummyFrom({
        id: "test-project-id-123",
        name: "テストプロジェクト",
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(expectedProject),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "test-project-id-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toEqual(expectedProject);
        expect(result.data?.id).toBe("test-project-id-123");
        expect(result.data?.name).toBe("テストプロジェクト");
      }
    });

    test("プロジェクトが見つからない場合はundefinedを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "non-existent-id",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "test-project-id",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("異なるプロジェクトを取得できること", async () => {
      const project = projectDummyFrom({
        id: "project-1",
        name: "別のプロジェクト",
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "project-1",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data?.name).toBe("別のプロジェクト");
      }
    });

    test("プロジェクトの詳細情報を取得できること", async () => {
      const projectWithDetails = projectDummyFrom({
        id: "project-2",
        name: "詳細付きプロジェクト",
        description: "詳細な説明",
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(projectWithDetails),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "project-2",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data?.description).toBe("詳細な説明");
      }
    });
  });
});
