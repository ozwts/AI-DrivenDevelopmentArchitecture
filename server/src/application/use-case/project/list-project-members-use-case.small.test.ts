import { test, expect, describe } from "vitest";
import { ListProjectMembersUseCaseImpl } from "./list-project-members-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project/project-member.entity.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import { NotFoundError, UnexpectedError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("ListProjectMembersUseCaseのテスト", () => {
  describe("execute", () => {
    test("プロジェクトメンバー一覧を取得できること", async () => {
      const user1 = userDummyFrom({ id: "user-1", name: "User 1" });
      const user2 = userDummyFrom({ id: "user-2", name: "User 2" });
      const member1 = projectMemberDummyFrom({
        id: "member-1",
        userId: "user-1",
        role: MemberRole.owner(),
      });
      const member2 = projectMemberDummyFrom({
        id: "member-2",
        userId: "user-2",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [member1, member2],
      });

      const useCase = new ListProjectMembersUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdsReturnValue: Result.ok([user1, user2]),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ projectId: "project-1" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].member.id).toBe("member-1");
        expect(result.data[0].user.id).toBe("user-1");
        expect(result.data[1].member.id).toBe("member-2");
        expect(result.data[1].user.id).toBe("user-2");
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const useCase = new ListProjectMembersUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ projectId: "non-existent" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("リポジトリエラー時はエラーを返すこと", async () => {
      const useCase = new ListProjectMembersUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ projectId: "project-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("ユーザー取得エラー時はエラーを返すこと", async () => {
      const member = projectMemberDummyFrom({ userId: "user-1" });
      const project = projectDummyFrom({
        id: "project-1",
        members: [member],
      });

      const useCase = new ListProjectMembersUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdsReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ projectId: "project-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("メンバーに対応するユーザーが見つからない場合はエラーを返すこと", async () => {
      const member = projectMemberDummyFrom({ userId: "user-1" });
      const project = projectDummyFrom({
        id: "project-1",
        members: [member],
      });

      const useCase = new ListProjectMembersUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdsReturnValue: Result.ok([]), // ユーザーが見つからない
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ projectId: "project-1" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
