import { describe, expect, it } from "vitest";
import { ProjectColor } from "./project-color";
import { ValidationError } from "@/util/error-util";

describe("ProjectColor", () => {
  describe("fromString", () => {
    describe("正常系", () => {
      it("正しい形式のカラーコード（大文字）からProjectColorを作成できる", () => {
        // Act
        const result = ProjectColor.fromString("#FF5733");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.value).toBe("#FF5733");
        }
      });

      it("正しい形式のカラーコード（小文字）からProjectColorを作成できる", () => {
        // Act
        const result = ProjectColor.fromString("#ff5733");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.value).toBe("#ff5733");
        }
      });

      it("正しい形式のカラーコード（混在）からProjectColorを作成できる", () => {
        // Act
        const result = ProjectColor.fromString("#Ff5733");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.value).toBe("#Ff5733");
        }
      });

      it("黒色（#000000）からProjectColorを作成できる", () => {
        // Act
        const result = ProjectColor.fromString("#000000");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.value).toBe("#000000");
        }
      });

      it("白色（#FFFFFF）からProjectColorを作成できる", () => {
        // Act
        const result = ProjectColor.fromString("#FFFFFF");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.value).toBe("#FFFFFF");
        }
      });
    });

    describe("異常系", () => {
      it("#がない場合はValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("FF5733");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain("Invalid color format");
        }
      });

      it("3桁のカラーコードはValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("#FFF");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
          expect(result.error.message).toContain("Invalid color format");
        }
      });

      it("7桁以上のカラーコードはValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("#FF57331");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it("16進数以外の文字を含む場合はValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("#GGGGGG");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it("色名文字列はValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("red");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });

      it("空文字列はValidationErrorを返す", () => {
        // Act
        const result = ProjectColor.fromString("");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(ValidationError);
        }
      });
    });
  });

  describe("default", () => {
    it("デフォルトのカラーコード（#001964）を持つProjectColorを返す", () => {
      // Act
      const color = ProjectColor.default();

      // Assert
      expect(color.value).toBe("#001964");
    });
  });

  describe("equals", () => {
    it("同じカラーコードのProjectColorは等価である", () => {
      // Arrange
      const color1Result = ProjectColor.fromString("#FF5733");
      const color2Result = ProjectColor.fromString("#FF5733");

      // Assert
      expect(color1Result.success).toBe(true);
      expect(color2Result.success).toBe(true);
      if (color1Result.success && color2Result.success) {
        expect(color1Result.data.equals(color2Result.data)).toBe(true);
      }
    });

    it("大文字小文字が異なる同じカラーコードは等価である", () => {
      // Arrange
      const color1Result = ProjectColor.fromString("#FF5733");
      const color2Result = ProjectColor.fromString("#ff5733");

      // Assert
      expect(color1Result.success).toBe(true);
      expect(color2Result.success).toBe(true);
      if (color1Result.success && color2Result.success) {
        expect(color1Result.data.equals(color2Result.data)).toBe(true);
      }
    });

    it("異なるカラーコードのProjectColorは等価でない", () => {
      // Arrange
      const color1Result = ProjectColor.fromString("#FF5733");
      const color2Result = ProjectColor.fromString("#000000");

      // Assert
      expect(color1Result.success).toBe(true);
      expect(color2Result.success).toBe(true);
      if (color1Result.success && color2Result.success) {
        expect(color1Result.data.equals(color2Result.data)).toBe(false);
      }
    });
  });

  describe("toString", () => {
    it("カラーコード文字列を返す", () => {
      // Arrange
      const colorResult = ProjectColor.fromString("#FF5733");

      // Assert
      expect(colorResult.success).toBe(true);
      if (colorResult.success) {
        expect(colorResult.data.toString()).toBe("#FF5733");
      }
    });

    it("デフォルトのカラーコード文字列を返す", () => {
      // Arrange
      const color = ProjectColor.default();

      // Act & Assert
      expect(color.toString()).toBe("#001964");
    });
  });
});
