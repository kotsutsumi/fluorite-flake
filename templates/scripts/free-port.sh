#!/usr/bin/env bash

# このスクリプト全体でエラーの扱いを厳格にするための設定
set -euo pipefail

if [[ "${SKIP_FREE_PORT:-}" == "1" ]]; then
  exit 0
fi

# スクリプトの配置場所からリポジトリのルートパスを算出する
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)" # ルートディレクトリを絶対パスで保持

# ライブラリスクリプト読み込み
source "${ROOT_DIR}/scripts/libs/supports-xargs-r.sh"
source "${ROOT_DIR}/scripts/libs/kill-port.sh"

# アプリケーションごとの監視ポートを連想配列で定義する。値にはスペース区切りで複数ポートを指定できる。
# Bash 3.x 互換のため、連想配列は declare を用いた表記ではなく段階的に初期化する
declare -A APP_PORT_MAP
APP_PORT_MAP["web"]="3000"
APP_PORT_MAP["backend"]="3001"
APP_PORT_MAP["docs"]="3002"

# Expo（Metro）は 8081 / 19000 / 19001 を利用するためまとめて解放しておく
APP_PORT_MAP["mobile"]="8081 19000 19001"

# 連想配列に登録されたエントリを順番に処理する
for app_dir in "${!APP_PORT_MAP[@]}"; do

	# 現在処理中のディレクトリ名を元に絶対パスを組み立てる
	target_path="${ROOT_DIR}/apps/${app_dir}"

	# 対象ディレクトリが存在する場合のみポート解放を行う
	if [[ -d "${target_path}" ]]; then

		# 対象アプリに割り当てたポート番号リストを読み取り順番にkillする
        ports="${APP_PORT_MAP["${app_dir}"]-}"

		if [[ -z "${ports}" ]]; then
			continue
		fi

		for target_port in ${ports}; do
			kill_port "${target_port}"
		done

	fi

done

# EOF
