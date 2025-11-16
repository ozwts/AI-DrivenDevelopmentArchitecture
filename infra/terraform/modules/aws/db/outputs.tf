output "table_names" {
  description = "DynamoDBテーブル名のマップ"
  value = {
    for key, table in aws_dynamodb_table.tables : key => table.name
  }
}

output "table_arns" {
  description = "DynamoDBテーブルのARNのマップ"
  value = {
    for key, table in aws_dynamodb_table.tables : key => table.arn
  }
}

output "all_table_arns" {
  description = "すべてのDynamoDBテーブルのARNリスト"
  value       = [for table in aws_dynamodb_table.tables : table.arn]
}

output "app_env_vars" {
  description = "アプリケーション環境変数用のテーブル名マップ（環境変数名 => テーブル名）"
  value = {
    for key, def in local.table_definitions :
    def.env_var_name => aws_dynamodb_table.tables[key].name
  }
}
