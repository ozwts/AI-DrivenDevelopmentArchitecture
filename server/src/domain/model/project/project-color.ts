/* eslint-disable no-use-before-define */
import type { ValueObject } from "../value-object";
import type { Result } from "@/util/result";
import { ValidationError } from "@/util/error-util";

/**
 * プロジェクトカラーを表す値オブジェクト
 *
 * 16進数カラーコード（#RRGGBB形式）を表現する値オブジェクト。
 * 不正な形式のカラーコードは作成時に検証され、Result型でエラーが返される。
 *
 * @example
 * ```typescript
 * const colorResult = ProjectColor.fromString("#FF5733");
 * if (colorResult.success) {
 *   console.log(colorResult.data.value); // "#FF5733"
 * }
 *
 * const invalidResult = ProjectColor.fromString("invalid");
 * // { success: false, error: ValidationError }
 * ```
 */
export class ProjectColor implements ValueObject<ProjectColor> {
  /**
   * カラーコード文字列
   *
   * 16進数カラーコード（#RRGGBB形式）を保持する
   */
  readonly value: string;

  /**
   * プライベートコンストラクタ
   *
   * 外部からの直接のインスタンス化を防ぐため、privateとする。
   * インスタンス生成には静的ファクトリメソッド（fromString）を使用すること。
   *
   * @param value - カラーコード文字列（#RRGGBB形式）
   */
  private constructor(value: string) {
    this.value = value;
  }

  /**
   * 文字列からProjectColorインスタンスを生成する
   *
   * カラーコードの形式を検証し、正しい形式の場合のみインスタンスを返す。
   * 16進数カラーコード（#RRGGBB形式）のみを許可する。
   *
   * @param value - カラーコード文字列
   * @returns 検証結果とProjectColorインスタンス
   *
   * @example
   * ```typescript
   * const result1 = ProjectColor.fromString("#FF5733");
   * // { success: true, data: ProjectColor }
   *
   * const result2 = ProjectColor.fromString("#000");
   * // { success: false, error: ValidationError }
   *
   * const result3 = ProjectColor.fromString("red");
   * // { success: false, error: ValidationError }
   * ```
   */
  static fromString(value: string): Result<ProjectColor, ValidationError> {
    const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

    if (!hexColorPattern.test(value)) {
      return {
        success: false,
        error: new ValidationError(
          `Invalid color format: ${value}. Expected format: #RRGGBB`,
        ),
      };
    }

    return {
      success: true,
      data: new ProjectColor(value),
    };
  }

  /**
   * デフォルトのプロジェクトカラー（ダークブルー）を返す
   *
   * @returns デフォルトのProjectColorインスタンス
   */
  static default(): ProjectColor {
    return new ProjectColor("#001964");
  }

  /**
   * 別のProjectColorと等価であるかを判定する
   *
   * カラーコードの文字列が一致する場合に等価とみなす。
   * 大文字小文字は区別されない。
   *
   * @param other - 比較対象のProjectColor
   * @returns 等価である場合はtrue、そうでない場合はfalse
   *
   * @example
   * ```typescript
   * const color1 = ProjectColor.fromString("#FF5733").data;
   * const color2 = ProjectColor.fromString("#ff5733").data;
   * const color3 = ProjectColor.fromString("#000000").data;
   *
   * color1.equals(color2); // true（大文字小文字を無視）
   * color1.equals(color3); // false
   * ```
   */
  equals(other: ProjectColor): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }

  /**
   * カラーコードを文字列として返す
   *
   * @returns カラーコード文字列（#RRGGBB形式）
   */
  toString(): string {
    return this.value;
  }
}
