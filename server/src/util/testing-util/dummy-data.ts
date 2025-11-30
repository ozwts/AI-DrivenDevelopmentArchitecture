import { fakerJA as faker } from "@faker-js/faker";
import type { TodoPriority } from "@/domain/model/todo/todo.entity";

// Basic data generators
export const getDummyId = () => faker.string.uuid();
export const getDummyEmail = () => faker.internet.email();
export const getDummyName = () => faker.person.fullName();
export const getDummyDateTime = (date?: Date): string =>
  (date ?? faker.date.recent()).toISOString();
export const getDummyUrl = (path?: string): string =>
  faker.internet.url() + (path ?? faker.system.filePath());

// Date generators
export const getDummyPastDate = () => faker.date.past().toISOString();
export const getDummyFutureDate = () => faker.date.future().toISOString();
export const getDummyRecentDate = () => faker.date.recent().toISOString();

// Content generators
export const getDummyDescription = () => faker.lorem.paragraph();
export const getDummyShortText = () => faker.lorem.words({ min: 1, max: 5 });
export const getDummyLongText = () => faker.lorem.paragraphs(2, "\n\n");

// TODO-specific generators
export const getDummyTodoId = () => getDummyId();
export const getDummyTodoTitle = () => {
  const prefixes = [
    "実装",
    "修正",
    "調査",
    "レビュー",
    "テスト",
    "ドキュメント作成",
  ];
  const subjects = [
    "ユーザー認証機能",
    "データベース設計",
    "API エンドポイント",
    "フロントエンド",
    "バックエンド",
    "インフラ構成",
  ];
  const prefix = faker.helpers.arrayElement(prefixes);
  const subject = faker.helpers.arrayElement(subjects);
  return `${prefix}: ${subject}`;
};

export const getDummyTodoPriority = (): TodoPriority =>
  faker.helpers.arrayElement<TodoPriority>(["LOW", "MEDIUM", "HIGH"]);

export const getDummyDueDate = () =>
  faker.helpers.maybe(() => getDummyFutureDate(), { probability: 0.5 });

// Project-specific generators
export const getDummyProjectId = () => getDummyId();
export const getDummyProjectName = () => {
  const types = [
    "Webアプリケーション開発",
    "モバイルアプリ開発",
    "データ分析基盤構築",
    "マイクロサービス移行",
    "レガシーシステム刷新",
  ];
  const modifiers = ["新規", "改修", "保守", "運用", "リプレース"];
  const type = faker.helpers.arrayElement(types);
  const modifier = faker.helpers.arrayElement(modifiers);
  return `${modifier} ${type}`;
};

export const getDummyProjectColor = () => {
  const colors = [
    "#FF5733",
    "#3498DB",
    "#2ECC71",
    "#9B59B6",
    "#E74C3C",
    "#F39C12",
    "#1ABC9C",
    "#E91E63",
    "#673AB7",
    "#00BCD4",
    "#4CAF50",
  ];
  return faker.helpers.arrayElement(colors);
};
