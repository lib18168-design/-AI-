#!/bin/bash

echo "========================================"
echo "电商视觉AI分析助手 - 本地部署启动器"
echo "========================================"
echo ""
echo "请选择部署模式:"
echo "1. 远程API模式 (默认)"
echo "2. 本地Ollama模式 (需要安装Ollama)"
echo "3. 本地OpenAI兼容API模式"
echo "4. ComfyUI模式"
echo ""

read -p "请输入选项 (1-4): " mode

case $mode in
    1)
        export DEPLOY_MODE="remote"
        echo "启动远程API模式..."
        ;;
    2)
        export DEPLOY_MODE="local_ollama"
        export OLLAMA_URL="http://localhost:11434/api/generate"
        read -p "请输入Ollama模型名 (默认llava:13b): " model
        if [ -z "$model" ]; then
            model="llava:13b"
        fi
        export OLLAMA_MODEL=$model
        echo "启动本地Ollama模式，模型: $OLLAMA_MODEL"
        ;;
    3)
        export DEPLOY_MODE="local_openai"
        read -p "请输入本地API地址 (默认http://localhost:8080/v1/chat/completions): " api_url
        if [ -z "$api_url" ]; then
            api_url="http://localhost:8080/v1/chat/completions"
        fi
        export LOCAL_API_URL=$api_url
        echo "启动本地OpenAI兼容模式"
        ;;
    4)
        export DEPLOY_MODE="comfyui"
        read -p "请输入ComfyUI地址 (默认http://127.0.0.1:8188): " comfyui_url
        if [ -z "$comfyui_url" ]; then
            comfyui_url="http://127.0.0.1:8188"
        fi
        export COMFYUI_URL=$comfyui_url
        echo "启动ComfyUI模式"
        ;;
    *)
        echo "无效选项，使用远程模式"
        export DEPLOY_MODE="remote"
        ;;
esac

echo ""
echo "启动服务器..."
python3 server.py