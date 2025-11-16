import { describe, expect, it } from "vitest";
import { Attachment } from "./attachment";

describe("Attachment", () => {
  describe("constructor", () => {
    it("すべてのプロパティを持つAttachmentインスタンスを作成できる", () => {
      // Arrange & Act
      const attachment = new Attachment({
        id: "attachment-123",
        fileName: "document.pdf",
        storageKey: "attachments/todo-456/attachment-123/document.pdf",
        contentType: "application/pdf",
        fileSize: 102400,
        status: "UPLOADED",
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
      expect(attachment.status).toBe("UPLOADED");
      expect(attachment.uploadedBy).toBe("user-789");
      expect(attachment.createdAt).toBe("2024-01-01T00:00:00.000Z");
      expect(attachment.updatedAt).toBe("2024-01-01T00:01:00.000Z");
    });

    it("statusを省略した場合、デフォルト値のPREPAREDが設定される", () => {
      // Arrange & Act
      const attachment = new Attachment({
        id: "attachment-123",
        fileName: "image.png",
        storageKey: "attachments/todo-456/attachment-123/image.png",
        contentType: "image/png",
        fileSize: 51200,
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(attachment.status).toBe("PREPARED");
    });

    it("PREPARED statusのAttachmentインスタンスを作成できる", () => {
      // Arrange & Act
      const attachment = new Attachment({
        id: "attachment-123",
        fileName: "spreadsheet.xlsx",
        storageKey: "attachments/todo-456/attachment-123/spreadsheet.xlsx",
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileSize: 204800,
        status: "PREPARED",
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Assert
      expect(attachment.status).toBe("PREPARED");
    });
  });

  describe("changeStatus", () => {
    it("ステータスを変更した新しいAttachmentインスタンスを返す", () => {
      // Arrange
      const originalAttachment = new Attachment({
        id: "attachment-123",
        fileName: "report.pdf",
        storageKey: "attachments/todo-456/attachment-123/report.pdf",
        contentType: "application/pdf",
        fileSize: 102400,
        status: "PREPARED",
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedAttachment = originalAttachment.changeStatus(
        "UPLOADED",
        "2024-01-01T00:01:00.000Z",
      );

      // Assert
      expect(updatedAttachment.status).toBe("UPLOADED");
      expect(updatedAttachment.updatedAt).toBe("2024-01-01T00:01:00.000Z");
      expect(updatedAttachment.id).toBe(originalAttachment.id);
      expect(updatedAttachment.fileName).toBe(originalAttachment.fileName);
      expect(updatedAttachment.storageKey).toBe(originalAttachment.storageKey);
      expect(updatedAttachment.contentType).toBe(
        originalAttachment.contentType,
      );
      expect(updatedAttachment.fileSize).toBe(originalAttachment.fileSize);
      expect(updatedAttachment.uploadedBy).toBe(originalAttachment.uploadedBy);
      expect(updatedAttachment.createdAt).toBe(originalAttachment.createdAt);
    });

    it("元のAttachmentインスタンスは変更されない（イミュータブル性）", () => {
      // Arrange
      const originalAttachment = new Attachment({
        id: "attachment-123",
        fileName: "photo.jpg",
        storageKey: "attachments/todo-456/attachment-123/photo.jpg",
        contentType: "image/jpeg",
        fileSize: 512000,
        status: "PREPARED",
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      originalAttachment.changeStatus("UPLOADED", "2024-01-01T00:01:00.000Z");

      // Assert
      expect(originalAttachment.status).toBe("PREPARED");
      expect(originalAttachment.updatedAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("新しいインスタンスと元のインスタンスは異なるオブジェクト", () => {
      // Arrange
      const originalAttachment = new Attachment({
        id: "attachment-123",
        fileName: "notes.txt",
        storageKey: "attachments/todo-456/attachment-123/notes.txt",
        contentType: "text/plain",
        fileSize: 2048,
        status: "PREPARED",
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      });

      // Act
      const updatedAttachment = originalAttachment.changeStatus(
        "UPLOADED",
        "2024-01-01T00:01:00.000Z",
      );

      // Assert
      expect(updatedAttachment).not.toBe(originalAttachment);
    });

    it("UPLOADEDからPREPAREDへのステータス変更も可能", () => {
      // Arrange
      const originalAttachment = new Attachment({
        id: "attachment-123",
        fileName: "video.mp4",
        storageKey: "attachments/todo-456/attachment-123/video.mp4",
        contentType: "video/mp4",
        fileSize: 10485760,
        status: "UPLOADED",
        uploadedBy: "user-789",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:01:00.000Z",
      });

      // Act
      const updatedAttachment = originalAttachment.changeStatus(
        "PREPARED",
        "2024-01-01T00:02:00.000Z",
      );

      // Assert
      expect(updatedAttachment.status).toBe("PREPARED");
      expect(updatedAttachment.updatedAt).toBe("2024-01-01T00:02:00.000Z");
    });
  });
});
