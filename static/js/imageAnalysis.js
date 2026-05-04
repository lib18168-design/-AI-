// 图片分析模块（支持多图分别分析、重试、进度提示、删除对应卡片）
let selectedFiles = [];
let currentAbortControllers = [];
let isAnalyzing = false;
let analyzingCount = 0;
let completedCount = 0;

if (typeof window.showToast !== 'function') {
    window.showToast = function(msg) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.innerText = msg;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 5000);
        }
    };
}

let uploadLabel, imageInput, previewContainer, analyzeBtn, cancelBtn, exportBtn, copyReportBtn;
let promptInput, defaultState, loadingState, resultContainer, progressIndicator;
let objectURLs = new Map();
let resultCards = [];  // 每个元素: { cardDiv, contentDiv, downloadBtn, retryBtn, file, index }

function updatePreview() {
    if (!previewContainer) return;
    for (let [file, url] of objectURLs.entries()) URL.revokeObjectURL(url);
    objectURLs.clear();
    previewContainer.innerHTML = '';
    if (selectedFiles.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'col-span-3 text-center text-gray-400 text-sm py-2';
        placeholder.innerText = '📷 暂无图片';
        previewContainer.appendChild(placeholder);
        return;
    }
    selectedFiles.forEach((file, idx) => {
        const card = document.createElement('div');
        card.className = 'relative group bg-gray-100 rounded-md overflow-hidden border border-gray-200';
        const img = document.createElement('img');
        img.className = 'h-16 w-full object-cover';
        const url = URL.createObjectURL(file);
        objectURLs.set(file, url);
        img.src = url;
        const delBtn = document.createElement('button');
        delBtn.className = 'absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600';
        delBtn.innerHTML = '×';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            removeFile(idx);
        };
        card.appendChild(img);
        card.appendChild(delBtn);
        previewContainer.appendChild(card);
    });
}

function removeFile(index) {
    if (isAnalyzing) {
        window.showToast('分析中，请勿删除图片');
        return;
    }
    const file = selectedFiles[index];
    if (file && objectURLs.has(file)) {
        URL.revokeObjectURL(objectURLs.get(file));
        objectURLs.delete(file);
    }
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0 && imageInput) imageInput.value = '';
    updatePreview();
    // 删除对应的结果卡片（如果存在）
    if (resultCards[index]) {
        resultCards[index].cardDiv.remove();
        resultCards.splice(index, 1);
    }
    // 重新调整后续卡片的索引（因为删除了一个，后续需要更新内部索引，但重试时会用新的索引，简单起见全部清空？为了精确，我们重新构建resultCards的索引映射）
    // 更简单：删除后清空所有结果卡片并重置结果区域，用户需要重新分析。但为了更好的体验，我们只删除对应的卡片，并保持其他卡片不变。
    // 由于selectedFiles已改变，resultCards中后续卡片对应的file需要重新关联，但重试时我们会基于selectedFiles重新发起，所以暂时不处理复杂映射，直接清空所有结果让用户重新分析。
    // 这里选择清空所有结果区域，避免索引错乱。
    if (resultCards.length > 0) {
        resetResultArea();
        window.showToast('已删除图片，请重新分析');
    }
}

