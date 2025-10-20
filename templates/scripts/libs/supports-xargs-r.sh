#!/usr/bin/env bash

# xargsが-rオプションをサポートしているか判定するヘルパー関数
supports_xargs_r() {

	# xargs -r を実行して利用可否を検証し、標準入出力はすべて破棄
	xargs -r </dev/null >/dev/null 2>&1

}

# EOF