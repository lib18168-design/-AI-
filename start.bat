@echo off
echo ========================================
echo 电商视觉AI分析助手 - 本地部署启动器
echo ========================================
echo.
echo 请选择部署模式:
echo 1. 远程API模式 (默认)
echo 2. 本地Ollama模式 (需要安装Ollama)
echo 3. 本地OpenAI兼容API模式
echo 4. ComfyUI模式
echo.

set /p mode="请输入选项 (1-4): "

if "%mode%"=="1" (
    set DEPLOY_MODE=remote
    echo 启动远程API模式...
) else if "%mode%"=="2" (
    set DEPLOY_MODE=local_ollama
    set OLLAMA_URL=http://localhost:11434/api/generate
    set /p model="请输入Ollama模型名 (默认llava:13b): "
    if "%model%"=="" set model=llava:13b
    set OLLAMA_MODEL=%model%
    echo 启动本地Ollama模式，模型: %OLLAMA_MODEL%
) else if "%mode%"=="3" (
    set DEPLOY_MODE=local_openai
    set /p api_url="请输入本地API地址 (默认http://localhost:8080/v1/chat/completions): "
    if "%api_url%"=="" set api_url=http://localhost:8080/v1/chat/completions
    set LOCAL_API_URL=%api_url%
    echo 启动本地OpenAI兼容模式
) else if "%mode%"=="4" (
    set DEPLOY_MODE=comfyui
    set /p comfyui_url="请输入ComfyUI地址 (默认http://127.0.0.1:8188): "
    if "%comfyui_url%"=="" set comfyui_url=http://127.0.0.1:8188
    set COMFYUI_URL=%comfyui_url%
    echo 启动ComfyUI模式
) else (
    echo 无效选项，使用远程模式
    set DEPLOY_MODE=remote
)

echo.
echo 启动服务器...
python server.py
pause