import { test, expect, describe } from "vitest";
import { DeleteCurrentUserUseCaseImpl } from "./delete-current-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.dummy";
import { AuthClientDummy } from "@/application/port/auth-client/dummy";

describe("DeleteCurrentUserUseCaseのテスト", () => {
  describe("execute", () => {
    test("[正常系] 現在のユーザーを削除できること", async () => {
      const existingUser = userDummyFrom({
        id: "user-123",
        sub: "cognito-sub-123",
      });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: { success: true, data: existingUser },
          removeReturnValue: { success: true, data: undefined },
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: { success: true, data: undefined },
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("[異常系] ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: { success: true, data: undefined },
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "non-existent-sub",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("[異常系] ユーザー取得に失敗した場合はエラーを返すこと", async () => {
      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        authClient: new AuthClientDummy(),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("[異常系] Cognito削除に失敗した場合はエラーを返すこと", async () => {
      const existingUser = userDummyFrom({ sub: "cognito-sub-123" });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: { success: true, data: existingUser },
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });

    test("[異常系] DB削除に失敗した場合はエラーを返すこと", async () => {
      const existingUser = userDummyFrom({ sub: "cognito-sub-123" });

      const deleteCurrentUserUseCase = new DeleteCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: { success: true, data: existingUser },
          removeReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        authClient: new AuthClientDummy({
          deleteUserReturnValue: { success: true, data: undefined },
        }),
        logger: new LoggerDummy(),
      });

      const result = await deleteCurrentUserUseCase.execute({
        sub: "cognito-sub-123",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
