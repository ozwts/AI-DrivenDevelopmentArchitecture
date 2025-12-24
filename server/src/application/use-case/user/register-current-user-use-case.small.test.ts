import { test, expect, describe } from "vitest";
import { RegisterCurrentUserUseCaseImpl } from "./register-current-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { ConflictError, UnexpectedError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { AuthClientDummy } from "@/application/port/auth-client/dummy";
import { Result } from "@/util/result";

describe("RegisterCurrentUserUseCaseImpl", () => {
  describe("execute", () => {
    test("[正常系] 新規ユーザーを登録できること", async () => {
      // Arrange
      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          userIdReturnValue: "test-user-id",
          findBySubReturnValue: Result.ok(undefined), // ユーザーが存在しない
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "test-sub",
            email: "test@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-01T00:00:00.000Z")),
      });

      // Act
      const result = await useCase.execute({
        sub: "test-sub",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe("test-user-id");
        expect(result.data.sub).toBe("test-sub");
        expect(result.data.email).toBe("test@example.com");
        expect(result.data.emailVerified).toBe(true);
        expect(result.data.name).toBe("test"); // メールアドレスから生成
        expect(result.data.createdAt).toBe("2024-01-01T09:00:00.000+09:00");
        expect(result.data.updatedAt).toBe("2024-01-01T09:00:00.000+09:00");
      }
    });

    test("[正常系] emailVerifiedがfalseの場合も登録できること", async () => {
      // Arrange
      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          userIdReturnValue: "test-user-id",
          findBySubReturnValue: Result.ok(undefined), // ユーザーが存在しない
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "test-sub",
            email: "test@example.com",
            emailVerified: false,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-01T00:00:00.000Z")),
      });

      // Act
      const result = await useCase.execute({
        sub: "test-sub",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.emailVerified).toBe(false);
      }
    });

    test("[異常系] 同じsubのユーザーがすでに存在する場合はConflictErrorを返すこと", async () => {
      // Arrange
      const existingUser = userDummyFrom({
        sub: "existing-sub",
      });

      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser), // 既存ユーザーが存在
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "existing-sub",
            email: "test@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      // Act
      const result = await useCase.execute({
        sub: "existing-sub",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(ConflictError);
        expect(result.error.message).toBe(
          "このユーザーはすでに登録されています",
        );
      }
    });

    test("[異常系] ユーザー検索に失敗した場合はUnexpectedErrorを返すこと", async () => {
      // Arrange
      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.err(new UnexpectedError("検索エラー")),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "test-sub",
            email: "test@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      // Act
      const result = await useCase.execute({
        sub: "test-sub",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
        expect(result.error.message).toBe("検索エラー");
      }
    });

    test("[異常系] ユーザー保存に失敗した場合はUnexpectedErrorを返すこと", async () => {
      // Arrange
      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined), // ユーザーが存在しない
          saveReturnValue: Result.err(new UnexpectedError("保存エラー")),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "test-sub",
            email: "test@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      // Act
      const result = await useCase.execute({
        sub: "test-sub",
      });

      // Assert
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
        expect(result.error.message).toBe("保存エラー");
      }
    });

    test("[正常系] メールアドレスに@がない場合でもユーザー名を生成できること", async () => {
      // Arrange
      const useCase = new RegisterCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          userIdReturnValue: "test-user-id",
          findBySubReturnValue: Result.ok(undefined),
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "test-sub",
            email: "invalid-email",
            emailVerified: false,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(),
      });

      // Act
      const result = await useCase.execute({
        sub: "test-sub",
      });

      // Assert
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.name).toBe("invalid-email"); // @がない場合はそのまま使用
      }
    });
  });
});
