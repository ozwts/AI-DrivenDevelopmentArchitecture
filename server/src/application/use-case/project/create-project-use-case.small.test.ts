import { test, expect, describe } from "vitest";
import { CreateProjectUseCaseImpl } from "./create-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError } from "@/util/error-util";
import { Project } from "@/domain/model/project/project.entity";
import { dateToIsoString } from "@/util/date-util";
import { Result } from "@/util/result";

describe("CreateProjectUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(now);
  const nowString = dateToIsoString(now);

  describe("execute", () => {
    test("最小限の情報でプロジェクトを作成できること", async () => {
      const projectId = "test-project-id-123";
      const createProjectUseCase = new CreateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          projectIdReturnValue: projectId,
          saveReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await createProjectUseCase.execute({
        name: "テストプロジェクト",
        color: "#FF5733",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe(projectId);
        expect(result.data.name).toBe("テストプロジェクト");
        expect(result.data.color).toBe("#FF5733");
        expect(result.data.description).toBeUndefined();
        expect(result.data.createdAt).toBe(nowString);
        expect(result.data.updatedAt).toBe(nowString);
      }
    });

    test("全ての情報を指定してプロジェクトを作成できること", async () => {
      const projectId = "test-project-id-456";
      const createProjectUseCase = new CreateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          projectIdReturnValue: projectId,
          saveReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await createProjectUseCase.execute({
        name: "完全なプロジェクト",
        description: "詳細な説明",
        color: "#3498DB",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe(projectId);
        expect(result.data.name).toBe("完全なプロジェクト");
        expect(result.data.description).toBe("詳細な説明");
        expect(result.data.color).toBe("#3498DB");
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const createProjectUseCase = new CreateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          saveReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await createProjectUseCase.execute({
        name: "テストプロジェクト",
        color: "#FF5733",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("様々な有効なカラーコードでプロジェクトを作成できること", async () => {
      const validColors = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFFFF",
        "#000000",
      ];

      for (const color of validColors) {
        const createProjectUseCase = new CreateProjectUseCaseImpl({
          projectRepository: new ProjectRepositoryDummy({
            saveReturnValue: Result.ok(undefined),
          }),
          logger: new LoggerDummy(),
          fetchNow,
        });

        const result = await createProjectUseCase.execute({
          name: `プロジェクト_${color}`,
          color,
        });

        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.data.color).toBe(color);
        }
      }
    });

    test("生成されたProjectインスタンスが正しいプロパティを持つこと", async () => {
      const projectId = "test-project-id-789";
      const createProjectUseCase = new CreateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          projectIdReturnValue: projectId,
          saveReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await createProjectUseCase.execute({
        name: "検証用プロジェクト",
        color: "#E74C3C",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeInstanceOf(Project);
        expect(typeof result.data.id).toBe("string");
        expect(typeof result.data.name).toBe("string");
        expect(typeof result.data.color).toBe("string");
        expect(typeof result.data.createdAt).toBe("string");
        expect(typeof result.data.updatedAt).toBe("string");
      }
    });
  });
});
