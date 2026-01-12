import { test, expect, describe } from "vitest";
import { InviteMemberUseCaseImpl } from "./invite-member-use-case";
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

describe("InviteMemberUseCaseのテスト", () => {
  const fixedDate = new Date("2024-01-15T10:00:00.000Z");
  const fetchNow = () => fixedDate;

  describe("execute", () => {
    test("オーナーがメンバーを招待できること", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const invitee = userDummyFrom({ id: "invitee-id", name: "Invitee" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember],
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
          projectMemberIdReturnValue: "new-member-id",
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
          findByIdReturnValue: Result.ok(invitee),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        inviteeUserId: "invitee-id",
        operatorSub: "operator-sub",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.member.userId).toBe("invitee-id");
        expect(result.data.member.role.role).toBe("member");
        expect(result.data.user.id).toBe("invitee-id");
        expect(result.data.user.name).toBe("Invitee");
      }
    });

    test("操作者が見つからない場合はNotFoundErrorを返すこと", async () => {
      const useCase = new InviteMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy(),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        inviteeUserId: "invitee-id",
        operatorSub: "unknown-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("プロジェクトが見つからない場合はNotFoundErrorを返すこと", async () => {
      const operator = userDummyFrom({ sub: "operator-sub" });

      const useCase = new InviteMemberUseCaseImpl({
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
        inviteeUserId: "invitee-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("オーナー以外が招待しようとした場合はForbiddenErrorを返すこと", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const memberRole = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [memberRole],
      });

      const useCase = new InviteMemberUseCaseImpl({
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
        inviteeUserId: "invitee-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ForbiddenError);
      }
    });

    test("招待するユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember],
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        inviteeUserId: "non-existent",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("既にメンバーの場合はValidationErrorを返すこと", async () => {
      const operator = userDummyFrom({ id: "operator-id", sub: "operator-sub" });
      const invitee = userDummyFrom({ id: "invitee-id" });
      const ownerMember = projectMemberDummyFrom({
        userId: "operator-id",
        role: MemberRole.owner(),
      });
      const existingMember = projectMemberDummyFrom({
        userId: "invitee-id",
        role: MemberRole.member(),
      });
      const project = projectDummyFrom({
        id: "project-1",
        members: [ownerMember, existingMember],
      });

      const useCase = new InviteMemberUseCaseImpl({
        projectRepository: new ProjectRepositoryDummy({
          findByIdReturnValue: Result.ok(project),
        }),
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(operator),
          findByIdReturnValue: Result.ok(invitee),
        }),
        logger: new LoggerDummy(),
        fetchNow,
      });

      const result = await useCase.execute({
        projectId: "project-1",
        inviteeUserId: "invitee-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ValidationError);
      }
    });

    test("リポジトリエラー時はエラーを返すこと", async () => {
      const useCase = new InviteMemberUseCaseImpl({
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
        inviteeUserId: "invitee-id",
        operatorSub: "operator-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
