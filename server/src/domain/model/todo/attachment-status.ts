import { DomainError } from "../../../util/error-util";
import { Result } from "../../../util/result";
import {
  type ValueObject,
  type ValueObjectConstructor,
  staticImplements,
} from "../value-object";

/**
 * AttachmentStatus Props型
 */
export type AttachmentStatusProps = {
  status: string;
};

/**
 * AttachmentStatus Value Object
 *
 * アップロード処理の進行状況を表すValue Object。
 * 状態遷移ルールを持つため、Value Object化が必須（Tier 1）。
 *
 * - PREPARED: アップロード準備完了（署名付きURL発行済み）
 * - UPLOADED: S3へのアップロード完了
 *
 * 状態遷移ルール:
 * - PREPARED -> UPLOADED: 可能（アップロード完了）
 * - UPLOADED -> PREPARED: 不可（逆方向の遷移は許可しない）
 */
@staticImplements<ValueObjectConstructor<AttachmentStatus>>()
export class AttachmentStatus implements ValueObject<AttachmentStatus> {
  private constructor(private readonly _value: "PREPARED" | "UPLOADED") {}

  /**
   * 準備完了状態を返す
   */
  static prepared(): AttachmentStatus {
    return new AttachmentStatus("PREPARED");
  }

  /**
   * アップロード完了状態を返す
   */
  static uploaded(): AttachmentStatus {
    return new AttachmentStatus("UPLOADED");
  }

  /**
   * 文字列からAttachmentStatusを生成する
   *
   * @param props - AttachmentStatusProps
   * @returns AttachmentStatusまたはDomainError
   */
  static from(props: AttachmentStatusProps): Result<AttachmentStatus, DomainError> {
    const validStatuses = ["PREPARED", "UPLOADED"] as const;
    if (!validStatuses.includes(props.status as typeof validStatuses[number])) {
      return Result.err(
        new DomainError(
          `Invalid AttachmentStatus: ${props.status}. Must be one of: ${validStatuses.join(", ")}`,
        ),
      );
    }

    return Result.ok(new AttachmentStatus(props.status as typeof validStatuses[number]));
  }

  /**
   * ステータスの値を取得
   */
  get value(): "PREPARED" | "UPLOADED" {
    return this._value;
  }

  /**
   * 準備完了状態かどうか
   */
  isPrepared(): boolean {
    return this._value === "PREPARED";
  }

  /**
   * アップロード完了状態かどうか
   */
  isUploaded(): boolean {
    return this._value === "UPLOADED";
  }

  /**
   * 指定されたステータスへの遷移が可能かどうかを判定する
   *
   * @param to - 遷移先のステータス
   * @returns 遷移可能な場合は成功、不可能な場合はDomainError
   */
  canTransitionTo(to: AttachmentStatus): Result<void, DomainError> {
    // PREPARED -> UPLOADED のみ許可
    if (this._value === "PREPARED" && to._value === "UPLOADED") {
      return Result.ok(undefined);
    }

    // 同じステータスへの遷移は許可
    if (this._value === to._value) {
      return Result.ok(undefined);
    }

    // その他の遷移は不可
    return Result.err(
      new DomainError(`Cannot transition from ${this._value} to ${to._value}`),
    );
  }

  /**
   * 値の等価性を判定する
   */
  equals(other: AttachmentStatus): boolean {
    return this._value === other._value;
  }

  /**
   * デバッグ・ログ用の文字列表現を返す
   */
  toString(): string {
    return this._value;
  }
}
