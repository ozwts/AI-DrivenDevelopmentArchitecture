#!/bin/bash

if [ "$#" -ne 3 ]; then
  echo "使用方法: source $0 <プロファイル名> <MFAデバイスARN> <MFAコード>"
  echo "例) source tools/get-aws-session-token.sh hands-on arn:aws:iam::123456789012:mfa/username 123456"
  return 1 2>/dev/null || exit 1
fi

# 引数からプロファイル名、MFAデバイスARN、MFAコードを取得
PROFILE_NAME=$1
MFA_DEVICE_ARN=$2
MFA_CODE=$3

# セッショントークンの有効期限を指定（最大12時間 = 43200秒）
DURATION=43200

echo "指定されたMFAデバイスARN: $MFA_DEVICE_ARN"
echo "セッショントークンを取得中..."

SESSION_JSON=$(aws sts get-session-token \
    --serial-number $MFA_DEVICE_ARN \
    --token-code $MFA_CODE \
    --duration-seconds $DURATION \
    --profile $PROFILE_NAME 2>&1)

if echo "$SESSION_JSON" | grep -q '"AccessKeyId":'; then
  export AWS_ACCESS_KEY_ID=$(echo $SESSION_JSON | grep -oP '"AccessKeyId":\s*"\K[^"]+')
  export AWS_SECRET_ACCESS_KEY=$(echo $SESSION_JSON | grep -oP '"SecretAccessKey":\s*"\K[^"]+')
  export AWS_SESSION_TOKEN=$(echo $SESSION_JSON | grep -oP '"SessionToken":\s*"\K[^"]+')
  export AWS_DEFAULT_REGION=ap-northeast-1

  echo "以下の環境変数が設定されました。"
  echo "==============================================================="
  echo "export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
  echo "export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
  echo "export AWS_SESSION_TOKEN=$AWS_SESSION_TOKEN"
  echo "export AWS_DEFAULT_REGION=$AWS_DEFAULT_REGION"
else
  echo "エラー: セッショントークンを取得できませんでした。"
  echo "$SESSION_JSON"
  return 1 2>/dev/null || exit 1
fi
