# -*- coding: utf-8 -*-
"""
server.py - 电商视觉AI分析助手
支持：
  1. 图片分析（多图、自定义提示词）→ 使用中转 API
  2. 文生图（异步）→ 提交任务 + 轮询结果（wuyinkeji API）
"""

import json
import base64
import io
import time
import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import requests
from PIL import Image

# ================= 配置区 =================

# 图片分析 API
API_KEY = os.environ.get("API_KEY", "")
ANALYZE_URL = "https://api.apimart.ai/v1/chat/completions"
DEFAULT_MODEL = "gpt-5.4"

# 文生图 API（wuyinkeji）
WUYIN_BASE_URL = "https://api.wuyinkeji.com/api/async"
WUYIN_API_KEY = os.environ.get("WUYIN_API_KEY", "")  # 请确保与提交时使用的 Key 一致
DEFAULT_SIZE = "16:9"   # 可选比例：1:1, 16:9, 9:16, auto 等

app = Flask(__name__)
CORS(app)

# ================= 图片分析相关函数 =================

def image_to_base64(image_stream):
    try:
        image_stream.seek(0)
        img = Image.open(image_stream)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        max_size = 800
        img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG", quality=75, optimize=True)
        img_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        print(f"✅ 图片转换成功，Base64长度: {len(img_base64)}")
        return f"data:image/jpeg;base64,{img_base64}"
    except Exception as e:
        print(f"❌ 图片转换失败: {e}")
        import traceback
        traceback.print_exc()
        return None

