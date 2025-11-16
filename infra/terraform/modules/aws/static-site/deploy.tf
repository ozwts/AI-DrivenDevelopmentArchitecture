##################################################
# 静的ファイルの自動デプロイ
##################################################

# ファイル内容の安定したハッシュを生成
locals {
  # ビルド時に毎回変わるファイルを除外
  # React/Vite の場合、index.html は通常変わらないが、
  # ハッシュ付きアセットファイル名の参照が含まれるため除外しない
  exclude_files = []

  # ファイルパスとMD5ハッシュのマップを作成（除外ファイルを除く）
  file_hashes = var.auto_deploy_enabled && var.deploy_source_dir != "" ? {
    for f in fileset(var.deploy_source_dir, "**") :
    f => filemd5("${var.deploy_source_dir}/${f}")
    if !contains(local.exclude_files, f)
  } : {}

  # jsonencodeでキーをソートし、安定したハッシュを生成
  content_hash = var.auto_deploy_enabled && var.deploy_source_dir != "" ? md5(jsonencode(local.file_hashes)) : ""
}

# S3 syncでファイルをデプロイ
resource "null_resource" "s3_sync" {
  count = var.auto_deploy_enabled && var.deploy_source_dir != "" ? 1 : 0

  # ファイル内容のハッシュで変更検知（jsonencodeは自動的にキーをソート）
  triggers = {
    content_hash = local.content_hash
  }

  # aws s3 sync で --delete オプションを使用
  provisioner "local-exec" {
    command = "aws s3 sync ${var.deploy_source_dir}/ s3://${aws_s3_bucket.static_site.id}/ --delete"
  }

  provisioner "local-exec" {
    command = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.static_site.id} --paths '/*'"
  }

  depends_on = [
    aws_s3_bucket.static_site,
    aws_cloudfront_distribution.static_site
  ]
}
