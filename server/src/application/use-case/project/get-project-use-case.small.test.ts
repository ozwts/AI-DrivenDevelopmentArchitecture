import { test, expect, describe } from "vitest";
import { GetProjectUseCaseImpl } from "./get-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { UnexpectedError, NotFoundError, ForbiddenError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("GetProjectUseCaseのテスト", () => {
  describe("execute", () => {
    test("指定したIDのプロジェクトを取得できること", async () => {
      const projectId = "test-project-id-123";
      const currentUserId = "current-user";
      const expectedProject = projectDummyFrom({
        id: projectId,
        name: "テストプロジェクト",
      });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(expectedProject),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project).toEqual(expectedProject);
        expect(result.data.project.id).toBe("test-project-id-123");
        expect(result.data.project.name).toBe("テストプロジェクト");
        expect(result.data.myRole.isOwner()).toBe(true);
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "non-existent-id",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("メンバーでない場合はForbiddenErrorを返すこと", async () => {
      const projectId = "project-1";
      const project = projectDummyFrom({ id: projectId });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId,
        currentUserId: "non-member-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    });

    test("リポジトリからエラーが返された場合はそのエラーを返すこと", async () => {
      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId: "test-project-id",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("異なるプロジェクトを取得できること", async () => {
      const projectId = "project-1";
      const currentUserId = "current-user";
      const project = projectDummyFrom({
        id: projectId,
        name: "別のプロジェクト",
      });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.member(),
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.name).toBe("別のプロジェクト");
        expect(result.data.myRole.isMember()).toBe(true);
      }
    });

    test("プロジェクトの詳細情報を取得できること", async () => {
      const projectId = "project-2";
      const currentUserId = "current-user";
      const projectWithDetails = projectDummyFrom({
        id: projectId,
        name: "詳細付きプロジェクト",
        description: "詳細な説明",
      });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const getProjectUseCase = new GetProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(projectWithDetails),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getProjectUseCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.description).toBe("詳細な説明");
      }
    });
  });
});
