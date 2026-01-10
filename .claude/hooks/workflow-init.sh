#!/bin/bash
# ワークフロー初期化フック
# セッション開始時に、憲法・契約・ワークフロー情報をコンテキストに追加

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

echo "# AI駆動開発 コンテキスト情報"
echo ""

# 1. 憲法（Constitution）を読み込み
echo "## 憲法（Constitution）"
echo ""
echo "以下はこのプロジェクトの不変原則です。すべての実装はこれに従う必要があります。"
echo ""

# index.md を最初に読み込む
if [ -f "$PROJECT_DIR/guardrails/constitution/index.md" ]; then
  echo "### guardrails/constitution/index.md"
  echo ""
  cat "$PROJECT_DIR/guardrails/constitution/index.md"
  echo ""
  echo "---"
  echo ""
fi

# サブディレクトリの md ファイルを読み込む
find "$PROJECT_DIR/guardrails/constitution" -mindepth 2 -name "*.md" -type f | sort | while read -r file; do
  relative_path="${file#$PROJECT_DIR/}"
  echo "### $relative_path"
  echo ""
  cat "$file"
  echo ""
  echo "---"
  echo ""
done

# 2. ビジネス契約のみ読み込み（API YAMLはスキップ）
echo "## ビジネス契約（Business Contracts）"
echo ""
echo "以下は既存のビジネス契約です。"
echo ""

find "$PROJECT_DIR/contracts/business" -name "*.md" -type f | sort | while read -r file; do
  relative_path="${file#$PROJECT_DIR/}"
  echo "### $relative_path"
  echo ""
  cat "$file"
  echo ""
  echo "---"
  echo ""
done

# 3. ワークフロー実行指示
echo "## ワークフロー実行指示"
echo ""
echo "新しい機能実装を開始する場合は、まず以下のツールでタスク計画を立ててください："
echo ""
echo '```'
echo "mcp__guardrails__procedure_workflow(action='plan')"
echo '```'
echo ""
echo "これにより、workflow-plannerサブエージェントがrunbooksを参照してタスクを提案します。"
echo ""
echo "**重要: GoalとタスクリストはユーザーとAIですり合わせてから登録すること。**"
echo ""
echo "1. サブエージェントがGoal + タスクリストを提案"
echo "2. ユーザーに提案内容を提示し、承認・修正を求める"
echo "3. 合意後、以下でタスクを登録（goalは必須）："
echo ""
echo '```'
echo "mcp__guardrails__procedure_workflow(action='set', goal='全体のゴール', tasks=[...])"
echo '```'
