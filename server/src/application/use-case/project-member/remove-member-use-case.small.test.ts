import { describe, expect, test } from "vitest";
import { RemoveMemberUseCaseImpl } from "./remove-member-use-case";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import type { ProjectMemberRepository } from "@/domain/model/project-member/project-member.repository";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import {
  UnexpectedError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";
import type { ProjectMember } from "@/domain/model/project-member/project-member.entity";

/**
 * findByProjectIdAndUserIdとfindByIdの呼び出しに応じて値を返すリポジトリダミーを作成する
 */
const createTestRepository = (options: {
  currentMember?: ProjectMember;
  targetMember?: ProjectMember;
  ownerCount?: number;
  removeError?: boolean;
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
    save: (props) => baseDummy.save(props),
    remove: () => {
      if (options.removeError === true) {
        return Promise.resolve(Result.err(new UnexpectedError()));
      }
      return Promise.resolve(Result.ok(undefined));
    },
  };
};

describe("RemoveMemberUseCase", () => {
  describe("正常系", () => {
    test("メンバーを削除できる", async () => {
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

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });

    test("オーナーを削除できる（他にオーナーがいる場合）", async () => {
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

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          ownerCount: 2,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });

    test("存在しないメンバーの削除は成功する（冪等性）", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetMemberId = "non-existent-member";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember: undefined,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });

    test("異なるプロジェクトのメンバーIDを指定した場合は成功する（冪等性）", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
      const targetMemberId = "target-member-id";

      const project = projectDummyFrom({ id: projectId });
      const currentMember = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: targetMemberId,
        projectId: "different-project", // 異なるプロジェクト
        userId: "target-user",
        role: MemberRole.member(),
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });
  });

  describe("異常系", () => {
    test("プロジェクトが存在しない場合、NotFoundErrorを返す", async () => {
      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId: "non-existent-project",
        targetMemberId: "member-123",
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

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(undefined),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId: "target-member",
        currentUserId: "non-member-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only owner can remove members");
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

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(currentMember),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId: "target-member",
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
        expect(result.error.message).toBe("Only owner can remove members");
      }
    });

    test("最後のオーナーは削除できない", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
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
        userId: "target-owner",
        role: MemberRole.owner(),
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          ownerCount: 1, // 最後のオーナー
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe(
          "Cannot remove the last owner of the project",
        );
      }
    });

    test("プロジェクトリポジトリがエラーを返す場合、エラーを伝播する", async () => {
      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId: "project-123",
        targetMemberId: "member-123",
        currentUserId: "current-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("削除時にエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";
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
        userId: "target-user",
        role: MemberRole.member(),
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectMemberRepository: createTestRepository({
          currentMember,
          targetMember,
          removeError: true,
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        targetMemberId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
