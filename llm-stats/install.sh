#!/bin/bash
# LLM Stats Extension 安装脚本

EXT_DIR="$HOME/.pi/agent/extensions/llm-stats"
mkdir -p "$EXT_DIR"
cp index.ts "$EXT_DIR/"
cp README.md "$EXT_DIR/"
echo "安装完成！请重启 pi 或运行 /reload"