def call_analyze_api(payload, max_retries=3):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    for attempt in range(max_retries):
        try:
            print(f"🚀 请求图片分析 API (第 {attempt+1}/{max_retries} 次)...")
            response = requests.post(ANALYZE_URL, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                content = response.json()['choices'][0]['message']['content']
                print(f"✅ 分析成功，内容长度: {len(content)}")
                return content
            else:
                print(f"❌ API 错误: {response.status_code} - {response.text}")
                if response.status_code in [429, 503, 500, 502]:
                    wait_time = 2 ** attempt
                    print(f"⚠️ {wait_time}秒后重试...")
                    time.sleep(wait_time)
                    continue
                else:
                    return f"API Error: {response.status_code} - {response.text}"
        except Exception as e:
            print(f"⚠️ 请求异常: {e}")
            if attempt < max_retries - 1:
                time.sleep(2)
            else:
                return f"请求失败: {str(e)}"
    return "请求失败：达到最大重试次数"

# ================= 文生图功能（异步，wuyinkeji） =================

def submit_image_task(prompt, size=DEFAULT_SIZE):
    """提交文生图任务，返回 task_id"""
    submit_url = f"{WUYIN_BASE_URL}/image_gpt"
    params = {"key": WUYIN_API_KEY}
    headers = {
        "Content-Type": "application/json",
        "Authorization": WUYIN_API_KEY
    }
    payload = {"prompt": prompt, "size": size}
    try:
        print(f"🎨 提交文生图任务: {prompt[:50]}...")
        resp = requests.post(submit_url, params=params, headers=headers, json=payload, timeout=30)
        if resp.status_code != 200:
            raise Exception(f"提交失败 HTTP {resp.status_code}: {resp.text[:200]}")
        data = resp.json()
        if data.get('code') != 200:
            raise Exception(f"提交响应错误: {data}")
        task_id = data['data'].get('id')
        if not task_id:
            raise Exception(f"响应中未找到任务ID: {data}")
        print(f"✅ 任务提交成功，task_id: {task_id}")
        return task_id
    except Exception as e:
        raise Exception(f"提交任务失败: {e}")

def query_task_result(task_id, max_wait=180, poll_interval=3):
    """
    轮询查询任务结果，返回图片二进制数据
    """
    query_url = f"{WUYIN_BASE_URL}/detail"
    params = {"key": WUYIN_API_KEY, "id": task_id}
    headers = {"Authorization": WUYIN_API_KEY}
    start_time = time.time()

    while time.time() - start_time < max_wait:
        try:
            elapsed = int(time.time() - start_time)
            print(f"⏳ 正在查询任务状态 (task_id: {task_id}, 已等待 {elapsed} 秒)...")

            response = requests.get(query_url, params=params, headers=headers, timeout=10)

            # 1. 检查 HTTP 状态码
            if response.status_code != 200:
                print(f"⚠️ HTTP 请求失败 (状态码: {response.status_code})，将在 {poll_interval} 秒后重试。")
                time.sleep(poll_interval)
                continue

            # 2. 解析 JSON 响应
            resp_data = response.json()
            print(f"📡 完整 API 响应: {resp_data}")

            # 3. 检查 API 业务状态码
            if resp_data.get('code') != 200:
                print(f"⚠️ API 业务错误 (code: {resp_data.get('code')}, msg: {resp_data.get('msg')})，将在 {poll_interval} 秒后重试。")
                time.sleep(poll_interval)
                continue

            # 4. 从 data 字段中提取关键信息
            inner_data = resp_data.get('data', {})
            task_status = inner_data.get('status')

            # 5. 根据任务状态进行不同处理
            if task_status == 2:  # 任务成功
                image_urls = inner_data.get('result', [])
                if not image_urls:
                    raise Exception("查询成功，但返回的图片列表为空。")
                image_url = image_urls[0]
                print(f"✅ 任务成功，正在下载图片: {image_url}")

                img_response = requests.get(image_url, timeout=30)
                if img_response.status_code == 200:
                    return img_response.content
                else:
                    raise Exception(f"图片下载失败 (HTTP {img_response.status_code})")
            elif task_status == 3:  # 任务失败
                error_msg = inner_data.get('message', '未知错误')
                raise Exception(f"生成任务失败，原因: {error_msg}")
            else:
                # 其他状态 (如 1=处理中)
                print(f"⏳ 任务状态为 {task_status} (大概率正在处理中)，将在 {poll_interval} 秒后继续轮询...")
                time.sleep(poll_interval)

        except requests.exceptions.RequestException as e:
            print(f"⚠️ 网络请求异常: {e}，将在 {poll_interval} 秒后重试...")
            time.sleep(poll_interval)
        except Exception as e:
            print(f"⚠️ 处理响应时发生未知错误: {e}，将在 {poll_interval} 秒后重试...")
            time.sleep(poll_interval)

    raise Exception(f"轮询超时，在 {max_wait} 秒内未能获取到图片。")

def generate_image_with_wuyin(prompt, size=DEFAULT_SIZE):
    """文生图完整流程：提交 → 轮询 → 返回图片二进制数据"""
    task_id = submit_image_task(prompt, size)
    image_bytes = query_task_result(task_id)
    return image_bytes

# ================= 路由 =================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    print("📥 收到分析请求")
    uploaded_files = request.files.getlist('images')
    user_prompt = request.form.get('prompt', '')
    if (not uploaded_files or len(uploaded_files) == 0) and not user_prompt:
        return jsonify({"code": 400, "msg": "请提供图片或分析指令"}), 400

    try:
        content_payload = []
        if not user_prompt:
            user_prompt = "请分析这张电商产品的视觉特征，包括构图、配色、卖点，并给出优化建议。"
        content_payload.append({"type": "text", "text": user_prompt})

        if uploaded_files:
            print(f"🖼️ 处理 {len(uploaded_files)} 张图片...")
            success_count = 0
            for file in uploaded_files:
                if file.filename == '':
                    continue
                data_url = image_to_base64(file.stream)
                if data_url:
                    content_payload.append({
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    })
                    success_count += 1
                    print(f"✅ {file.filename} 已加入请求")
                else:
                    print(f"❌ 图片处理失败: {file.filename}")
            if success_count == 0 and uploaded_files:
                return jsonify({"code": 400, "msg": "所有图片处理失败，请检查图片格式"}), 400

        selected_model = request.form.get('model', '')
        if not selected_model:
            selected_model = DEFAULT_MODEL
        print(f"🤖 使用模型: {selected_model}")

        payload = {
            "model": selected_model,
            "messages": [{"role": "user", "content": content_payload}],
            "max_tokens": 2000
        }
        result_text = call_analyze_api(payload)
        if any(result_text.startswith(x) for x in ["API Error", "连接失败", "请求异常", "请求失败"]):
            return jsonify({"code": 500, "msg": result_text}), 500
        return jsonify({"code": 0, "msg": "成功", "data": {"result": result_text}})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "msg": f"服务器错误: {str(e)}"}), 500

@app.route('/api/generate_image', methods=['POST'])
def generate_image():
    data = request.get_json()
    prompt = data.get('prompt', '')
    if not prompt:
        return jsonify({"code": 400, "msg": "提示词不能为空"}), 400
    size = data.get('size', DEFAULT_SIZE)
    try:
        image_bytes = generate_image_with_wuyin(prompt, size)
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        return jsonify({"code": 0, "msg": "成功", "data": {"image": image_base64}})
    except Exception as e:
        print(f"❌ 生成图片失败: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"code": 500, "msg": str(e)}), 500

# ================= 启动 =================
if __name__ == '__main__':
    print("——————————————————————————")
    print("✅ 电商视觉AI助手已启动")
    print("👉 访问地址: http://127.0.0.1:5002")
    print("👉 图片分析使用中转 API")
    print("👉 文生图使用 wuyinkeji 异步 API")
    print("👉 请确保环境变量 WUYIN_API_KEY 已正确设置")
    print("👉 按 Ctrl+C 停止服务")
    print("——————————————————————————")
    app.run(debug=True, port=5002, host='0.0.0.0')