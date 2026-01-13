import { fakerJA as faker } from "@faker-js/faker";
import type { TodoPriority } from "@/domain/model/todo/todo.entity";
import { dateToIsoString } from "@/util/date-util";

// Basic data generators
export const getDummyId = () => faker.string.uuid();
export const getDummyEmail = () => faker.internet.email();

// Date generators
export const getDummyFutureDate = () => dateToIsoString(faker.date.future());
export const getDummyRecentDate = () => dateToIsoString(faker.date.recent());

// Content generators
export const getDummyDescription = () => faker.lorem.paragraph();
export const getDummyShortText = () => faker.lorem.words({ min: 1, max: 5 });

export const getDummyTodoPriority = (): TodoPriority =>
  faker.helpers.arrayElement<TodoPriority>(["LOW", "MEDIUM", "HIGH"]);

export const getDummyDueDate = () =>
  faker.helpers.maybe(() => getDummyFutureDate(), { probability: 0.5 });

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
