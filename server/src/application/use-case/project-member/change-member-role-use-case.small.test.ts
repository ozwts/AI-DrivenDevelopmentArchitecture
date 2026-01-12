import { describe, expect, test } from "vitest";
import { ChangeMemberRoleUseCaseImpl } from "./change-member-role-use-case";
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
  ForbiddenError,
  ConflictError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { Result } from "@/util/result";
import type { ProjectMember } from "@/domain/model/project-member/project-member.entity";

/**
 * findByProjectIdAndUserIdとfindByIdの呼び出しに応じて値を返すリポジトリダミーを作成する
 */
const createTestRepository = (options: {
  currentMember?: ProjectMember;
  targetMember?: ProjectMember;
  ownerCount?: number;
  saveError?: boolean;
}): ProjectMemberRepository => {
  const baseDummy = new ProjectMemberRepositoryDummy();

  return {
    projectMemberId: () => baseDummy.projectMemberId(),
    findById: () => Promise.resolve(Result.ok(options.targetMember)),
    findByProjectId: (props) => baseDummy.findByProjectId(props),
    findByProjectIdAndUserId: () =>
      Promise.resolve(Result.ok(options.currentMember)),
    findByUserId: (props) => baseDummy.findByUserId(props),
    countOwnersByProjectId: () =>
      Promise.resolve(Result.ok(options.ownerCount ?? 2)),
    save: () => {
      if (options.saveError === true) {
        return Promise.resolve(Result.err(new UnexpectedError()));
      }
      return Promise.resolve(Result.ok(undefined));
    },
    remove: (props) => baseDummy.remove(props),
  };
};

describe("ChangeMemberRoleUseCase", () => {
  describe("正常系 - 昇格", () => {
    test("メンバーをオーナーに昇格できる", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-user";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.member(),
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-06-15T10:00:00+09:00")),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.member.role.isOwner()).toBe(true);
        expect(result.data.member.userId).toBe(targetUserId);
        expect(result.data.user.id).toBe(targetUserId);
      }
    });
  });

  describe("正常系 - 降格", () => {
    test("オーナーをメンバーに降格できる（他にオーナーがいる場合）", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-owner";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.owner(),
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          ownerCount: 2,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-06-15T10:00:00+09:00")),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "MEMBER",
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.member.role.isMember()).toBe(true);
        expect(result.data.member.userId).toBe(targetUserId);
        expect(result.data.user.id).toBe(targetUserId);
      }
    });
  });

  describe("異常系", () => {
    test("プロジェクトが存在しない場合、NotFoundErrorを返す", async () => {
      const useCase = new ChangeMemberRoleUseCaseImpl({
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
        targetMemberId: "member-123",
        newRole: "OWNER",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Project not found");
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

      const useCase = new ChangeMemberRoleUseCaseImpl({
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
        targetMemberId: "target-member",
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only owner can change member roles");
      }
    });

    test("対象メンバーが存在しない場合、NotFoundErrorを返す", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember: undefined,
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
        targetMemberId: "non-existent-member",
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Member not found");
      }
    });

    test("メンバーが異なるプロジェクトに所属している場合、NotFoundErrorを返す", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: "target-member-id",
        projectId: "different-project", // 異なるプロジェクト
        userId: "target-user",
        role: MemberRole.member(),
      });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
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
        targetMemberId: "target-member-id",
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Member not found");
      }
    });

    test("既にオーナーの場合、昇格できない", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-owner";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.owner(), // 既にオーナー
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe("Member is already an owner");
      }
    });

    test("既にメンバーの場合、降格できない", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-member";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.member(), // 既にメンバー
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "MEMBER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe("Member is already a member");
      }
    });

    test("最後のオーナーは降格できない", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-owner";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.owner(),
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          ownerCount: 1, // 最後のオーナー
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "MEMBER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe(
          "Cannot demote the last owner of the project",
        );
      }
    });

    test("保存時にエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetUserId = "target-user";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId,
        userId: targetUserId,
        role: MemberRole.member(),
      });
      const targetUser = userDummyFrom({ id: targetUserId });

      const useCase = new ChangeMemberRoleUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          saveError: true,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(targetUser),
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        newRole: "OWNER",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
