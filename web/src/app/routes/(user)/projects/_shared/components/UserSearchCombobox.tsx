import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { z } from "zod";
import { useSearchUsers } from "@/app/features/user/hooks/useUsers";
import { useDebounce } from "@/app/lib/hooks/useDebounce";
import { LoadingSpinner } from "@/app/lib/ui/leaf/LoadingSpinner";
import { schemas } from "@/generated/zod-schemas";

type SearchUserResponse = z.infer<typeof schemas.SearchUserResponse>;

type UserSearchComboboxProps = {
  readonly onSelect: (user: SearchUserResponse) => void;
  readonly excludeUserIds?: string[];
  readonly placeholder?: string;
  readonly label?: string;
  readonly disabled?: boolean;
};

/**
 * ユーザー検索コンボボックス
 * 名前またはメールアドレスでユーザーを検索し、選択できる
 */
export function UserSearchCombobox({
  onSelect,
  excludeUserIds = [],
  placeholder = "名前またはメールアドレスで検索",
  label,
  disabled = false,
}: UserSearchComboboxProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  // デバウンスされた検索クエリ
  const debouncedQuery = useDebounce(inputValue, 300);

  // ユーザー検索
  const { data: searchResults = [], isLoading } = useSearchUsers(debouncedQuery);

  // 除外ユーザーをフィルタリング
  const filteredResults = searchResults.filter(
    (user) => !excludeUserIds.includes(user.id)
  );

  // 外部クリックでドロップダウンを閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 入力変更時にドロップダウンを開く
  useEffect(() => {
    if (inputValue.length > 0) {
      setIsOpen(true);
    }
  }, [inputValue]);

  // ハイライトされた項目が変わったらスクロール
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const highlightedItem = listboxRef.current.children[
        highlightedIndex
      ] as HTMLElement | undefined;
      if (highlightedItem) {
        highlightedItem.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setHighlightedIndex(-1);
  };

  const handleSelect = (user: SearchUserResponse) => {
    onSelect(user);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredResults.length === 0) {
      if (e.key === "ArrowDown" && inputValue.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredResults.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredResults.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleSelect(filteredResults[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const showDropdown =
    isOpen && inputValue.length > 0 && (isLoading || filteredResults.length > 0);
  const showNoResults =
    isOpen &&
    inputValue.length > 0 &&
    !isLoading &&
    debouncedQuery.length > 0 &&
    filteredResults.length === 0;

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label
          htmlFor="user-search"
          className="block text-sm font-medium text-text-primary mb-1"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id="user-search"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-controls="user-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={
            highlightedIndex >= 0
              ? `user-option-${filteredResults[highlightedIndex]?.id}`
              : undefined
          }
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-border-light rounded-md text-text-primary bg-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-100 disabled:cursor-not-allowed pr-8"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <LoadingSpinner size="sm" />
          </div>
        )}
      </div>

      {/* 検索結果ドロップダウン */}
      {showDropdown && (
        <ul
          ref={listboxRef}
          id="user-search-listbox"
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto bg-white border border-border-light rounded-md shadow-lg"
        >
          {isLoading ? (
            <li className="px-3 py-2 text-text-tertiary text-sm">
              検索中...
            </li>
          ) : (
            filteredResults.map((user, index) => (
              <li
                key={user.id}
                id={`user-option-${user.id}`}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => {
                  handleSelect(user);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
                className={`px-3 py-2 cursor-pointer ${
                  highlightedIndex === index
                    ? "bg-primary-50 text-primary-900"
                    : "text-text-primary hover:bg-neutral-50"
                }`}
              >
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-text-tertiary">{user.email}</div>
              </li>
            ))
          )}
        </ul>
      )}

      {/* 検索結果なし */}
      {showNoResults && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-border-light rounded-md shadow-lg px-3 py-2 text-text-tertiary text-sm">
          該当するユーザーが見つかりませんでした
        </div>
      )}
    </div>
  );
}
