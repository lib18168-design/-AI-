function initAIGenerate() {
    const generateBtn = document.getElementById('generateLocalImageBtn');
    const promptInput = document.getElementById('localImagePrompt');
    const resultContainer = document.getElementById('localImageResultContainer');
    const generatedImage = document.getElementById('localGeneratedImage');
    const downloadBtn = document.getElementById('localDownloadImageBtn');

    if (!generateBtn) return;

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) {
            window.showToast('请输入图片描述');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.innerText = '生成中...';
        resultContainer.classList.add('hidden');

        try {
            const response = await fetch('/api/generate_local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });
            const data = await response.json();
            if (data.code === 0) {
                generatedImage.src = `data:image/png;base64,${data.data.image}`;
                resultContainer.classList.remove('hidden');
                window.showToast('图片生成成功！');
            } else {
                window.showToast('生成失败: ' + data.msg);
            }
        } catch (err) {
            console.error(err);
            window.showToast('请求错误: ' + err.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerText = '生成本地图片';
        }
    });

    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'generated_local.png';
            link.href = generatedImage.src;
            link.click();
        });
    }
}

window.initAIGenerate = initAIGenerate;