function downloadTxt(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

function createResultCard(file, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200';
    cardDiv.setAttribute('data-image-index', index);
    const imgPreview = document.createElement('img');
    imgPreview.src = URL.createObjectURL(file);
    imgPreview.className = 'w-16 h-16 object-cover rounded mr-3 inline-block';
    const fileNameSpan = document.createElement('span');
    fileNameSpan.className = 'text-sm font-medium text-gray-700';
    fileNameSpan.innerText = file.name;
    const header = document.createElement('div');
    header.className = 'flex items-center gap-3 mb-3 pb-2 border-b';
    header.appendChild(imgPreview);
    header.appendChild(fileNameSpan);
    cardDiv.appendChild(header);
    const contentDiv = document.createElement('div');
    contentDiv.className = 'prose max-w-none text-sm text-gray-700';
    contentDiv.innerText = '等待分析...';
    cardDiv.appendChild(contentDiv);
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'flex gap-2 mt-3';
    const downloadBtn = document.createElement('button');
    downloadBtn.innerText = '📥 下载 TXT';
    downloadBtn.className = 'text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition';
    downloadBtn.style.display = 'none';
    const retryBtn = document.createElement('button');
    retryBtn.innerText = '🔄 重试';
    retryBtn.className = 'text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition';
    retryBtn.style.display = 'none';
    buttonGroup.appendChild(downloadBtn);
    buttonGroup.appendChild(retryBtn);
    cardDiv.appendChild(buttonGroup);

    downloadBtn.addEventListener('click', () => {
        const text = contentDiv.innerText;
        if (text && text !== '等待分析...') {
            downloadTxt(text, `${file.name.replace(/\.[^/.]+$/, '')}_分析报告.txt`);
        }
    });
    retryBtn.addEventListener('click', async () => {
        if (isAnalyzing) {
            window.showToast('请等待当前分析完成');
            return;
        }
        // 重置该卡片内容
        contentDiv.innerText = '等待分析...';
        downloadBtn.style.display = 'none';
        retryBtn.style.display = 'none';
        // 重新分析单张图片
        const prompt = promptInput ? promptInput.value : '';
        const modelSelect = document.getElementById('modelSelect');
        const model = modelSelect ? modelSelect.value : 'gpt-4o';
        await analyzeSingleImage(file, index, prompt, model, true);
    });
    return { cardDiv, contentDiv, downloadBtn, retryBtn };
}

function resetResultArea() {
    const container = document.getElementById('resultContainer');
    if (container) {
        container.innerHTML = '';
        resultCards = [];
    }
}

function updateProgress(current, total) {
    if (progressIndicator) {
        progressIndicator.innerText = `正在分析第 ${current}/${total} 张...`;
        progressIndicator.classList.remove('hidden');
        if (current === total) {
            setTimeout(() => progressIndicator.classList.add('hidden'), 2000);
        }
    }
}

function setLoadingState(loading) {
    isAnalyzing = loading;
    if (analyzeBtn) analyzeBtn.disabled = loading;
    if (cancelBtn) cancelBtn.disabled = !loading;
    if (loading) {
        if (defaultState) defaultState.classList.add('hidden');
        if (loadingState) loadingState.classList.remove('hidden');
        resetResultArea();
    } else {
        if (loadingState) loadingState.classList.add('hidden');
        if (resultCards.length === 0 && defaultState) defaultState.classList.remove('hidden');
    }
}

function cancelAllAnalysis() {
    if (currentAbortControllers.length) {
        currentAbortControllers.forEach(ctrl => ctrl && ctrl.abort());
        currentAbortControllers = [];
    }
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    cancelBtn.disabled = true;
    window.showToast('已取消所有分析');
    analyzingCount = 0;
    completedCount = 0;
    resultCards.forEach(card => {
        if (card.contentDiv.innerText === '等待分析...') {
            card.contentDiv.innerText = '分析已取消';
            card.downloadBtn.style.display = 'none';
            card.retryBtn.style.display = 'inline-block';
        }
    });
    updateProgress(0, 0);
    if (progressIndicator) progressIndicator.classList.add('hidden');
}

async function analyzeSingleImage(file, index, promptText, model, isRetry = false) {
    const controller = new AbortController();
    currentAbortControllers[index] = controller;
    const signal = controller.signal;
    try {
        const formData = new FormData();
        formData.append('images', file);
        formData.append('prompt', promptText);
        formData.append('model', model);
        const response = await fetch('/api/analyze', { method: 'POST', body: formData, signal });
        const data = await response.json();
       if (data.code === 0) {
    resultCards[index].contentDiv.innerHTML = marked.parse(data.data.result);
    // 为所有图片添加 preview 类
    resultCards[index].contentDiv.querySelectorAll('img').forEach(img => {
        img.classList.add('preview');
    });
            resultCards[index].contentDiv.innerHTML = marked.parse(data.data.result);
            resultCards[index].downloadBtn.style.display = 'inline-block';
            resultCards[index].retryBtn.style.display = 'none';
        } else {
            resultCards[index].contentDiv.innerText = `分析失败: ${data.msg}`;
            resultCards[index].retryBtn.style.display = 'inline-block';
            resultCards[index].downloadBtn.style.display = 'none';
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            resultCards[index].contentDiv.innerText = '分析已取消';
            resultCards[index].retryBtn.style.display = 'inline-block';
        } else {
            console.error(err);
            resultCards[index].contentDiv.innerText = `请求错误: ${err.message}`;
            resultCards[index].retryBtn.style.display = 'inline-block';
        }
        resultCards[index].downloadBtn.style.display = 'none';
    } finally {
        completedCount++;
        updateProgress(completedCount, analyzingCount);
        if (completedCount === analyzingCount && !isRetry) {
            // 所有分析完成，保存批次历史
            let batchResult = '';
            for (let i = 0; i < resultCards.length; i++) {
                const fileName = selectedFiles[i] ? selectedFiles[i].name : `图片${i+1}`;
                const content = resultCards[i].contentDiv.innerText;
                if (content && content !== '等待分析...' && content !== '分析已取消' && !content.startsWith('分析失败') && !content.startsWith('请求错误')) {
                    batchResult += `========== ${fileName} ==========\n${content}\n\n`;
                }
            }
            if (batchResult && window.saveHistory) {
                window.saveHistory(promptText, batchResult, selectedFiles.length);
            }
            setLoadingState(false);
            currentAbortControllers = [];
            analyzingCount = 0;
            completedCount = 0;
        }
    }
}

async function startBatchAnalysis() {
    if (selectedFiles.length === 0) {
        window.showToast('请先选择产品图片');
        return;
    }
    if (isAnalyzing) {
        cancelAllAnalysis();
        return;
    }
    const prompt = promptInput ? promptInput.value : '';
    const modelSelect = document.getElementById('modelSelect');
    const model = modelSelect ? modelSelect.value : 'gpt-4o';

    resetResultArea();
    const container = document.getElementById('resultContainer');
    if (!container) return;
    resultCards = [];
    for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const { cardDiv, contentDiv, downloadBtn, retryBtn } = createResultCard(file, i);
        container.appendChild(cardDiv);
        resultCards.push({ cardDiv, contentDiv, downloadBtn, retryBtn, file, index: i });
    }
    analyzingCount = selectedFiles.length;
    completedCount = 0;
    setLoadingState(true);
    updateProgress(0, analyzingCount);
    for (let i = 0; i < selectedFiles.length; i++) {
        analyzeSingleImage(selectedFiles[i], i, prompt, model, false);
    }
}

