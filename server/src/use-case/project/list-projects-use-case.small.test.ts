import { test, expect, describe } from "vitest";
import { ListProjectsUseCaseImpl } from "./list-projects-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project-repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.dummy";
import { UnexpectedError } from "@/util/error-util";

describe("ListProjectsUseCaseのテスト", () => {
  describe("execute", () => {
    test("全てのプロジェクトを取得できること", async () => {
      const projects = [
        projectDummyFrom({ id: "project-1", name: "プロジェクト1" }),
        projectDummyFrom({ id: "project-2", name: "プロジェクト2" }),
        projectDummyFrom({ id: "project-3", name: "プロジェクト3" }),
      ];

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findAllReturnValue: {
            success: true,
            data: projects,
          },
        }),
      });

      const result = await listProjectsUseCase.execute({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data).toEqual(projects);
      }
    });

    test("プロジェクトが0件の場合は空配列を返すこと", async () => {
      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findAllReturnValue: {
            success: true,
            data: [],
          },
        }),
      });

      const result = await listProjectsUseCase.execute({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findAllReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
      });

      const result = await listProjectsUseCase.execute({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数のプロジェクトの詳細情報を取得できること", async () => {
      const projectsWithDetails = [
        projectDummyFrom({
          id: "project-1",
          name: "プロジェクトA",
          description: "説明A",
        }),
        projectDummyFrom({
          id: "project-2",
          name: "プロジェクトB",
          description: "説明B",
        }),
      ];

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findAllReturnValue: {
            success: true,
            data: projectsWithDetails,
          },
        }),
      });

      const result = await listProjectsUseCase.execute({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].description).toBe("説明A");
        expect(result.data[1].description).toBe("説明B");
      }
    });

    test("大量のプロジェクトを取得できること", async () => {
      const manyProjects = Array.from({ length: 100 }, (_, i) =>
        projectDummyFrom({
          id: `project-${i}`,
          name: `プロジェクト${i}`,
        }),
      );

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findAllReturnValue: {
            success: true,
            data: manyProjects,
          },
        }),
      });

      const result = await listProjectsUseCase.execute({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(100);
      }
    });
  });
});
