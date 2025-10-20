#!/usr/bin/env bash

# 指定したポートで待ち受けているプロセスを終了させるユーティリティ関数
kill_port() {

	# 第1引数として渡されたポート番号をローカル変数に格納
	local port="$1"

	# xargs -r が利用可能かどうかで処理を分岐する
	if supports_xargs_r; then

		# 指定ポートのPIDを取得して安全にkillし、失敗してもtrue扱いで継続
		lsof -ti:"${port}" | xargs -r kill || true

	# xargs -r が使えない環境の場合の代替処理
	else

		# PID一覧を保持するためのローカル変数を宣言
		local pids

		# lsofでPIDを収集し、コマンド失敗時は空文字列で処理を継続
		pids="$(lsof -ti:"${port}" || true)"

		# 取得できたPIDが存在する場合にのみkillを呼び出す
		if [[ -n "${pids}" ]]; then
			# 取得したPIDごとにkillを実行
			echo "${pids}" | xargs kill
		fi
	fi

}

# EOF