import { test, expect, describe } from "vitest";
import { DeleteCurrentUserUseCaseImpl } from "./delete-current-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { AuthClientDummy } from "@/application/port/auth-client/dummy";
import { Result } from "@/util/result";

describe("DeleteCurrentUserUseCaseのテスト", () => {
  describe("execute", () => {
    test("[正常系] 現在のユーザーを削除できること", async () => {
      const existingUser = userDummyFrom({
        id: "user-123",
        sub: "cognito-sub-123",
      });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          removeReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data).toBeUndefined();
      }
    });

    test("[異常系] ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "non-existent-sub",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("[異常系] ユーザー取得に失敗した場合はエラーを返すこと", async () => {
      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.err(new UnexpectedError()),
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("[異常系] Cognito削除に失敗した場合はエラーを返すこと", async () => {
      const existingUser = userDummyFrom({ sub: "cognito-sub-123" });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("[異常系] DB削除に失敗した場合はエラーを返すこと", async () => {
      const existingUser = userDummyFrom({ sub: "cognito-sub-123" });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(existingUser),
          removeReturnValue: Result.err(new UnexpectedError()),
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
