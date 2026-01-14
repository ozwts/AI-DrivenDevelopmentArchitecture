import { useState, useMemo } from "react";
import { MagnifyingGlassIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { Button, Card, Badge } from "@/app/lib/ui";
import { schemas } from "@/generated/zod-schemas";

type UserResponse = z.infer<typeof schemas.UserResponse>;
type ProjectMembershipResponse = z.infer<
  typeof schemas.ProjectMembershipResponse
>;

type InviteMemberFormProps = {
  readonly searchResults: UserResponse[];
  readonly existingMembers: ProjectMembershipResponse[];
  readonly isSearching: boolean;
  readonly onSearch: (query: string) => void;
  readonly onInvite: (userId: string) => void;
  readonly isInviting: boolean;
};

/**
 * メンバー招待フォームコンポーネント
 * 責務: ユーザー検索と招待アクション
 */
export const InviteMemberForm = ({
  searchResults,
  existingMembers,
  isSearching,
  onSearch,
  onInvite,
  isInviting,
}: InviteMemberFormProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  // 既存メンバーのIDセット（検索結果から除外用）
  const existingMemberIds = useMemo(
    () => new Set(existingMembers.map((m) => m.userId)),
    [existingMembers],
  );

  // 招待可能なユーザー（既存メンバーを除外）
  const invitableUsers = useMemo(
    () => searchResults.filter((user) => !existingMemberIds.has(user.id)),
    [searchResults, existingMemberIds],
  );

  // 既にメンバーのユーザー
  const alreadyMembers = useMemo(
    () => searchResults.filter((user) => existingMemberIds.has(user.id)),
    [searchResults, existingMemberIds],
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  return (
    <Card>
      <Card.Body>
        <h2 className="text-2xl font-semibold text-text-primary mb-6">
          メンバーを招待
        </h2>
        <div className="space-y-4">
          {/* 検索入力 */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="名前またはメールアドレスで検索..."
              className="w-full pl-10 pr-4 py-3 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-secondary-600 focus:border-transparent"
              data-testid="search-input"
            />
          </div>

          {/* 検索中表示 */}
          {isSearching && (
            <div className="text-center py-4 text-text-secondary">
              検索中...
            </div>
          )}

          {/* 検索結果 */}
          {!isSearching && searchQuery.length > 0 && (
            <div className="space-y-6">
              {/* 招待可能なユーザー */}
              {invitableUsers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-text-secondary">
                    招待可能なユーザー
                  </h4>
                  {invitableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg"
                      data-testid={`invitable-user-${user.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* アバター */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-base font-medium text-primary-700">
                            {user.name.charAt(0)}
                          </span>
                        </div>

                        {/* ユーザー情報 */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-text-secondary truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      {/* 招待ボタン */}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          onInvite(user.id);
                        }}
                        disabled={isInviting}
                        aria-label={`${user.name}を招待`}
                      >
                        <UserPlusIcon className="h-4 w-4 mr-1" />
                        招待
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* 既にメンバーのユーザー */}
              {alreadyMembers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-base font-semibold text-text-secondary">
                    既にメンバー
                  </h4>
                  {alreadyMembers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-surface-secondary rounded-lg opacity-60"
                      data-testid={`existing-member-${user.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* アバター */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                          <span className="text-base font-medium text-neutral-600">
                            {user.name.charAt(0)}
                          </span>
                        </div>

                        {/* ユーザー情報 */}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-text-primary truncate">
                            {user.name}
                          </p>
                          <p className="text-sm text-text-secondary truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <Badge variant="default">参加済み</Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* 結果なし */}
              {invitableUsers.length === 0 && alreadyMembers.length === 0 && (
                <div
                  className="text-center py-4 text-text-secondary"
                  data-testid="no-results"
                >
                  該当するユーザーが見つかりません
                </div>
              )}
            </div>
          )}

          {/* 初期状態 */}
          {!isSearching && searchQuery.length === 0 && (
            <div
              className="text-center py-4 text-text-secondary"
              data-testid="initial-state"
            >
              ユーザーを検索して招待できます
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};
