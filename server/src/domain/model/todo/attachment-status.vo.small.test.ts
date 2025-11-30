import { describe, expect, it } from "vitest";
import { AttachmentStatus } from "./attachment-status.vo";
import { DomainError } from "@/util/error-util";

describe("AttachmentStatus", () => {
  describe("from", () => {
    it("有効なステータス文字列からAttachmentStatusを生成できる（PREPARED）", () => {
      // Act
      const result = AttachmentStatus.from({ status: "PREPARED" });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe("PREPARED");
    });

    it("有効なステータス文字列からAttachmentStatusを生成できる（UPLOADED）", () => {
      // Act
      const result = AttachmentStatus.from({ status: "UPLOADED" });

      // Assert
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe("UPLOADED");
    });

    it("無効なステータス文字列の場合はDomainErrorを返す", () => {
      // Act
      const result = AttachmentStatus.from({ status: "INVALID" });

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.message).toContain("Invalid AttachmentStatus");
    });
  });

  describe("静的ファクトリメソッド", () => {
    it("prepared()でPREPARED状態のAttachmentStatusを生成できる", () => {
      // Act
      const status = AttachmentStatus.prepared();

      // Assert
      expect(status.status).toBe("PREPARED");
      expect(status.isPrepared()).toBe(true);
      expect(status.isUploaded()).toBe(false);
    });

    it("uploaded()でUPLOADED状態のAttachmentStatusを生成できる", () => {
      // Act
      const status = AttachmentStatus.uploaded();

      // Assert
      expect(status.status).toBe("UPLOADED");
      expect(status.isUploaded()).toBe(true);
      expect(status.isPrepared()).toBe(false);
    });
  });

  describe("canTransitionTo", () => {
    it("PREPARED -> UPLOADEDへの遷移が可能", () => {
      // Arrange
      const prepared = AttachmentStatus.prepared();
      const uploaded = AttachmentStatus.uploaded();

      // Act
      const result = prepared.canTransitionTo(uploaded);

      // Assert
      expect(result.success).toBe(true);
    });

    it("UPLOADED -> PREPAREDへの遷移は不可", () => {
      // Arrange
      const uploaded = AttachmentStatus.uploaded();
      const prepared = AttachmentStatus.prepared();

      // Act
      const result = uploaded.canTransitionTo(prepared);

      // Assert
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error).toBeInstanceOf(DomainError);
      expect(result.error.message).toContain(
        "Cannot transition from UPLOADED to PREPARED",
      );
    });

    it("同じステータスへの遷移は許可される（PREPARED -> PREPARED）", () => {
      // Arrange
      const prepared1 = AttachmentStatus.prepared();
      const prepared2 = AttachmentStatus.prepared();

      // Act
      const result = prepared1.canTransitionTo(prepared2);

      // Assert
      expect(result.success).toBe(true);
    });

    it("同じステータスへの遷移は許可される（UPLOADED -> UPLOADED）", () => {
      // Arrange
      const uploaded1 = AttachmentStatus.uploaded();
      const uploaded2 = AttachmentStatus.uploaded();

      // Act
      const result = uploaded1.canTransitionTo(uploaded2);

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe("equals", () => {
    it("同じステータス値を持つAttachmentStatusは等しい（PREPARED）", () => {
      // Arrange
      const status1 = AttachmentStatus.prepared();
      const status2 = AttachmentStatus.prepared();

      // Act & Assert
      expect(status1.equals(status2)).toBe(true);
    });

    it("同じステータス値を持つAttachmentStatusは等しい（UPLOADED）", () => {
      // Arrange
      const status1 = AttachmentStatus.uploaded();
      const status2 = AttachmentStatus.uploaded();

      // Act & Assert
      expect(status1.equals(status2)).toBe(true);
    });

    it("異なるステータス値を持つAttachmentStatusは等しくない", () => {
      // Arrange
      const prepared = AttachmentStatus.prepared();
      const uploaded = AttachmentStatus.uploaded();

      // Act & Assert
      expect(prepared.equals(uploaded)).toBe(false);
      expect(uploaded.equals(prepared)).toBe(false);
    });
  });

  describe("toString", () => {
    it("PREPARED状態の文字列表現を返す", () => {
      // Arrange
      const status = AttachmentStatus.prepared();

      // Act
      const result = status.toString();

      // Assert
      expect(result).toBe("PREPARED");
    });

    it("UPLOADED状態の文字列表現を返す", () => {
      // Arrange
      const status = AttachmentStatus.uploaded();

      // Act
      const result = status.toString();

      // Assert
      expect(result).toBe("UPLOADED");
    });
  });

  describe("ヘルパーメソッド", () => {
    it("isPrepared()はPREPARED状態の場合にtrueを返す", () => {
      // Arrange
      const prepared = AttachmentStatus.prepared();
      const uploaded = AttachmentStatus.uploaded();

      // Assert
      expect(prepared.isPrepared()).toBe(true);
      expect(uploaded.isPrepared()).toBe(false);
    });

    it("isUploaded()はUPLOADED状態の場合にtrueを返す", () => {
      // Arrange
      const prepared = AttachmentStatus.prepared();
      const uploaded = AttachmentStatus.uploaded();

      // Assert
      expect(prepared.isUploaded()).toBe(false);
      expect(uploaded.isUploaded()).toBe(true);
    });
  });
});
