import { describe, expect, test } from "vitest";
import { GetCurrentUserUseCaseImpl } from "./get-current-user-use-case";
import { UserRepositoryDummy } from "@/domain/model/user/user.repository.dummy";
import { userDummyFrom } from "@/domain/model/user/user.entity.dummy";
import { NotFoundError } from "@/util/error-util";
import { LoggerDummy } from "@/application/port/logger/dummy";
import { Result } from "@/util/result";

describe("GetCurrentUserUseCase", () => {
  describe("正常系", () => {
    test("Cognito Subからユーザーを取得できる", async () => {
      const user = userDummyFrom({
        id: "user-1",
        sub: "cognito-sub-123",
        name: "Test User",
        email: "test@example.com",
      });
      const useCase = new GetCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(user),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ sub: "cognito-sub-123" });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.data.id).toBe("user-1");
        expect(result.data.sub).toBe("cognito-sub-123");
        expect(result.data.name).toBe("Test User");
        expect(result.data.email).toBe("test@example.com");
      }
    });
  });

  describe("異常系", () => {
    test("ユーザーが存在しない場合はNotFoundErrorを返す", async () => {
      const useCase = new GetCurrentUserUseCaseImpl({
        userRepository: new UserRepositoryDummy({
          findBySubReturnValue: Result.ok(undefined),
        }),
        logger: new LoggerDummy(),
      });

      const result = await useCase.execute({ sub: "non-existent-sub" });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundError);
        expect(result.error.message).toBe("ユーザーが見つかりません");
      }
    });
  });
});
