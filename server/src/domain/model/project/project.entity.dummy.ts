import { Project } from "./project.entity";
import {
  getDummyId,
  getDummyShortText,
  getDummyDescription,
  getDummyRecentDate,
  getDummyProjectColor,
} from "@/util/testing-util/dummy-data";

export type ProjectDummyProps = Partial<{
  id: string;
  name: string;
  description: string | undefined;
  color: string;
  createdAt: string;
  updatedAt: string;
}>;

/**
 * テスト用のダミープロジェクトを生成する
 *
 * @example projectDummyFrom()
 * @example projectDummyFrom({ name: "カスタムプロジェクト" })
 * @example projectDummyFrom({ description: "プロジェクトの説明" })
 */
export const projectDummyFrom = (props?: ProjectDummyProps): Project => {
  const now = getDummyRecentDate();

  return Project.from({
    id: props?.id ?? getDummyId(),
    name: props?.name ?? getDummyShortText(),
    description:
      props !== undefined && "description" in props
        ? props.description
        : getDummyDescription(),
    color: props?.color ?? getDummyProjectColor(),
    createdAt: props?.createdAt ?? now,
    updatedAt: props?.updatedAt ?? now,
  });
};
