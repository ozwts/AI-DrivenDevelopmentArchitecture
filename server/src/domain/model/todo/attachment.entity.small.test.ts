import { describe, expect, it } from "vitest";
import { AttachmentStatus } from "./attachment-status.vo";
import { attachmentDummyFrom } from "./attachment.entity.dummy";
import { attachmentStatusDummyFrom } from "./attachment-status.vo.dummy";

describe("Attachment", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つAttachmentインスタンスを作成できる", () => {
      // Arrange & Act
      const attachment = attachmentDummyFrom({
        id: "attachment-123",
        fileName: "document.pdf",
        storageKey: "attachments/todo-456/attachment-123/document.pdf",
        contentType: "application/pdf",
        fileSize: 102400,
        status: AttachmentStatus.uploaded(),
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:01:00.000Z",
      });

      // Assert
      expect(attachment.id).toBe("attachment-123");
      expect(attachment.fileName).toBe("document.pdf");
      expect(attachment.storageKey).toBe(
        "attachments/todo-456/attachment-123/document.pdf",
      );
      expect(attachment.contentType).toBe("application/pdf");
      expect(attachment.fileSize).toBe(102400);
      expect(attachment.status.status).toBe("UPLOADED");
      expect(attachment.uploadedBy).toBe("user-789");
      expect(attachment.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(attachment.updatedAt).toBe("2024-01-01T00:01:00.000Z");
    });

    it("PREPARED statusのAttachmentインスタンスを作成できる", () => {
      // Arrange & Act
      const attachment = attachmentDummyFrom({
        status: AttachmentStatus.prepared(),
      });

      // Assert
      expect(attachment.status.status).toBe("PREPARED");
    });
  });

  describe("markAsUploaded", () => {
    it("ステータスをUPLOADEDに変更した新しいAttachmentインスタンスを返す", () => {
      // Arrange
      const originalAttachment = attachmentDummyFrom({
        status: AttachmentStatus.prepared(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedAttachment = originalAttachment.markAsUploaded(
        "2024-01-01T00:01:00.000Z",
      );

      // Assert
      expect(updatedAttachment.status.status).toBe("UPLOADED");
      expect(updatedAttachment.updatedAt).toBe("2024-01-01T00:01:00.000Z");
      expect(updatedAttachment.id).toBe(originalAttachment.id);
      expect(updatedAttachment.fileName).toBe(originalAttachment.fileName);
      expect(updatedAttachment.storageKey).toBe(originalAttachment.storageKey);
      expect(updatedAttachment.contentType).toBe(originalAttachment.contentType);
      expect(updatedAttachment.fileSize).toBe(originalAttachment.fileSize);
      expect(updatedAttachment.uploadedBy).toBe(originalAttachment.uploadedBy);
      expect(updatedAttachment.createdAt).toBe(originalAttachment.createdAt);
    });

    it("元のAttachmentインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalAttachment = attachmentDummyFrom({
        status: AttachmentStatus.prepared(),
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalAttachment.markAsUploaded("2024-01-01T00:01:00.000Z");

      // Assert
      expect(originalAttachment.status.status).toBe("PREPARED");
      expect(originalAttachment.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalAttachment = attachmentDummyFrom();

      // Act
      const updatedAttachment = originalAttachment.markAsUploaded(
        "2024-01-01T00:01:00.000Z",
      );

      // Assert
      expect(updatedAttachment).not.toBe(originalAttachment);
    });
  });
});
