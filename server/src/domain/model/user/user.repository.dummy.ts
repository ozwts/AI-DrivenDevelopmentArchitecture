import { Result } from "@/util/result";
import type {
  UserRepository,
  SaveResult,
  FindByIdResult,
  FindByIdsResult,
  FindAllResult,
  FindByNameResult,
  RemoveResult,
} from "./user.repository";
import type { User } from "./user.entity";
import { userDummyFrom } from "./user.entity.dummy";

export type UserRepositoryDummyProps = {
  userIdReturnValue?: string;
  findByIdReturnValue?: FindByIdResult;
  findByIdsReturnValue?: FindByIdsResult;
  findBySubReturnValue?: FindByIdResult;
  findAllReturnValue?: FindAllResult;
  findByNameContainsReturnValue?: FindByNameResult;
  saveReturnValue?: SaveResult;
  removeReturnValue?: RemoveResult;
};

/**
 * UserRepositoryのダミー実装
 *
 * テストでユースケースをテストする際に使用する。
 * 各メソッドの戻り値をコンストラクタで設定可能。
 *
 * @example
 * ```typescript
 * const repository = new UserRepositoryDummy({
 *   findByIdReturnValue: Result.ok(userDummyFrom({ id: "user-123" }))
 * });
 * ```
 */
export class UserRepositoryDummy implements UserRepository {
  readonly #userIdReturnValue: string;

  readonly #findByIdReturnValue: FindByIdResult;

  readonly #findByIdsReturnValue: FindByIdsResult;

  readonly #findBySubReturnValue: FindByIdResult;

  readonly #findAllReturnValue: FindAllResult;

  readonly #findByNameContainsReturnValue: FindByNameResult;

  readonly #saveReturnValue: SaveResult;

  readonly #removeReturnValue: RemoveResult;

  constructor(props?: UserRepositoryDummyProps) {
    this.#userIdReturnValue = props?.userIdReturnValue ?? "dummy-user-id";
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(userDummyFrom());
    this.#findByIdsReturnValue =
      props?.findByIdsReturnValue ?? Result.ok([userDummyFrom()]);
    this.#findBySubReturnValue =
      props?.findBySubReturnValue ?? Result.ok(userDummyFrom());
    this.#findAllReturnValue =
      props?.findAllReturnValue ?? Result.ok([userDummyFrom()]);
    this.#findByNameContainsReturnValue =
      props?.findByNameContainsReturnValue ?? Result.ok([userDummyFrom()]);
    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  userId(): string {
    return this.#userIdReturnValue;
  }

  findById(_props: { id: string }): Promise<FindByIdResult> {
    return Promise.resolve(this.#findByIdReturnValue);
  }

  findByIds(_props: { ids: string[] }): Promise<FindByIdsResult> {
    return Promise.resolve(this.#findByIdsReturnValue);
  }

  findBySub(_props: { sub: string }): Promise<FindByIdResult> {
    return Promise.resolve(this.#findBySubReturnValue);
  }

  findAll(): Promise<FindAllResult> {
    return Promise.resolve(this.#findAllReturnValue);
  }

  findByNameContains(_props: { name: string }): Promise<FindByNameResult> {
    return Promise.resolve(this.#findByNameContainsReturnValue);
  }

  save(_props: { user: User }): Promise<SaveResult> {
    return Promise.resolve(this.#saveReturnValue);
  }

  remove(_props: { id: string }): Promise<RemoveResult> {
    return Promise.resolve(this.#removeReturnValue);
  }
}
