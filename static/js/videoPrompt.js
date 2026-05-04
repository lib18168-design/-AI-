function initVideoPrompt() {
    // 核心 DOM 元素
    const imagePrompt = document.getElementById('imagePrompt');
    const generateImageBtn = document.getElementById('generateImageBtn');
    const optimizePromptBtn = document.getElementById('optimizePromptBtn');
    const imageSizeSelect = document.getElementById('imageSize');
    const resolutionRadios = document.querySelectorAll('input[name="resolution"]');
    const refImageInput = document.getElementById('refImageInput');
    const refImageUploadArea = document.getElementById('refImageUploadArea');
    const refImagePreviewContainer = document.getElementById('refImagePreviewContainer');
    const noImagePlaceholder = document.getElementById('noImagePlaceholder');
    const generatedImageWrapper = document.getElementById('generatedImageWrapper');
    const generatedImageRight = document.getElementById('generatedImageRight');
    const downloadImageRightBtn = document.getElementById('downloadImageRightBtn');
    const recentImagesContainer = document.getElementById('recentImagesContainer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const examplePrompts = document.querySelectorAll('.example-prompt');
    const styleCardStrip = document.getElementById('styleCardStrip');
    const styleSearchInput = document.getElementById('styleSearchInput');
    const filterBtns = document.querySelectorAll('.filter-btn-style');
    const selectedNameSpan = document.getElementById('selectedStyleName');

    // 参考图数组
    let refImageFiles = [];

    // ========== 对比滑块初始化函数 ==========
    function initCompareSlider(slider) {
        if (!slider) return;
        const input = slider.querySelector('input[type="range"]');
        if (!input) return;

        function setPosition(value) {
            const pct = Math.min(100, Math.max(0, Number(value)));
            slider.style.setProperty('--compare-position', pct + '%');
            if (input.value !== String(pct)) input.value = String(pct);
        }

        function onInput(e) {
            setPosition(e.target.value);
        }

        input.removeEventListener('input', onInput);
        input.addEventListener('input', onInput);
        setPosition(input.value || 50);
    }

    // ========== 渲染生成结果（带对比滑块和下载按钮） ==========
    function renderGeneratedResultWithCompare(generatedBase64, referenceBase64, promptText) {
        const previewContainer = document.getElementById('rightImageContainer');
        if (!previewContainer) return;

        let html = '';
        if (referenceBase64) {
            html = `
                <div class="x-compare-slider" style="--compare-position:50%">
                    <img class="x-compare-img" src="${generatedBase64}" alt="生成图">
                    <div class="x-compare-after-wrap">
                        <img class="x-compare-img" src="${referenceBase64}" alt="参考图">
                    </div>
                    <input type="range" min="0" max="100" value="50" step="1" class="compare-range">
                    <div class="x-compare-handle"></div>
                    <div class="x-compare-labels">
                        <span>生成图</span>
                        <span>参考图</span>
                    </div>
                </div>
            `;
        } else {
            html = `<img class="preview w-full rounded-2xl border border-gray-200" src="${generatedBase64}" alt="生成的图片">`;
        }

        // 操作按钮栏（包含下载按钮）
        html += `<div class="flex gap-2 mt-3 flex-wrap">
            <button id="reusePromptBtn" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full transition">✏️ 再来一次</button>
            <button id="copyPromptBtn" class="text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1.5 rounded-full transition">📋 复制提示词</button>
            <button id="optimizeAgainBtn" class="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-1.5 rounded-full transition">✨ 优化提示词</button>
            <button id="downloadResultBtn" class="text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-full transition">💾 下载图片</button>
        </div>`;

        previewContainer.innerHTML = html;

        // 初始化滑块
        const slider = previewContainer.querySelector('.x-compare-slider');
        if (slider) initCompareSlider(slider);

        // 绑定按钮事件
        const reuseBtn = document.getElementById('reusePromptBtn');
        if (reuseBtn) {
            reuseBtn.addEventListener('click', () => {
                if (imagePrompt && promptText) {
                    imagePrompt.value = promptText;
                    imagePrompt.focus();
                    window.showToast('已填入提示词，可直接生成');
                }
            });
        }
        const copyBtn = document.getElementById('copyPromptBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                if (promptText) {
                    navigator.clipboard.writeText(promptText);
                    window.showToast('提示词已复制到剪贴板');
                }
            });
        }
        const optimizeBtn = document.getElementById('optimizeAgainBtn');
        if (optimizeBtn && optimizePromptBtn) {
            optimizeBtn.addEventListener('click', () => {
                optimizePromptBtn.click();
            });
        }
        const downloadBtn = document.getElementById('downloadResultBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const link = document.createElement('a');
                link.download = 'generated.png';
                link.href = generatedBase64;
                link.click();
                window.showToast('图片已开始下载');
            });
        }
    }

    // ========== 参考图逻辑 ==========
    async function getRefImageUrls() {
        const urls = [];
        for (const file of refImageFiles) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            urls.push(dataUrl);
        }
        return urls;
    }

    function updateRefImagePreview() {
        if (!refImagePreviewContainer) return;
        refImagePreviewContainer.innerHTML = '';
        refImageFiles.forEach((file, idx) => {
            const url = URL.createObjectURL(file);
            const div = document.createElement('div');
            div.className = 'relative w-16 h-16 rounded overflow-hidden border border-gray-200';
            const img = document.createElement('img');
            img.src = url;
            img.className = 'w-full h-full object-cover';
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '×';
            delBtn.className = 'absolute top-0 right-0 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center';
            delBtn.onclick = () => {
                URL.revokeObjectURL(url);
                refImageFiles.splice(idx, 1);
                updateRefImagePreview();
            };
            div.appendChild(img);
            div.appendChild(delBtn);
            refImagePreviewContainer.appendChild(div);
        });
    }

    function handleRefImages(files) {
        if (refImageFiles.length + files.length > 10) {
            window.showToast('最多只能上传10张参考图');
            return;
        }
        for (let file of files) {
            if (!file.type.startsWith('image/')) {
                window.showToast(`${file.name} 不是图片文件`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                window.showToast(`${file.name} 超过10MB`);
                return;
            }
            refImageFiles.push(file);
        }
        updateRefImagePreview();
        if (refImageInput) refImageInput.value = '';
    }

    if (refImageUploadArea) {
        refImageUploadArea.addEventListener('click', () => refImageInput.click());
        refImageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            refImageUploadArea.classList.add('border-indigo-400', 'bg-indigo-50/30');
        });
        refImageUploadArea.addEventListener('dragleave', () => {
            refImageUploadArea.classList.remove('border-indigo-400', 'bg-indigo-50/30');
        });
        refImageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            refImageUploadArea.classList.remove('border-indigo-400', 'bg-indigo-50/30');
            handleRefImages(Array.from(e.dataTransfer.files));
        });
        refImageInput.addEventListener('change', (e) => {
            handleRefImages(Array.from(e.target.files));
        });
    }

    // ========== 生成图片 ==========
    function getSelectedResolution() {
        let selected = "2k";
        resolutionRadios.forEach(r => { if (r.checked) selected = r.value; });
        return selected;
    }

    function saveRecentImage(imageBase64) {
        const recent = JSON.parse(localStorage.getItem('recent_generated_images') || '[]');
        recent.unshift({ base64: imageBase64, timestamp: Date.now() });
        while (recent.length > 8) recent.pop();
        localStorage.setItem('recent_generated_images', JSON.stringify(recent));
        renderRecentImages();
    }

    function renderRecentImages() {
        if (!recentImagesContainer) return;
        const recent = JSON.parse(localStorage.getItem('recent_generated_images') || '[]');
        if (recent.length === 0) {
            recentImagesContainer.innerHTML = '<div class="text-gray-400 text-sm text-center w-full">暂无历史图片</div>';
            return;
        }
        recentImagesContainer.innerHTML = '';
        recent.forEach((item) => {
            const img = document.createElement('img');
            img.src = item.base64;
            img.className = 'w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition';
            img.title = `生成于 ${new Date(item.timestamp).toLocaleString()}`;
            img.addEventListener('click', () => {
                generatedImageRight.src = item.base64;
                noImagePlaceholder.classList.add('hidden');
                generatedImageWrapper.classList.remove('hidden');
            });
            recentImagesContainer.appendChild(img);
        });
    }

    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            localStorage.removeItem('recent_generated_images');
            renderRecentImages();
            window.showToast('已清空历史记录');
        });
    }

    async function generateImage() {
        const prompt = imagePrompt.value.trim();
        if (!prompt) {
            window.showToast('请输入图片描述');
            return;
        }
        const size = imageSizeSelect ? imageSizeSelect.value : "16:9";
        const resolution = getSelectedResolution();
        if (resolution === "4k") {
            const supported = ["16:9", "9:16", "2:1", "1:2", "21:9"];
            if (!supported.includes(size)) {
                window.showToast('4K 仅支持 16:9、9:16、2:1、1:2、21:9 比例');
                return;
            }
        }
        const imageUrls = await getRefImageUrls();

        generateImageBtn.disabled = true;
        generateImageBtn.innerText = '生成中...';
        noImagePlaceholder.innerHTML = '<div class="loader mx-auto mb-3"></div><p>AI 正在生成图片...</p>';
        generatedImageWrapper.classList.add('hidden');

        try {
            const response = await fetch('/api/generate_image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, size, resolution, image_urls: imageUrls })
            });
            const data = await response.json();
            if (data.code === 0) {
                const imageBase64 = `data:image/png;base64,${data.data.image}`;
                const promptText = prompt;
                let referenceBase64 = null;
                if (refImageFiles.length > 0) {
                    const file = refImageFiles[0];
                    referenceBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.readAsDataURL(file);
                    });
                }
                renderGeneratedResultWithCompare(imageBase64, referenceBase64, promptText);
                saveRecentImage(imageBase64);
            } else {
                window.showToast('生成失败: ' + data.msg);
                noImagePlaceholder.innerHTML = '<i class="fas fa-image text-6xl mb-3 opacity-30"></i><p>生成后的图片将显示在此处</p>';
                noImagePlaceholder.classList.remove('hidden');
            }
        } catch (err) {
            console.error(err);
            window.showToast('请求错误: ' + err.message);
            noImagePlaceholder.innerHTML = '<i class="fas fa-image text-6xl mb-3 opacity-30"></i><p>生成后的图片将显示在此处</p>';
            noImagePlaceholder.classList.remove('hidden');
        } finally {
            generateImageBtn.disabled = false;
            generateImageBtn.innerText = '生成图片';
        }
    }

    if (generateImageBtn) generateImageBtn.addEventListener('click', generateImage);
    if (downloadImageRightBtn) {
        downloadImageRightBtn.addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = 'generated.png';
            link.href = generatedImageRight.src;
            link.click();
        });
    }

    // ========== 优化提示词 ==========
    if (optimizePromptBtn) {
        optimizePromptBtn.addEventListener('click', async () => {
            const original = imagePrompt.value.trim();
            if (!original) {
                window.showToast('请先输入提示词');
                return;
            }
            optimizePromptBtn.disabled = true;
            optimizePromptBtn.innerText = '优化中...';
            try {
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: `请优化以下文生图提示词，使其更详细、专业，并保持核心意思不变。只返回优化后的提示词。\n原始提示词：${original}`,
                        model: 'gpt-5.4'
                    })
                });
                const data = await response.json();
                if (data.code === 0) {
                    imagePrompt.value = data.data.result;
                    window.showToast('提示词优化完成');
                } else {
                    window.showToast('优化失败: ' + data.msg);
                }
            } catch (err) {
                console.error(err);
                window.showToast('请求错误: ' + err.message);
            } finally {
                optimizePromptBtn.disabled = false;
                optimizePromptBtn.innerText = '✨ 优化提示词';
            }
        });
    }

    // 示例提示词
    examplePrompts.forEach(p => {
        p.addEventListener('click', () => {
            imagePrompt.value = p.innerText;
            imagePrompt.focus();
        });
    });

    // ========== 风格市场 ==========
    const styles = [
        { name: "漫画", file: "comic.png", prompt: "用上传图片中的主体创作一则漫画...", groups: ["all", "popular"], hot: true },
        { name: "绘画", file: "interior.png", prompt: "把这张简单、稚拙的画或照片变成照片级真实场景...", groups: ["all", "popular"], hot: true },
        { name: "蓝图海报", file: "blueprint.png", prompt: "只使用上传图片中的主要主体，制作一张单主体蓝图海报...", groups: ["all", "popular"], hot: true },
        { name: "标识设计", file: "logo-design.png", prompt: "把这张图片转成一组极简 Logo 网格...", groups: ["all", "popular"], hot: true },
        { name: "影棚形象照", file: "studio-portrait.png", prompt: "把这张照片转换成高级时尚风的影棚肖像...", groups: ["all"], hot: false },
        { name: "夜拍闪光", file: "night-flash.png", prompt: "把这张照片变成夜间时髦直闪摄影风格...", groups: ["all"], hot: false },
        { name: "增强照片", file: "enhance-photo.png", prompt: "提升我的照片画质，让它更清晰。", groups: ["all"], hot: false },
        { name: "优化光线", file: "optimize-light.png", prompt: "在保持其他一切完全不变的前提下改善光线...", groups: ["all"], hot: false },
        { name: "动漫风", file: "anime.png", prompt: "根据上传的主体，创作一张当下流行的动漫艺术风格图像...", groups: ["all"], hot: false },
        { name: "塔罗牌", file: "tarot.png", prompt: "根据你对我的了解，以经典 Rider-Waite 风格创作一张塔罗牌...", groups: ["all"], hot: false },
        { name: "奇幻报纸", file: "fantasy-newspaper.png", prompt: "将上传照片中的人物变成一张异想天开的黑白复古报纸头版...", groups: ["all"], hot: false },
        { name: "信息图海报", file: "infographic.png", prompt: "创作一张复古植物学插画海报...", groups: ["all"], hot: false },
        { name: "胶片条", file: "film-strip.png", prompt: "把上传的图片转成电影感的三联连续剧照...", groups: ["all"], hot: false },
        { name: "8-bit游戏", file: "8bit-game.png", prompt: "以已上传图片中的主体为灵感，创作一张来自叙事驱动的 2D 横版卷轴像素艺术游戏的单帧画面...", groups: ["all"], hot: false },
        { name: "3D头像", file: "3davatar.png", prompt: "使用上传的图片作为唯一参考，为主体生成高级光泽感 3D designer toy 渲染图...", groups: ["all"], hot: false },
        { name: "超写实壁纸", file: "hyper-real.png", prompt: "创建一张自然户外场景的微距自然图像...", groups: ["all"], hot: false },
        { name: "个人色彩诊断", file: "color-analysis.png", prompt: "请使用这张肖像制作个人色彩诊断的图形...", groups: ["all"], hot: false },
        { name: "手写风加工", file: "white-lines-jp.png", prompt: "请观察照片中出现的元素，并为每一项添加有意义的手绘注释...", groups: ["all"], hot: false },
        { name: "风景", file: "wallpaper.png", prompt: "创作一幅电影感、超写实的风景...", groups: ["all", "recent"], hot: false },
        { name: "水下", file: "underwater.png", prompt: "创作一张主体刚跳入泳池或清澈浅水后拍摄的超近距离水下肖像...", groups: ["all"], hot: false },
        { name: "雕像", file: "statue.png", prompt: "以上传的图片为原型，创作一尊精致的新古典主义希腊风格白色卡拉拉大理石雕像...", groups: ["all", "recent"], hot: false },
        { name: "超现实", file: "surreal.png", prompt: "创建一张图像，让主体或场景中的一个元素转变成一种异想天开、滑稽可笑的超现实现象...", groups: ["all"], hot: false },
        { name: "动物信息图", file: "education-poster.png", prompt: "制作一张关于濒危动物的视觉信息丰富的信息图...", groups: ["all"], hot: false },
        { name: "图解食谱", file: "recipe-zine.png", prompt: "为一道国际食谱制作一本3页彩色混合媒介美食小志...", groups: ["all"], hot: false }
    ];

    let favorites = JSON.parse(localStorage.getItem('styleFavorites') || '[]');
    let currentFilter = 'all';
    let currentSearch = '';
    let selectedIndex = -1;

    function renderStyleCards() {
        if (!styleCardStrip) return;
        let filtered = styles.filter((s, idx) => {
            if (currentFilter === 'favorite' && !favorites.includes(idx)) return false;
            if (currentFilter === 'recent' && !s.groups.includes('recent')) return false;
            if (currentFilter === 'popular' && !s.hot) return false;
            if (currentSearch && !s.name.toLowerCase().includes(currentSearch.toLowerCase())) return false;
            return true;
        });

        if (filtered.length === 0) {
            styleCardStrip.innerHTML = '<div class="text-center text-gray-400 w-full py-6">没有匹配的风格</div>';
            return;
        }

        styleCardStrip.innerHTML = '';
        filtered.forEach((s, i) => {
            const originalIndex = styles.indexOf(s);
            const isSelected = (originalIndex === selectedIndex);
            const card = document.createElement('div');
            card.className = `x-style-card w-40 h-52 flex-shrink-0 rounded-2xl relative cursor-pointer transition-all${isSelected ? ' ring-2 ring-indigo-500 ring-offset-2' : ''}`;
            card.style.backgroundImage = `url('/static/covers/${s.file}')`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            const titleDiv = document.createElement('div');
            titleDiv.className = 'x-style-title';
            titleDiv.innerText = s.name;
            card.appendChild(titleDiv);
            if (s.hot) {
                const badge = document.createElement('div');
                badge.className = 'x-style-badge hot';
                badge.innerText = '热门';
                card.appendChild(badge);
            } else if (s.groups.includes('recent')) {
                const badge = document.createElement('div');
                badge.className = 'x-style-badge';
                badge.innerText = '最近';
                card.appendChild(badge);
            }
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedIndex = originalIndex;
                renderStyleCards();
                if (imagePrompt) {
                    imagePrompt.value = s.prompt;
                    imagePrompt.focus();
                    window.showToast(`✨ 已应用「${s.name}」风格`);
                }
                if (selectedNameSpan) selectedNameSpan.innerText = `已选: ${s.name}`;
            });
            styleCardStrip.appendChild(card);
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('bg-indigo-50', 'text-indigo-600', 'font-medium'));
            btn.classList.add('bg-indigo-50', 'text-indigo-600', 'font-medium');
            currentFilter = btn.getAttribute('data-filter');
            renderStyleCards();
        });
    });

    if (styleSearchInput) {
        styleSearchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value;
            renderStyleCards();
        });
    }

    renderStyleCards();
    renderRecentImages();
}

window.initVideoPrompt = initVideoPrompt;