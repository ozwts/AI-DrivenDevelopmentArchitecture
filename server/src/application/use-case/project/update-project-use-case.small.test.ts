import { test, expect, describe } from "vitest";
import { UpdateProjectUseCaseImpl } from "./update-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError, NotFoundError, ForbiddenError } from "@/util/error-util";
import { Result } from "@/util/result";

describe("UpdateProjectUseCaseのテスト", () => {
  const now = new Date("2024-01-01T00:00:00+09:00");
  const updatedAt = new Date("2024-01-02T00:00:00+09:00");
  const fetchNow = buildFetchNowDummy(updatedAt);

  describe("execute", () => {
    test("オーナーはプロジェクト名を更新できること", async () => {
      const projectId = "project-1";
      const currentUserId = "owner-user";
      const existingProject = projectDummyFrom({
        id: projectId,
        name: "古い名前",
        color: "#FF5733",
        createdAt: now.toISOString(),
      });
      const ownerMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
          saveReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(ownerMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.name).toBe("新しい名前");
        expect(result.data.myRole.isOwner()).toBe(true);
      }
    });

    test("オーナーはプロジェクトカラーを更新できること", async () => {
      const projectId = "project-2";
      const currentUserId = "owner-user";
      const existingProject = projectDummyFrom({
        id: projectId,
        color: "#FF5733",
      });
      const ownerMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
          saveReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(ownerMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        color: "#3498DB",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.color).toBe("#3498DB");
      }
    });

    test("オーナーは複数のフィールドを同時に更新できること", async () => {
      const projectId = "project-3";
      const currentUserId = "owner-user";
      const existingProject = projectDummyFrom({
        id: projectId,
        name: "古い名前",
        description: "古い説明",
        color: "#FF5733",
      });
      const ownerMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
          saveReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(ownerMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
        description: "新しい説明",
        color: "#E74C3C",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.name).toBe("新しい名前");
        expect(result.data.project.description).toBe("新しい説明");
        expect(result.data.project.color).toBe("#E74C3C");
      }
    });

    test("オーナー以外はプロジェクトを更新できないこと", async () => {
      const projectId = "project-4";
      const currentUserId = "member-user";
      const existingProject = projectDummyFrom({
        id: projectId,
        name: "プロジェクト名",
      });
      const memberMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.member(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(memberMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    });

    test("メンバーでないユーザーはプロジェクトを更新できないこと", async () => {
      const projectId = "project-5";
      const currentUserId = "non-member-user";
      const existingProject = projectDummyFrom({
        id: projectId,
        name: "プロジェクト名",
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "non-existent-id",
        currentUserId: "any-user",
        name: "新しい名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("プロジェクトが見つかりませんでした");
      }
    });

    test("findByIdでエラーが発生した場合はそのエラーを返すこと", async () => {
      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId: "project-4",
        currentUserId: "any-user",
        name: "新しい名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      const projectId = "project-6";
      const currentUserId = "owner-user";
      const existingProject = projectDummyFrom({
        id: projectId,
      });
      const ownerMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
          saveReturnValue: Result.err(new UnexpectedError()),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(ownerMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("更新後もcreatedAtは変わらないこと", async () => {
      const projectId = "project-7";
      const currentUserId = "owner-user";
      const createdAt = "2024-01-01T00:00:00.000Z";
      const existingProject = projectDummyFrom({
        id: projectId,
        name: "古い名前",
        createdAt,
      });
      const ownerMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const updateProjectUseCase = new UpdateProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(existingProject),
          saveReturnValue: Result.ok(undefined),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(ownerMember),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await updateProjectUseCase.execute({
        projectId,
        currentUserId,
        name: "新しい名前",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.project.createdAt).toBe(createdAt);
        expect(result.data.project.updatedAt).not.toBe(createdAt);
      }
    });
  });
});
