import { describe, expect, test } from "vitest";
import { LeaveProjectUseCaseImpl } from "./leave-project-use-case";
import { ProjectMemberRepositoryDummy } from "@/domain/model/project-member/project-member.repository.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project-member/project-member.entity.dummy";
import { MemberRole } from "@/domain/model/project-member/member-role.vo";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import {
  UnexpectedError,
  NotFoundError,
  ConflictError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("LeaveProjectUseCase", () => {
  describe("正常系", () => {
    test("メンバーがプロジェクトから脱退できる", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.member(),
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });

    test("オーナーがプロジェクトから脱退できる（他にオーナーがいる場合）", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
          countOwnersByProjectIdReturnValue: Result.ok(2), // 他にオーナーがいる
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isOk()).toBe(true);
    });
  });

  describe("異常系", () => {
    test("プロジェクトが存在しない場合、NotFoundErrorを返す", async () => {
      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
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

    test("メンバーでない場合、NotFoundErrorを返す", async () => {
      const projectId = "project-123";
      const project = projectDummyFrom({ id: projectId });

      const useCase = new LeaveProjectUseCaseImpl({
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
        currentUserId: "non-member-user",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("Not a member of this project");
      }
    });

    test("最後のオーナーは脱退できない", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.owner(),
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
          countOwnersByProjectIdReturnValue: Result.ok(1), // 最後のオーナー
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({
        projectId,
        currentUserId,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe(
          "Cannot leave as the last owner. Please promote another member to owner first.",
        );
      }
    });

    test("プロジェクトリポジトリがエラーを返す場合、エラーを伝播する", async () => {
      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy(),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
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

      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.err(new UnexpectedError()),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
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

    test("削除時にエラーが発生した場合、エラーを伝播する", async () => {
      const projectId = "project-123";
      const currentUserId = "current-user";

      const project = projectDummyFrom({ id: projectId });
      const member = projectMemberDummyFrom({
        projectId,
        userId: currentUserId,
        role: MemberRole.member(),
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectMemberRepository: new ProjectMemberRepositoryDummy({
          findByProjectIdAndUserIdReturnValue: Result.ok(member),
          removeReturnValue: Result.err(new UnexpectedError()),
        }),
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
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
