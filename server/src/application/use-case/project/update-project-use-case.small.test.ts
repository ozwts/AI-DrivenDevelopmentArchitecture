import { test, expect, describe } from "vitest";
import { UpdateProjectUseCaseImpl } from "./update-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { ProjectColor } from "@/domain/model/project/project-color";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";

describe("UpdateProjectUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const updatedAt = new Date("2024-01-02T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(updatedAt);

  describe("execute", () => {
    test("プロジェクト名を更新できること", async () => {
      const colorResult = ProjectColor.fromString("#FF5733");
      if (!colorResult.success) throw colorResult.error;

      const existingProject = projectDummyFrom({
        id: "project-1",
        name: "古い名前",
        color: colorResult.data,
        createdAt: now.toISOString(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingProject,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-1",
        name: "新しい名前",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("新しい名前");
      }
    });

    test("プロジェクトカラーを更新できること", async () => {
      const oldColorResult = ProjectColor.fromString("#FF5733");
      if (!oldColorResult.success) throw oldColorResult.error;

      const existingProject = projectDummyFrom({
        id: "project-2",
        color: oldColorResult.data,
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingProject,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-2",
        color: "#3498DB",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color.value).toBe("#3498DB");
      }
    });

    test("複数のフィールドを同時に更新できること", async () => {
      const colorResult = ProjectColor.fromString("#FF5733");
      if (!colorResult.success) throw colorResult.error;

      const existingProject = projectDummyFrom({
        id: "project-3",
        name: "古い名前",
        description: "古い説明",
        color: colorResult.data,
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingProject,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-3",
        name: "新しい名前",
        description: "新しい説明",
        color: "#E74C3C",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("新しい名前");
        expect(result.data.description).toBe("新しい説明");
        expect(result.data.color.value).toBe("#E74C3C");
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "non-existent-id",
        name: "新しい名前",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("プロジェクトが見つかりませんでした");
      }
    });

    test("findByIdでエラーが発生した場合はそのエラーを返すこと", async () => {
      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-4",
        name: "新しい名前",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const existingProject = projectDummyFrom({
        id: "project-6",
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingProject,
          },
          saveReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-6",
        name: "新しい名前",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("更新後もcreatedAtは変わらないこと", async () => {
      const createdAt = "2024-01-01T00:00:00.000Z";
      const existingProject = projectDummyFrom({
        id: "project-7",
        name: "古い名前",
        createdAt,
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: {
            success: true,
            data: existingProject,
          },
          saveReturnValue: {
            success: true,
            data: undefined,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-7",
        name: "新しい名前",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.createdAt).toBe(createdAt);
        expect(result.data.updatedAt).not.toBe(createdAt);
      }
    });
  });
});
