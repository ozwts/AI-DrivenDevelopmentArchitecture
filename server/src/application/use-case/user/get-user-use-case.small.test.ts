import { test, expect, describe } from "vitest";
import { GetUserUseCaseImpl } from "./get-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { UnexpectedError, NotFoundError } from "@/util/error-util";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { Result } from "@/util/result";

describe("GetUserUseCaseのテスト", () => {
  describe("execute", () => {
    test("[正常系] ユーザーを取得できること", async () => {
      const user = userDummyFrom({
        id: "user-123",
        email: "test@example.com",
      });

      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(user),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "user-123" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe("user-123");
        expect(result.data.email).toBe("test@example.com");
      }
    });

    test("[異常系] ユーザーが見つからない場合はNotFoundErrorを返すこと", async () => {
      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "non-existent-id" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
      }
    });

    test("[異常系] リポジトリエラーの場合はエラーを返すこと", async () => {
      const getUserUseCase = new GetUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findByIdReturnValue: Result.err(new UnexpectedError()),
        }),
        logger: new LoggerDummy(),
      });

      const result = await getUserUseCase.execute({ id: "user-123" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UnexpectedError);
      }
    });
  });
});
