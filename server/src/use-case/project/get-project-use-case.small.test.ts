import { test, expect, describe } from "vitest";
import { GetProjectUseCaseImpl } from "./get-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project-repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { UnexpectedError } from "@/util/error-util";

describe("GetProjectUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのプロジェクトを取得できること", async () => {
      const expectedProject = projectDummyFrom({
        id: "test-project-id-123",
        name: "テストプロジェクト",
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: expectedProject,
          },
        }),
      });

      const result = await getProjectUseCase.execute({
        projectId: "test-project-id-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(expectedProject);
        expect(result.data?.id).toBe("test-project-id-123");
        expect(result.data?.name).toBe("テストプロジェクト");
      }
    });

    test("プロジェクトが見つからない場合はundefinedを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
        }),
      });

      const result = await getProjectUseCase.execute({
        projectId: "non-existent-id",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
      });

      const result = await getProjectUseCase.execute({
        projectId: "test-project-id",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
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
          findByIdReturnValue: {
            success: true,
            data: project,
          },
        }),
      });

      const result = await getProjectUseCase.execute({
        projectId: "project-1",
      });

      expect(result.success).toBe(true);
      if (result.success) {
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
          findByIdReturnValue: {
            success: true,
            data: projectWithDetails,
          },
        }),
      });

      const result = await getProjectUseCase.execute({
        projectId: "project-2",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.description).toBe("詳細な説明");
      }
    });
  });
});
