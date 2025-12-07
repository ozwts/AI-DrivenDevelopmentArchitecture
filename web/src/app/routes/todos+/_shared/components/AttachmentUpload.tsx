import { useState, useRef } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Alert } from "@/app/lib/ui";
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from "../constants";

type AttachmentUploadProps = {
  readonly onUpload: (file: File) => void;
  readonly isUploading?: boolean;
};

export const AttachmentUpload = ({
  onUpload,
  isUploading = false,
}: AttachmentUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック
    if (file.size > MAX_FILE_SIZE) {
      setError("ファイルサイズは10MB以下にしてください");
      return;
    }

    // ファイルタイプチェック
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError("許可されていないファイル形式です");
      return;
    }

    setError("");
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    onUpload(selectedFile);
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (
      String(Math.round((bytes / Math.pow(k, i)) * 100) / 100) + " " + sizes[i]
    );
  };

  return (
    <div className="space-y-3" data-testid="attachment-upload">
      {/* ファイル選択ボタン */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          id="attachment-upload-input"
          data-testid="attachment-upload-input"
        />
        <label
          htmlFor="attachment-upload-input"
          className="inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 px-3 py-1.5 text-sm bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-50 focus:ring-secondary-400 cursor-pointer"
          data-testid="attachment-upload-label"
        >
          <PaperClipIcon className="h-4 w-4 mr-2" />
          ファイルを選択
        </label>
        {selectedFile && (
          <span className="text-sm text-text-secondary">
            {selectedFile.name} ({formatFileSize(selectedFile.size)})
          </span>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* 選択中のファイル情報とアクション */}
      {selectedFile && !error && (
        <div className="flex items-center gap-2 p-3 bg-background-surface rounded-md border border-border-light">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <PaperClipIcon className="h-4 w-4 text-text-tertiary" />
              <span className="text-sm font-medium text-text-primary">
                {selectedFile.name}
              </span>
            </div>
            <p className="text-xs text-text-tertiary mt-1">
              {formatFileSize(selectedFile.size)} • {selectedFile.type}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? "アップロード中..." : "アップロード"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={isUploading}
              className="!p-2"
            >
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ヘルプテキスト */}
      <p className="text-xs text-text-tertiary">
        対応形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト（最大10MB）
      </p>
    </div>
  );
};
