import { describe, expect, test } from "vitest";
import { InviteMemberUseCaseImpl } from "./invite-member-use-case";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import {
  UnexpectedError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { Result } from "@/util/result";
import type { ProjectMember } from "@/domain/model/project-member/project-member.entity";

/**
 * findByProjectIdAndUserIdの呼び出しに応じて異なる値を返すリポジトリダミーを作成する
 */
const createSequentialFindRepository = (
  responses: (ProjectMember | undefined)[],
  options?: {
    projectMemberId?: string;
    saveError?: boolean;
  },
): ProjectMemberRepository => {
  const baseDummy = new ProjectMemberRepositoryDummy();
  let callCount = 0;

  return {
    projectMemberId: () => options?.projectMemberId ?? baseDummy.projectMemberId(),
    findById: (props) => baseDummy.findById(props),
    findByProjectId: (props) => baseDummy.findByProjectId(props),
    findByProjectIdAndUserId: () => {
      const response = responses[callCount];
      callCount++;
      return Promise.resolve(Result.ok(response));
    },
    findByUserId: (props) => baseDummy.findByUserId(props),
    countOwnersByProjectId: (props) => baseDummy.countOwnersByProjectId(props),
    save: () => {
      if (options?.saveError) {
        return Promise.resolve(Result.err(new UnexpectedError()));
      }
      return Promise.resolve(Result.ok(undefined));
    },
    remove: (props) => baseDummy.remove(props),
  };
};

describe("InviteMemberUseCase", () => {
  describe("正常系", () => {
    test("メンバーを招待できる（デフォルトロール=MEMBER）", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const invitedUserId = "invited-user";
      const newMemberId = "new-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const invitedUser = userDummyFrom({ id: invitedUserId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, undefined],
          { projectMemberId: newMemberId },
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(invitedUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-06-15T10:00:00+09:00")),
      });

      const result = await useCase.execute({
        projectId,
        userId: invitedUserId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.member.id).toBe(newMemberId);
        expect(result.data.member.projectId).toBe(projectId);
        expect(result.data.member.userId).toBe(invitedUserId);
        expect(result.data.member.role.isMember()).toBe(true);
        expect(result.data.user.id).toBe(invitedUserId);
      }
    });

    test("ロールをOWNERで指定して招待できる", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const invitedUserId = "invited-user";
      const newMemberId = "new-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const invitedUser = userDummyFrom({ id: invitedUserId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, undefined],
          { projectMemberId: newMemberId },
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(invitedUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-06-15T10:00:00+09:00")),
      });

      const result = await useCase.execute({
        projectId,
        userId: invitedUserId,
        role: "OWNER",
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.member.role.isOwner()).toBe(true);
      }
    });
  });

  describe("異常系", () => {
    test("プロジェクトが存在しない場合、NotFoundErrorを返す", async () => {
      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId: "non-existent-project",
        userId: "user-123",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Project not found");
      }
    });

    test("現在のユーザーがメンバーでない場合、ForbiddenErrorを返す", async () => {
      const projectId = "project-123";
      const project = projectDummyFrom({ id: projectId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(undefined),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: "invited-user",
        currentUserId: "non-member-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only owner can invite members");
      }
    });

    test("現在のユーザーがオーナーでない場合、ForbiddenErrorを返す", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.member(), // オーナーではない
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: "invited-user",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only owner can invite members");
      }
    });

    test("招待するユーザーが存在しない場合、NotFoundErrorを返す", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, undefined],
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: "non-existent-user",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("User not found");
      }
    });

    test("既にメンバーの場合、ConflictErrorを返す", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const invitedUserId = "invited-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const existingMember = projectMemberDummyFrom({
        projectId,
        userId: invitedUserId,
        role: MemberRole.member(),
      });
      const invitedUser = userDummyFrom({ id: invitedUserId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, existingMember],
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(invitedUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: invitedUserId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe("User is already a member");
      }
    });

    test("プロジェクトリポジトリがエラーを返す場合、エラーを伝播する", async () => {
      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId: "project-123",
        userId: "user-123",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("現在ユーザーのメンバー情報取得でエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const project = projectDummyFrom({ id: projectId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: "invited-user",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("ユーザーリポジトリがエラーを返す場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, undefined],
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: "invited-user",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("保存時にエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const invitedUserId = "invited-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const invitedUser = userDummyFrom({ id: invitedUserId });

      const useCase = new InviteMemberUseCaseImpl({
        projectMemberRepository: createSequentialFindRepository(
          [currentMember, undefined],
          { saveError: true },
        ),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(invitedUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        userId: invitedUserId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
