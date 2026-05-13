@echo off
REM LLM Stats Extension 安装脚本

set EXT_DIR=%USERPROFILE%\.pi\agent\extensions\llm-stats

echo 安装 LLM Stats Extension...
if not exist "%EXT_DIR%" mkdir "%EXT_DIR%"
copy /Y index.ts "%EXT_DIR%\index.ts"
copy /Y README.md "%EXT_DIR%\README.md"
echo 安装完成！请重启 pi 或运行 /reload
pause
