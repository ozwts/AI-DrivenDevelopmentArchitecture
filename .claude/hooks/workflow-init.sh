#!/bin/bash
# ワークフロー初期化フック
# セッション開始時に、憲法・契約・ワークフロー情報をコンテキストに追加

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# ファイル内容を表示するヘルパー関数（ファイルパス付き）
print_file() {
  local file="$1"
  local relative_path="${file#$PROJECT_DIR/}"
  echo "### $relative_path"
  echo ""
  echo "**File:** \`$file\`"
  echo ""
  cat "$file"
  echo ""
  echo "---"
  echo ""
}

echo "# AI駆動開発 コンテキスト情報"
echo ""

# 0. 既存PRの検出（途中再開セッションの判定）
if gh pr view --json number,title,url 2>/dev/null | grep -q '"number"'; then
  PR_INFO=$(gh pr view --json number,title,url 2>/dev/null)
  PR_NUMBER=$(echo "$PR_INFO" | grep -o '"number":[0-9]*' | grep -o '[0-9]*')
  PR_TITLE=$(echo "$PR_INFO" | grep -o '"title":"[^"]*"' | sed 's/"title":"//;s/"$//')
  PR_URL=$(echo "$PR_INFO" | grep -o '"url":"[^"]*"' | sed 's/"url":"//;s/"$//')

  echo "## ⚠️ 既存PRを検出（途中再開セッション）"
  echo ""
  echo "このブランチには既存のPRがあります。"
  echo ""
  echo "| 項目 | 値 |"
  echo "|------|-----|"
  echo "| PR番号 | #$PR_NUMBER |"
  echo "| タイトル | $PR_TITLE |"
  echo "| URL | $PR_URL |"
  echo ""
  echo "### 再開手順"
  echo ""
  echo "**途中から作業を再開する場合、以下を実行してください:**"
  echo ""
  echo "\`\`\`"
  echo "mcp__guardrails__procedure_workflow(action='restore')"
  echo "\`\`\`"
  echo ""
  echo "これにより \`workflow-restorer\` サブエージェントがPRボディを解析し、"
  echo "Goal・要件・タスク・フェーズ進捗を復元します。"
  echo ""
  echo "---"
  echo ""
fi

# 1. 憲法（Constitution）を読み込み
echo "## 憲法（Constitution）"
echo ""
echo "以下はこのプロジェクトの不変原則です。すべての実装はこれに従う必要があります。"
echo ""

# index.md を最初に読み込む
if [ -f "$PROJECT_DIR/guardrails/constitution/index.md" ]; then
  print_file "$PROJECT_DIR/guardrails/constitution/index.md"
fi

# サブディレクトリの md ファイルを読み込む
find "$PROJECT_DIR/guardrails/constitution" -mindepth 2 -name "*.md" -type f | sort | while read -r file; do
  print_file "$file"
done

# 2. ビジネス契約のみ読み込み（API YAMLはスキップ）
echo "## ビジネス契約（Business Contracts）"
echo ""
echo "以下は既存のビジネス契約です。"
echo ""

find "$PROJECT_DIR/contracts/business" -name "*.md" -type f | sort | while read -r file; do
  print_file "$file"
done

# 3. ワークフロー実行指示
echo "## ワークフロー実行指示"
echo ""
WORKFLOW_FILE="$PROJECT_DIR/guardrails/procedure/workflow/runbooks/20-workflow-start.md"
echo "**File:** \`$WORKFLOW_FILE\`"
echo ""
cat "$WORKFLOW_FILE"
