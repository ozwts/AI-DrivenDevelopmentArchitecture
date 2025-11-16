import { v7 as uuid } from "uuid";
import { projectDummyFrom } from "./project.dummy";
import type {
  ProjectRepository,
  SaveResult,
  FindByIdResult,
  FindAllResult,
  RemoveResult,
} from "./project-repository";

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
    this.#findByIdReturnValue = props?.findByIdReturnValue ?? {
      success: true,
      data: projectDummyFrom(),
    };
    this.#findAllReturnValue = props?.findAllReturnValue ?? {
      success: true,
      data: [projectDummyFrom()],
    };
    this.#saveReturnValue = props?.saveReturnValue ?? {
      success: true,
      data: undefined,
    };
    this.#removeReturnValue = props?.removeReturnValue ?? {
      success: true,
      data: undefined,
    };
  }

  projectId(): string {
    return this.#projectIdReturnValue;
  }

  async findById(_props: { id: string }): Promise<FindByIdResult> {
    return this.#findByIdReturnValue;
  }

  async findAll(): Promise<FindAllResult> {
    return this.#findAllReturnValue;
  }

  async save(_props: { project: unknown }): Promise<SaveResult> {
    return this.#saveReturnValue;
  }

  async remove(_props: { id: string }): Promise<RemoveResult> {
    return this.#removeReturnValue;
  }
}
