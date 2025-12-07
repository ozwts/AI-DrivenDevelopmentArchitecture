import { Result } from "@/util/result";

/**
 * ユースケースの基底インターフェース
 *
 * @template TInput 入力の型
 * @template TOutput 出力の型
 * @template TException エラーの型
 */
export type UseCase<TInput, TOutput, TException extends Error> = {
  execute(input: TInput): Promise<Result<TOutput, TException>>;
};
