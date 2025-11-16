##################################################
# DynamoDB Tables
##################################################
resource "aws_dynamodb_table" "tables" {
  for_each = local.table_definitions

  name                        = "${var.aws_project_prefix}-${each.key}"
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = each.value.hash_key
  range_key                   = each.value.range_key
  deletion_protection_enabled = var.deletion_protection_enabled

  # 属性定義
  dynamic "attribute" {
    for_each = each.value.attributes
    content {
      name = attribute.value.name
      type = attribute.value.type
    }
  }

  # グローバルセカンダリインデックス
  dynamic "global_secondary_index" {
    for_each = each.value.global_secondary_indexes
    content {
      name               = global_secondary_index.value.name
      hash_key           = global_secondary_index.value.hash_key
      range_key          = lookup(global_secondary_index.value, "range_key", null)
      projection_type    = global_secondary_index.value.projection_type
      non_key_attributes = lookup(global_secondary_index.value, "non_key_attributes", null)
    }
  }

  # ポイントインタイムリカバリ
  point_in_time_recovery {
    enabled = var.point_in_time_recovery
  }

  # サーバーサイド暗号化
  server_side_encryption {
    enabled = var.server_side_encryption
  }

  tags = {
    Environment = var.environment
    Name        = "${var.aws_project_prefix}-${each.key}"
    Service     = "database"
    Type        = "dynamodb"
  }
}
