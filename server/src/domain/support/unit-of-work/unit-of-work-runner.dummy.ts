/* eslint-disable class-methods-use-this */
import type { UnitOfWorkRunner } from "./unit-of-work-runner";

/**
 * Unit of Work Runner のダミー実装
 *
 * テスト用にUnit of Workの動作をシミュレートする。
 * トランザクション処理を行わず、単にコールバックを実行する。
 *
 * @template TUoW - Unit of Work内で使用可能なリソース（リポジトリなど）の型
 */
export class UnitOfWorkRunnerDummy<TUoW> implements UnitOfWorkRunner<TUoW> {
  readonly #context: TUoW;

  constructor(context: TUoW) {
    this.#context = context;
  }

  async run<TResult>(
    callback: (uow: TUoW) => Promise<TResult>,
  ): Promise<TResult> {
    return callback(this.#context);
  }
}
