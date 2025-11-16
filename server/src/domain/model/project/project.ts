import type { ProjectColor } from "./project-color";

/**
 * プロジェクトエンティティ
 *
 * TODOをグループ化して管理するためのプロジェクトを表すドメインエンティティ。
 * プロジェクトは名前、説明、カラーコードを持ち、複数のTODOと関連付けられる。
 *
 * @example
 * ```typescript
 * // プロジェクトの作成
 * const colorResult = ProjectColor.fromString("#FF5733");
 * if (!colorResult.success) {
 *   throw colorResult.error;
 * }
 *
 * const project = new Project({
 *   id: "project-123",
 *   name: "新規プロジェクト",
 *   description: "プロジェクトの説明",
 *   color: colorResult.data,
 *   createdAt: "2024-01-01T00:00:00.000Z",
 *   updatedAt: "2024-01-01T00:00:00.000Z"
 * });
 *
 * // プロジェクトの更新（新しいインスタンスを生成）
 * const updated = project.update({
 *   name: "更新されたプロジェクト",
 *   updatedAt: "2024-01-02T00:00:00.000Z"
 * });
 * ```
 */
export class Project {
  /**
   * プロジェクトID
   *
   * プロジェクトを一意に識別するID。
   * リポジトリの実装によって生成される。
   */
  readonly id: string;

  /**
   * プロジェクト名
   *
   * プロジェクトの表示名。
   * 必須項目。
   */
  readonly name: string;

  /**
   * プロジェクト説明
   *
   * プロジェクトの詳細説明。
   * オプション項目。
   */
  readonly description: string | undefined;

  /**
   * プロジェクトカラー
   *
   * プロジェクトを視覚的に識別するためのカラーコード。
   * ProjectColor値オブジェクトとして管理され、16進数カラーコード（#RRGGBB形式）であることが保証される。
   */
  readonly color: ProjectColor;

  /**
   * 作成日時
   *
   * プロジェクトが作成された日時（ISO 8601形式）。
   * 一度設定されると変更されない。
   */
  readonly createdAt: string;

  /**
   * 更新日時
   *
   * プロジェクトが最後に更新された日時（ISO 8601形式）。
   * プロジェクト情報が更新されるたびに更新される。
   */
  readonly updatedAt: string;

  /**
   * コンストラクタ
   *
   * @param props - プロジェクトのプロパティ
   * @param props.id - プロジェクトID
   * @param props.name - プロジェクト名
   * @param props.description - プロジェクト説明（オプション）
   * @param props.color - プロジェクトカラー（ProjectColor値オブジェクト）
   * @param props.createdAt - 作成日時（ISO 8601形式）
   * @param props.updatedAt - 更新日時（ISO 8601形式）
   */
  constructor(props: {
    id: string;
    name: string;
    description?: string;
    color: ProjectColor;
    createdAt: string;
    updatedAt: string;
  }) {
    this.id = props.id;
    this.name = props.name;
    this.description = props.description;
    this.color = props.color;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * プロジェクト情報を更新して新しいProjectインスタンスを返す
   *
   * エンティティの不変性を保つため、元のインスタンスは変更せず、
   * 新しいインスタンスを生成して返す。
   *
   * @param props - 更新するプロパティ
   * @param props.name - 新しいプロジェクト名（オプション）
   * @param props.description - 新しいプロジェクト説明（オプション）
   * @param props.color - 新しいプロジェクトカラー（オプション）
   * @param props.updatedAt - 更新日時（必須）
   * @returns 更新された新しいProjectインスタンス
   *
   * @example
   * ```typescript
   * const updated = project.update({
   *   name: "新しい名前",
   *   updatedAt: "2024-01-02T00:00:00.000Z"
   * });
   * ```
   */
  update(props: {
    name?: string;
    description?: string;
    color?: ProjectColor;
    updatedAt: string;
  }): Project {
    return new Project({
      id: this.id,
      name: props.name ?? this.name,
      description: props.description ?? this.description,
      color: props.color ?? this.color,
      createdAt: this.createdAt,
      updatedAt: props.updatedAt,
    });
  }
}
