import { test, expect, describe } from "vitest";
import { LeaveProjectUseCaseImpl } from "./leave-project-use-case";
import { ProjectRepositoryDummy } from "@/domain/model/project/project.repository.dummy";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { projectDummyFrom } from "@/domain/model/project/project.entity.dummy";
import { projectMemberDummyFrom } from "@/domain/model/project/project-member.entity.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { MemberRole } from "@/domain/model/project/member-role.vo";
import {
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("LeaveProjectUseCaseのテスト", () => {
  const fixedDate = new Date("2024-01-15T10:00:00.000Z");
  const fetchNow = () => fixedDate;

  describe("execute", () => {
    test("メンバーがプロジェクトから脱退できること", async () => {
      const user = userDummyFrom({ id: "user-id", sub: "user-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "owner-id",
        role: MemberRole.owner(),
      });
      const userMember = projectMemberDummyFrom({
        id: "user-member-id",
        userId: "user-id",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember, userMember],
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(user),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        userSub: "user-sub",
      });

      expect(result.isOk()).toBe(true);
    });

    test("ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const useCase = new LeaveProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy(),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        userSub: "unknown-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const user = userDummyFrom({ sub: "user-sub" });

      const useCase = new LeaveProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(user),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "non-existent",
        userSub: "user-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("メンバーでない場合はNotFoundErrorを返すこと", async () => {
      const user = userDummyFrom({ id: "user-id", sub: "user-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "owner-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember],
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(user),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        userSub: "user-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("オーナーが脱退しようとした場合はValidationErrorを返すこと", async () => {
      const owner = userDummyFrom({ id: "owner-id", sub: "owner-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "owner-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember],
      });

      const useCase = new LeaveProjectUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(owner),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        userSub: "owner-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test("リポジトリエラー時はエラーを返すこと", async () => {
      const useCase = new LeaveProjectUseCaseImpl({
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
        userSub: "user-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
