import { v7 as uuid } from "uuid";
import { Result } from "@/util/result";
import { projectDummyFrom } from "./project.entity.dummy";
import type {
  ProjectRepository,
  SaveResult,
  FindByIdResult,
  FindAllResult,
  RemoveResult,
} from "./project.repository";

export type ProjectRepositoryDummyProps = {
  projectIdReturnValue?: string | undefined;
  findByIdReturnValue?: FindByIdResult | undefined;
  findAllReturnValue?: FindAllResult | undefined;
  saveReturnValue?: SaveResult | undefined;
  removeReturnValue?: RemoveResult | undefined;
};

/**
 * ProjectRepositoryのダミー実装
 *
 * テスト用にProjectRepositoryの各メソッドの戻り値を制御できる。
 * コンストラクタでPropsを渡すことで、任意の値を返すようにできる。
 */
export class ProjectRepositoryDummy implements ProjectRepository {
  readonly #projectIdReturnValue: string;

  readonly #findByIdReturnValue: FindByIdResult;

  readonly #findAllReturnValue: FindAllResult;

  readonly #saveReturnValue: SaveResult;

  readonly #removeReturnValue: RemoveResult;

  constructor(props?: ProjectRepositoryDummyProps) {
    this.#projectIdReturnValue = props?.projectIdReturnValue ?? uuid();
    this.#findByIdReturnValue =
      props?.findByIdReturnValue ?? Result.ok(projectDummyFrom());
    this.#findAllReturnValue =
      props?.findAllReturnValue ?? Result.ok([projectDummyFrom()]);
    this.#saveReturnValue = props?.saveReturnValue ?? Result.ok(undefined);
    this.#removeReturnValue = props?.removeReturnValue ?? Result.ok(undefined);
  }

  projectId(): string {
    return this.#projectIdReturnValue;
  }

  findById(_props: { id: string }): Promise<FindByIdResult> {
    return Promise.resolve(this.#findByIdReturnValue);
  }

  findAll(): Promise<FindAllResult> {
    return Promise.resolve(this.#findAllReturnValue);
  }

  save(_props: { project: unknown }): Promise<SaveResult> {
    return Promise.resolve(this.#saveReturnValue);
  }

  remove(_props: { id: string }): Promise<RemoveResult> {
    return Promise.resolve(this.#removeReturnValue);
  }
}
