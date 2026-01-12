import { test, expect, describe } from "vitest";
import { ListProjectsUseCaseImpl } from "./list-projects-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("ListProjectsUseCaseのテスト", () => {
  describe("execute", () => {
    test("ユーザーがメンバーである全てのプロジェクトを取得できること", async () => {
      const currentUserId = "current-user";
      const projects = [
        projectDummyFrom({ id: "project-1", name: "プロジェクト1" }),
        projectDummyFrom({ id: "project-2", name: "プロジェクト2" }),
        projectDummyFrom({ id: "project-3", name: "プロジェクト3" }),
      ];
      const memberships = [
        projectMemberDummyFrom({
          projectId: "project-1",
          userId: currentUserId,
          role: MemberRole.owner(),
        }),
        projectMemberDummyFrom({
          projectId: "project-2",
          userId: currentUserId,
          role: MemberRole.member(),
        }),
        projectMemberDummyFrom({
          projectId: "project-3",
          userId: currentUserId,
          role: MemberRole.member(),
        }),
      ];

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdsReturnValue: Result.ok(projects),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.ok(memberships),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].project.id).toBe("project-1");
        expect(result.data[0].myRole.isOwner()).toBe(true);
        expect(result.data[1].myRole.isMember()).toBe(true);
      }
    });

    test("メンバーシップが0件の場合は空配列を返すこと", async () => {
      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy(),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.ok([]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId: "user-with-no-memberships",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(0);
        expect(result.data).toEqual([]);
      }
    });

    test("メンバーシップ取得でエラーが返された場合はそのエラーを返すこと", async () => {
      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy(),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("プロジェクト取得でエラーが返された場合はそのエラーを返すこと", async () => {
      const currentUserId = "current-user";
      const memberships = [
        projectMemberDummyFrom({
          projectId: "project-1",
          userId: currentUserId,
          role: MemberRole.owner(),
        }),
      ];

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdsReturnValue: Result.err(new UnexpectedError()),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.ok(memberships),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("複数のプロジェクトの詳細情報を取得できること", async () => {
      const currentUserId = "current-user";
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
      const memberships = [
        projectMemberDummyFrom({
          projectId: "project-1",
          userId: currentUserId,
          role: MemberRole.owner(),
        }),
        projectMemberDummyFrom({
          projectId: "project-2",
          userId: currentUserId,
          role: MemberRole.member(),
        }),
      ];

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdsReturnValue: Result.ok(projectsWithDetails),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.ok(memberships),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].project.description).toBe("説明A");
        expect(result.data[1].project.description).toBe("説明B");
      }
    });

    test("大量のプロジェクトを取得できること", async () => {
      const currentUserId = "current-user";
      const manyProjects = Array.from({ length: 100 }, (_, i) =>
        projectDummyFrom({
          id: `project-${i}`,
          name: `プロジェクト${i}`,
        }),
      );
      const manyMemberships = Array.from({ length: 100 }, (_, i) =>
        projectMemberDummyFrom({
          projectId: `project-${i}`,
          userId: currentUserId,
          role: i % 2 === 0 ? MemberRole.owner() : MemberRole.member(),
        }),
      );

      const listProjectsUseCase = new ListProjectsUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdsReturnValue: Result.ok(manyProjects),
        }),
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByUserIdReturnValue: Result.ok(manyMemberships),
        }),
        logger: new LoggerDummy(),
      });

      const result = await listProjectsUseCase.execute({
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(100);
      }
    });
  });
});
