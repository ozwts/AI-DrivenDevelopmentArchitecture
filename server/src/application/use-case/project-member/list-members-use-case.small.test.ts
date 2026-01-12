import { describe, expect, test } from "vitest";
import { ListMembersUseCaseImpl } from "./list-members-use-case";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import {
  UnexpectedError,
  NotFoundError,
  ForbiddenError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";

/**
 * ユーザーIDに応じて値を返すUserRepositoryダミーを作成する
 */
const createUserRepository = (users: User[]): UserRepository => {
  const baseDummy = new UserRepositoryDummy();
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    userId: () => baseDummy.userId(),
    findById: ({ id }) => Promise.resolve(Result.ok(userMap.get(id))),
    findBySub: (props) => baseDummy.findBySub(props),
    findAll: () => baseDummy.findAll(),
    save: (props) => baseDummy.save(props),
    remove: (props) => baseDummy.remove(props),
  };
};

describe("ListMembersUseCase", () => {
  describe("正常系", () => {
    test("プロジェクトのメンバー一覧を取得できる", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const otherUserId = "other-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        id: "member-1",
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const otherMember = projectMemberDummyFrom({
        id: "member-2",
        projectId,
        userId: otherUserId,
        role: MemberRole.member(),
      });
      const currentUser = userDummyFrom({ id: currentUserId });
      const otherUser = userDummyFrom({ id: otherUserId });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
          findByProjectIdReturnValue: Result.ok([currentMember, otherMember]),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: createUserRepository([currentUser, otherUser]),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((m) => m.member.id)).toContain("member-1");
        expect(result.data.map((m) => m.member.id)).toContain("member-2");
        expect(result.data.map((m) => m.user.id)).toContain(currentUserId);
        expect(result.data.map((m) => m.user.id)).toContain(otherUserId);
      }
    });

    test("メンバーが1人の場合でも一覧を取得できる", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        id: "member-1",
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const currentUser = userDummyFrom({ id: currentUserId });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
          findByProjectIdReturnValue: Result.ok([currentMember]),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: createUserRepository([currentUser]),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].member.id).toBe("member-1");
        expect(result.data[0].user.id).toBe(currentUserId);
      }
    });
  });

  describe("異常系", () => {
    test("プロジェクトが存在しない場合、NotFoundErrorを返す", async () => {
      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId: "non-existent-project",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Project not found");
      }
    });

    test("メンバーでない場合、ForbiddenErrorを返す", async () => {
      const projectId = "project-123";
      const project = projectDummyFrom({ id: projectId });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(undefined),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId: "non-member-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only members can view member list");
      }
    });

    test("プロジェクトリポジトリがエラーを返す場合、エラーを伝播する", async () => {
      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId: "project-123",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("メンバー情報取得でエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const project = projectDummyFrom({ id: projectId });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("メンバー一覧取得でエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
          findByProjectIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("ユーザー情報取得でエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new ListMembersUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
          findByProjectIdReturnValue: Result.ok([currentMember]),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
