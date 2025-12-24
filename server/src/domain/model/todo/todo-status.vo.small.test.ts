import { describe, expect, it } from "vitest";
import { TodoStatus } from "./todo-status.vo";
import { DomainError } from "../../../util/error-util";

describe("TodoStatus", () => {
  describe("from", () => {
    describe("正常系", () => {
      it("有効な値からValue Objectを作成できる", () => {
        // Act
        const result = TodoStatus.from({ status: "TODO" });

        // Assert
        expect(result.isOk()).toBe(true);
        if (result.isErr()) return;
        expect(result.data.isTodo()).toBe(true);
      });

      it("すべての有効なステータスから作成できる", () => {
        const todoResult = TodoStatus.from({ status: "TODO" });
        const inProgressResult = TodoStatus.from({ status: "IN_PROGRESS" });
        const completedResult = TodoStatus.from({ status: "COMPLETED" });

        expect(todoResult.isOk()).toBe(true);
        expect(inProgressResult.isOk()).toBe(true);
        expect(completedResult.isOk()).toBe(true);
      });
    });

    describe("異常系", () => {
      it("無効なステータス文字列の場合DomainErrorを返す", () => {
        // Act
        const result = TodoStatus.from({ status: "INVALID_STATUS" });

        // Assert
        expect(result.isErr()).toBe(true);
        if (result.isOk()) return;
        expect(result.error).toBeInstanceOf(DomainError);
      });

      it("空文字列の場合DomainErrorを返す", () => {
        const result = TodoStatus.from({ status: "" });

        expect(result.isErr()).toBe(true);
        if (result.isOk()) return;
        expect(result.error).toBeInstanceOf(DomainError);
      });
    });
  });

  describe("静的ファクトリメソッド", () => {
    it("todo()でTODOステータスを作成できる", () => {
      const status = TodoStatus.todo();

      expect(status.status).toBe("TODO");
      expect(status.isTodo()).toBe(true);
    });

    it("inProgress()でIN_PROGRESSステータスを作成できる", () => {
      const status = TodoStatus.inProgress();

      expect(status.status).toBe("IN_PROGRESS");
      expect(status.isInProgress()).toBe(true);
    });

    it("completed()でCOMPLETEDステータスを作成できる", () => {
      const status = TodoStatus.completed();

      expect(status.status).toBe("COMPLETED");
      expect(status.isCompleted()).toBe(true);
    });
  });

  describe("equals", () => {
    it("同じ値のValue Objectは等価である", () => {
      const status1 = TodoStatus.todo();
      const status2 = TodoStatus.todo();

      expect(status1.equals(status2)).toBe(true);
    });

    it("from()で生成した同じステータスは等価である", () => {
      const result1 = TodoStatus.from({ status: "TODO" });
      const result2 = TodoStatus.from({ status: "TODO" });

      expect(result1.isOk()).toBe(true);
      expect(result2.isOk()).toBe(true);
      if (result1.isErr() || result2.isErr()) return;
      expect(result1.data.equals(result2.data)).toBe(true);
    });

    it("異なる値のValue Objectは等価でない", () => {
      const todo = TodoStatus.todo();
      const completed = TodoStatus.completed();

      expect(todo.equals(completed)).toBe(false);
    });
  });

  describe("toString", () => {
    it("ステータスの文字列表現を返す", () => {
      expect(TodoStatus.todo().toString()).toBe("TODO");
      expect(TodoStatus.inProgress().toString()).toBe("IN_PROGRESS");
      expect(TodoStatus.completed().toString()).toBe("COMPLETED");
    });
  });

  describe("ヘルパーメソッド", () => {
    it("isTodo()はTODOステータスの場合のみtrueを返す", () => {
      expect(TodoStatus.todo().isTodo()).toBe(true);
      expect(TodoStatus.inProgress().isTodo()).toBe(false);
      expect(TodoStatus.completed().isTodo()).toBe(false);
    });

    it("isInProgress()はIN_PROGRESSステータスの場合のみtrueを返す", () => {
      expect(TodoStatus.todo().isInProgress()).toBe(false);
      expect(TodoStatus.inProgress().isInProgress()).toBe(true);
      expect(TodoStatus.completed().isInProgress()).toBe(false);
    });

    it("isCompleted()はCOMPLETEDステータスの場合のみtrueを返す", () => {
      expect(TodoStatus.todo().isCompleted()).toBe(false);
      expect(TodoStatus.inProgress().isCompleted()).toBe(false);
      expect(TodoStatus.completed().isCompleted()).toBe(true);
    });
  });
});
