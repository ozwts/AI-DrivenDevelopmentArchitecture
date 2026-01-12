import { test, expect, describe } from "vitest";
import { RemoveMemberUseCaseImpl } from "./remove-member-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project/project-member.entity.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import {
  ForbiddenError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("RemoveMemberUseCaseのテスト", () => {
  const fixedDate = new Date("2024-01-15T10:00:00.000Z");
  const fetchNow = () => fixedDate;

  describe("execute", () => {
    test("オーナーがメンバーを削除できること", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const targetMember = projectMemberDummyFrom({
        id: "target-member-id",
        userId: "target-user-id",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember, targetMember],
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "target-user-id",
        operatorSub: "operator-sub",
      });

      expect(result.isOk()).toBe(true);
    });

    test("操作者が見つからない場合はNotFoundErrorを返すこと", async () => {
      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy(),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "target-user-id",
        operatorSub: "unknown-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const operator = userDummyFrom({ sub: "operator-sub" });

      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "non-existent",
        targetUserId: "target-user-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("オーナー以外が削除しようとした場合はForbiddenErrorを返すこと", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const operatorMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.member(),
      });
      const targetMember = projectMemberDummyFrom({
        userId: "target-user-id",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [operatorMember, targetMember],
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "target-user-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    });

    test("オーナーを削除しようとした場合はValidationErrorを返すこと", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const anotherOwner = projectMemberDummyFrom({
        userId: "another-owner-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember, anotherOwner],
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "another-owner-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test("存在しないメンバーを削除しようとした場合は成功を返すこと（冪等）", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember],
      });

      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "non-existent-user-id",
        operatorSub: "operator-sub",
      });

      expect(result.isOk()).toBe(true);
    });

    test("リポジトリエラー時はエラーを返すこと", async () => {
      const useCase = new RemoveMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(userDummyFrom()),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        targetUserId: "target-user-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
