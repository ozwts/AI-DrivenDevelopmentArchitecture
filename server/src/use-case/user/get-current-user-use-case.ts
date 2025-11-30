import { inject, injectable } from "inversify";
import { serviceId } from "@/di-container/service-id";
import type { UserRepository } from "@/domain/model/user/user.repository";
import type { User } from "@/domain/model/user/user.entity";
import { Result } from "@/util/result";
import { NotFoundError, UnexpectedError } from "@/util/error-util";

export type GetCurrentUserUseCaseExecuteProps = {
  sub: string;
};

export type GetCurrentUserUseCaseResult = Result<
  User,
  NotFoundError | UnexpectedError
>;

/**
 * 現在ログインしているユーザーを取得するユースケース
 *
 * Cognito User Subを使用してユーザーを検索します。
 */
@injectable()
export class GetCurrentUserUseCase {
  readonly #userRepository: UserRepository;

  constructor(
    @inject(serviceId.USER_REPOSITORY)
    userRepository: UserRepository,
  ) {
    this.#userRepository = userRepository;
  }

  async execute(
    props: GetCurrentUserUseCaseExecuteProps,
  ): Promise<GetCurrentUserUseCaseResult> {
    const { sub } = props;

    // Cognito Subでユーザーを検索
    const findResult = await this.#userRepository.findBySub({ sub });

    if (findResult.isErr()) {
      return Result.err(findResult.error);
    }

    if (findResult.data === undefined) {
      return Result.err(new NotFoundError("ユーザーが見つかりません"));
    }

    return Result.ok(findResult.data);
  }
}
