这是一个半成品，可能有不足和不满意的，如不满足您的需求，请自行完成API的接入

# 南秋北 · 电商视觉AI分析专家

一个基于 Flask 的电商产品图片 AI 分析工具，支持多图分别分析、文生图（异步 API）、历史记录、风格市场等。

## 功能特性

- **图片分析**：上传 1-5 张图片，AI 分析卖点、模特、场景、构图配色等，每张图片独立卡片，支持重试、下载报告。
- **文生图**：输入文字描述 + 可选参考图，异步生成产品图片（使用 wuyinkeji API）。
- **风格市场**：24 种预设风格，点击自动填充提示词。
- **历史记录**：保存最近分析结果，支持导出 JSON、单条删除、清空。
- **最近生成**：保存最近 8 张生成图片缩略图。
- **响应式界面**：适配 PC 与手机。

## 技术栈

- 后端：Flask, Pillow, requests
- 前端：TailwindCSS, 原生 JavaScript, marked.js
- 存储：localStorage（历史记录、最近生成）

## 环境要求

- Python 3.8+
- 依赖：见 `requirements.txt`

python -m venv venv
source venv/bin/activate   # Linux/Mac
venv\Scripts\activate      # Windows

## 安装与运行
python server.py

访问 http://127.0.0.1:5002

1. 克隆仓库：
   ```bash
   git clone https://github.com/你的用户名/AI-Shop-Tool.git
   cd AI-Shop-Tool
