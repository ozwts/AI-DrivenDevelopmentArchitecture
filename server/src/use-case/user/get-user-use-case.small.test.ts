import { test, expect, describe } from "vitest";
import { GetUserUseCaseImpl } from "./get-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user-repository.dummy";
import { LoggerDummy } from "@/domain/support/logger/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.dummy";

describe("GetUserUseCaseのテスト", () => {
  describe("execute", () => {
    test("[正常系] ユーザーを取得できること", async () => {
      const user = userDummyFrom({
        id: "user-123",
        email: "test@example.com",
      });

      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: { success: true, data: user },
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "user-123" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("user-123");
        expect(result.data.email).toBe("test@example.com");
      }
    });

    test("[異常系] ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: { success: true, data: undefined },
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "non-existent-id" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("[異常系] リポジトリエラーの場合はエラーを返すこと", async () => {
      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: {
            success: false,
            error: new UnexpectedError(),
          },
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "user-123" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
