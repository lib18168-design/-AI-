const STORAGE_KEY = 'ai_analysis_history';
const MAX_HISTORY = 5;  // 最多保存5条完整记录

function saveHistory(prompt, result, imagesCount) {
    let history = getHistory();
    const record = {
        id: Date.now(),
        time: new Date().toLocaleString(),
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        resultPreview: result.substring(0, 200) + (result.length > 200 ? '...' : ''),
        fullResult: result,
        imagesCount: imagesCount
    };
    history.unshift(record);
    if (history.length > MAX_HISTORY) history.pop();

    const serialized = JSON.stringify(history);
    if (serialized.length > 4.5 * 1024 * 1024) {
        if (window.showToast) window.showToast('历史记录即将达到存储上限，请导出并清空历史');
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    renderHistoryList();
}

function getHistory() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
}

function deleteHistoryItem(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    renderHistoryList();
    if (window.showToast) window.showToast('已删除该条记录');
}

function renderHistoryList() {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;
    const history = getHistory();
    if (history.length === 0) {
        panel.innerHTML = '<div class="text-gray-400 text-sm text-center py-2">暂无历史记录</div>';
        return;
    }

    // 网格容器
    panel.innerHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="historyGrid"></div>`;
    const grid = panel.querySelector('#historyGrid');

    history.forEach(item => {
        const card = document.createElement('div');
        card.className = 'x-history-card';
        card.setAttribute('data-id', item.id);
        card.innerHTML = `
            <div class="x-history-images" style="display: flex; align-items: center; justify-content: center; background: #f8fafc; min-height: 100px;">
                <div class="text-center text-gray-400 text-sm">📋 分析报告</div>
            </div>
            <div class="x-history-body">
                <div class="x-history-meta">
                    <span>${item.time}</span>
                    <span class="badge">${item.imagesCount} 张图片</span>
                </div>
                <div class="text-sm text-gray-700 line-clamp-2 mb-2">${escapeHtml(item.resultPreview)}</div>
                <div class="x-history-actions">
                    <button class="load-history-btn text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 transition">加载报告</button>
                    <button class="delete-history-btn text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition">删除</button>
                </div>
            </div>
        `;

        // 加载报告按钮事件
        const loadBtn = card.querySelector('.load-history-btn');
        loadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const record = getHistory().find(r => r.id === item.id);
            if (record) {
                const resultContent = document.getElementById('resultContent');
                const contentState = document.getElementById('contentState');
                const defaultState = document.getElementById('defaultState');
                if (resultContent && contentState && defaultState) {
                    defaultState.classList.add('hidden');
                    contentState.classList.remove('hidden');
                    resultContent.innerHTML = marked.parse(record.fullResult);
                }
            }
        });

        // 删除按钮事件
        const delBtn = card.querySelector('.delete-history-btn');
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(item.id);
        });

        grid.appendChild(card);
    });
}

// 全局事件委托（仅用于导出/清空按钮，卡片内按钮已独立绑定）
document.addEventListener('click', (e) => {
    if (e.target.id === 'exportHistoryBtn') exportAllHistory();
    if (e.target.id === 'clearHistoryBtn') {
        if (confirm('确定清空所有历史记录吗？')) {
            localStorage.removeItem(STORAGE_KEY);
            renderHistoryList();
            if (window.showToast) window.showToast('历史记录已清空');
        }
    }
});

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function initHistory() {
    renderHistoryList();
    const toggleBtn = document.getElementById('toggleHistoryBtn');
    const panel = document.getElementById('historyPanel');
    if (toggleBtn && panel) {
        const newToggle = toggleBtn.cloneNode(true);
        toggleBtn.parentNode.replaceChild(newToggle, toggleBtn);
        newToggle.addEventListener('click', () => panel.classList.toggle('hidden'));
    }
}

function exportAllHistory() {
    const history = getHistory();
    const dataStr = JSON.stringify(history, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai_history_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    if (window.showToast) window.showToast('历史记录已导出');
}

window.saveHistory = saveHistory;
window.initHistory = initHistory;