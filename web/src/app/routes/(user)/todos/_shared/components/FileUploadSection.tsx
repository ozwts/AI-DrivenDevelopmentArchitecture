import { useRef } from "react";
import { PaperClipIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button, Alert } from "@/app/lib/ui";
import { formatFileSize } from "@/app/lib/utils";
import { ALLOWED_FILE_TYPES } from "../constants";

type FileUploadSectionProps = {
  readonly selectedFiles: File[];
  readonly onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onFileRemove: (index: number) => void;
  readonly fileError: string;
};

export const FileUploadSection = ({
  selectedFiles,
  onFileSelect,
  onFileRemove,
  fileError,
}: FileUploadSectionProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="space-y-3 pt-2 border-t border-border-light"
      data-testid="file-upload-section"
    >
      <label className="block text-sm font-medium text-text-primary">
        ファイル添付（任意）
      </label>

      {/* ファイル選択ボタン */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_FILE_TYPES.join(",")}
          onChange={onFileSelect}
          className="hidden"
          id="file-upload-todo-form"
          multiple
          data-testid="file-input"
        />
        <label
          htmlFor="file-upload-todo-form"
          className="inline-flex items-center justify-center font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 px-3 py-1.5 text-sm bg-white text-secondary-600 border-2 border-secondary-600 hover:bg-secondary-50 focus:ring-secondary-400 cursor-pointer"
          data-testid="file-select-label"
        >
          <PaperClipIcon className="h-4 w-4 mr-2" />
          ファイルを選択
        </label>
        {selectedFiles.length > 0 && (
          <span
            className="text-sm text-text-secondary"
            data-testid="file-count"
          >
            {selectedFiles.length}個のファイルを選択中
          </span>
        )}
      </div>

      {/* エラーメッセージ */}
      {fileError && <Alert variant="error">{fileError}</Alert>}

      {/* 選択中のファイル一覧 */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 p-3 bg-background-surface rounded-md border border-border-light"
            >
              <PaperClipIcon className="h-4 w-4 text-text-tertiary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {file.name}
                </p>
                <p className="text-xs text-text-tertiary">
                  {formatFileSize(file.size)} • {file.type}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onFileRemove(index);
                }}
                className="!p-2 flex-shrink-0"
                data-testid="remove-file-button"
                aria-label={`${file.name}を削除`}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* ヘルプテキスト */}
      <p className="text-xs text-text-tertiary">
        対応形式: PNG, JPEG, GIF, PDF, Word, Excel, テキスト（最大10MB）
      </p>
    </div>
  );
};