function exportAllReports() {
    if (resultCards.length === 0) {
        window.showToast('没有可导出的报告');
        return;
    }
    let fullText = '';
    for (let i = 0; i < resultCards.length; i++) {
        const fileName = selectedFiles[i] ? selectedFiles[i].name : `图片${i+1}`;
        const reportText = resultCards[i].contentDiv.innerText;
        if (reportText && reportText !== '等待分析...' && reportText !== '分析已取消' && !reportText.startsWith('分析失败') && !reportText.startsWith('请求错误')) {
            fullText += `========== ${fileName} ==========\n${reportText}\n\n`;
        }
    }
    if (!fullText) {
        window.showToast('没有完整分析结果可导出');
        return;
    }
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `batch_analysis_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
}

function initImageAnalysis() {
    uploadLabel = document.getElementById('uploadLabel');
    imageInput = document.getElementById('imageInput');
    previewContainer = document.getElementById('previewContainer');
    analyzeBtn = document.getElementById('analyzeBtn');
    cancelBtn = document.getElementById('cancelBtn');
    exportBtn = document.getElementById('exportBtn');
    copyReportBtn = document.getElementById('copyReportBtn');
    promptInput = document.getElementById('promptInput');
    defaultState = document.getElementById('defaultState');
    loadingState = document.getElementById('loadingState');
    resultContainer = document.getElementById('resultContainer');
    progressIndicator = document.getElementById('progressIndicator');
    if (!previewContainer) return;

    if (uploadLabel) {
        uploadLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadLabel.classList.add('upload-highlight');
        });
        uploadLabel.addEventListener('dragleave', () => {
            uploadLabel.classList.remove('upload-highlight');
        });
        uploadLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadLabel.classList.remove('upload-highlight');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 5) {
                window.showToast('最多只能拖拽5张图片');
                return;
            }
            const oversized = files.find(f => f.size > 10 * 1024 * 1024);
            if (oversized) {
                window.showToast(`图片 ${oversized.name} 超过10MB`);
                return;
            }
            selectedFiles = files;
            updatePreview();
        });
    }
    if (imageInput) {
        imageInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length > 5) {
                window.showToast('最多只能选择5张图片');
                imageInput.value = '';
                return;
            }
            const oversized = files.find(f => f.size > 10 * 1024 * 1024);
            if (oversized) {
                window.showToast(`图片 ${oversized.name} 超过10MB`);
                imageInput.value = '';
                return;
            }
            selectedFiles = files;
            updatePreview();
        });
    }
    if (analyzeBtn) analyzeBtn.addEventListener('click', startBatchAnalysis);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelAllAnalysis);
    if (exportBtn) {
        exportBtn.onclick = null;
        exportBtn.addEventListener('click', exportAllReports);
    }
    if (copyReportBtn) copyReportBtn.addEventListener('click', () => {
        window.showToast('批量报告暂不支持一键复制');
    });
    const savePromptBtn = document.getElementById('savePromptBtn');
    const loadPromptBtn = document.getElementById('loadPromptBtn');
    if (savePromptBtn) savePromptBtn.addEventListener('click', () => {
        localStorage.setItem('saved_prompt_template', promptInput.value);
        window.showToast('已保存为默认指令');
    });
    if (loadPromptBtn) loadPromptBtn.addEventListener('click', () => {
        const saved = localStorage.getItem('saved_prompt_template');
        if (saved) {
            promptInput.value = saved;
            window.showToast('已加载默认指令');
        } else {
            window.showToast('暂无保存的默认指令');
        }
    });
    if (typeof window.initHistory === 'function') window.initHistory();
}

window.initImageAnalysis = initImageAnalysis;