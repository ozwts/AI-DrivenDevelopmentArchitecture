import { test, expect, describe } from "vitest";
import { UpdateCurrentUserUseCaseImpl } from "./update-current-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { buildFetchNowDummy } from "@/application/port/fetch-now/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { AuthClientDummy } from "@/application/port/auth-client/dummy";
import { Result } from "@/util/result";

describe("UpdateCurrentUserUseCaseのテスト", () => {
  describe("execute", () => {
    test("[正常系] ユーザー名のみを更新できること", async () => {
      const existingUser = userDummyFrom({
        sub: "cognito-sub-123",
        name: "旧名前",
        email: "old@example.com",
        emailVerified: false,
      });

      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          // getUserByIdがエラーを投げるとemail/emailVerifiedは既存値が保持される
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-02T00:00:00+09:00")),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
        name: "新名前",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.sub).toBe("cognito-sub-123");
        expect(result.data.name).toBe("新名前");
        // email と emailVerified は変更されない（AuthClientのデフォルト値が使われる）
      }
    });

    test("[正常系] トークンからemailを同期できること", async () => {
      const existingUser = userDummyFrom({
        sub: "cognito-sub-123",
        name: "ユーザー名",
        email: "old@example.com",
        emailVerified: false,
      });

      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "cognito-sub-123",
            email: "new@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-02T00:00:00+09:00")),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.sub).toBe("cognito-sub-123");
        expect(result.data.name).toBe("ユーザー名"); // 変更されない
        expect(result.data.email).toBe("new@example.com"); // AuthClientから更新
        expect(result.data.emailVerified).toBe(true); // AuthClientから更新
      }
    });

    test("[正常系] nameとemailを同時に更新できること", async () => {
      const existingUser = userDummyFrom({
        sub: "cognito-sub-123",
        name: "旧名前",
        email: "old@example.com",
        emailVerified: false,
      });

      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          getUserByIdReturnValue: {
            id: "cognito-sub-123",
            email: "new@example.com",
            emailVerified: true,
            disabled: false,
          },
        }),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-02T00:00:00+09:00")),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
        name: "新名前",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.sub).toBe("cognito-sub-123");
        expect(result.data.name).toBe("新名前"); // リクエストボディから更新
        expect(result.data.email).toBe("new@example.com"); // AuthClientから更新
        expect(result.data.emailVerified).toBe(true); // AuthClientから更新
      }
    });

    test("[正常系] 名前を省略した場合は既存の名前が保持されること", async () => {
      const existingUser = userDummyFrom({
        sub: "cognito-sub-123",
        name: "元の名前",
        email: "old@example.com",
        emailVerified: false,
      });

      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          saveReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date("2024-01-02T00:00:00+09:00")),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.name).toBe("元の名前"); // 変更されていない
      }
    });

    test("[異常系] ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date()),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "non-existent-sub",
        name: "新名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("[異常系] ユーザー取得に失敗した場合はエラーを返すこと", async () => {
      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.err(new UnexpectedError()),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date()),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
        name: "新名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("[異常系] 保存に失敗した場合はエラーを返すこと", async () => {
      const existingUser = userDummyFrom({ sub: "cognito-sub-123" });

      const updateCurrentUserUseCase = new UpdateCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          saveReturnValue: Result.err(new UnexpectedError()),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
        fetchNow: buildFetchNowDummy(new Date()),
      });

      const result = await updateCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
        name: "新名前",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
