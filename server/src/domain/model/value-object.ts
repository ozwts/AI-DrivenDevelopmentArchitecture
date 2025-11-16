/**
 * 値オブジェクトの基底インターフェース
 *
 * 値オブジェクトは不変であり、等価性は属性値で判断される
 */
export type ValueObject<T> = {
  /**
   * 別の値オブジェクトと等価であるかを判定する
   *
   * @param other - 比較対象の値オブジェクト
   * @returns 等価である場合はtrue、そうでない場合はfalse
   */
  equals(other: T): boolean;
};
