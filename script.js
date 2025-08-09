// 配置信息
const CONFIG = {
    totalImages: 19, // 图片总数
    originalPath: 'image/', // 原图路径
    cutoutPath: 'imagek/', // 抠图路径
    fileExtension: '.png' // 图片扩展名
};

// 全局变量
let currentMode = 'original';
let currentZoom = 1;
let currentImage = null;
let imageCache = {
    original: {},
    cutout: {}
};

// DOM 元素
const gallery = document.getElementById('gallery');
const modal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const closeModalBtn = document.getElementById('closeModalBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const copyImageBtn = document.getElementById('copyImageBtn');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const downloadBtn = document.getElementById('downloadBtn');
const notification = document.getElementById('notification');
const tabButtons = document.querySelectorAll('.tab-btn');
const loadingDots = document.createElement('div');

// 创建加载动画
function createLoadingAnimation() {
    loadingDots.className = 'loading-dots';
    loadingDots.innerHTML = `
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
    `;
    document.body.appendChild(loadingDots);
}

// 初始化应用
async function initApp() {
    createLoadingAnimation();
    
    // 预加载所有图片
    await preloadAllImages();
    
    // 初始加载图片
    await loadImages(currentMode);
    
    // 隐藏加载动画
    setTimeout(() => {
        loadingDots.classList.add('hidden');
    }, 500);
    
    // 设置事件监听器
    setupEventListeners();
}

// 预加载所有图片
async function preloadAllImages() {
    const modes = ['original', 'cutout'];
    
    for (const mode of modes) {
        const path = mode === 'original' ? CONFIG.originalPath : CONFIG.cutoutPath;
        const promises = [];
        
        for (let i = 1; i <= CONFIG.totalImages; i++) {
            const imgSrc = path + i + CONFIG.fileExtension;
            promises.push(preloadImage(imgSrc, mode, i));
        }
        
        await Promise.all(promises);
    }
}

// 预加载单个图片
function preloadImage(src, mode, index) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            imageCache[mode][index] = img;
            resolve();
        };
        img.onerror = () => {
            // 即使加载失败也解析，避免阻塞
            resolve();
        };
    });
}

// 加载图片到相册
async function loadImages(mode) {
    // 清空画廊并显示加载动画
    gallery.innerHTML = '';
    loadingDots.classList.remove('hidden');
    
    // 等待一个短暂的延迟，增加加载感知
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // 添加淡入动画的图片
    for (let i = 1; i <= CONFIG.totalImages; i++) {
        const cachedImg = imageCache[mode][i];
        
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = i;
        item.style.animationDelay = `${i * 0.05}s`; // 错开动画时间
        
        if (cachedImg) {
            const imgElement = document.createElement('img');
            imgElement.src = cachedImg.src;
            imgElement.alt = `图片 ${i}`;
            item.appendChild(imgElement);
        } else {
            // 如果缓存中没有，则创建占位符
            const placeholder = document.createElement('div');
            placeholder.className = 'placeholder';
            placeholder.innerHTML = '<i class="fas fa-image"></i>';
            item.appendChild(placeholder);
        }
        
        gallery.appendChild(item);
    }
    
    // 隐藏加载动画
    loadingDots.classList.add('hidden');
}

// 设置事件监听器
function setupEventListeners() {
    // 选项卡按钮点击事件
    tabButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            // 防止重复点击
            if (btn.classList.contains('active')) return;
            
            // 添加切换动画
            document.body.classList.add('mode-switching');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const newMode = btn.dataset.mode;
            
            // 淡出当前图片
            gallery.style.opacity = 0;
            gallery.style.transform = 'translateY(20px)';
            
            // 等待过渡完成
            await new Promise(resolve => setTimeout(resolve, 300));
            
            currentMode = newMode;
            
            // 加载新图片
            await loadImages(currentMode);
            
            // 淡入新图片
            gallery.style.opacity = 1;
            gallery.style.transform = 'translateY(0)';
            
            // 移除切换动画类
            setTimeout(() => {
                document.body.classList.remove('mode-switching');
            }, 300);
        });
    });
    
    // 图片点击事件（事件委托）
    gallery.addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        if (item) {
            const img = item.querySelector('img');
            if (img) {
                showModal(img.src);
            }
        }
    });
    
    // 关闭模态框
    closeModalBtn.addEventListener('click', closeModal);
    
    // 点击模态框背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // 放大按钮
    zoomInBtn.addEventListener('click', () => {
        currentZoom += 0.1;
        updateZoom();
    });
    
    // 缩小按钮
    zoomOutBtn.addEventListener('click', () => {
        if (currentZoom > 0.2) {
            currentZoom -= 0.1;
            updateZoom();
        }
    });
    
    // 复制图片
    copyImageBtn.addEventListener('click', copyImage);
    
    // 复制图片链接
    copyUrlBtn.addEventListener('click', copyImageUrl);
    
    // 下载图片
    downloadBtn.addEventListener('click', downloadImage);
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('active')) {
            if (e.key === 'Escape') closeModal();
            if (e.key === '+' || e.key === '=') {
                currentZoom += 0.1;
                updateZoom();
            }
            if (e.key === '-' || e.key === '_') {
                if (currentZoom > 0.2) {
                    currentZoom -= 0.1;
                    updateZoom();
                }
            }
        }
    });
}
// 显示模态框
function showModal(src) {
    modalImage.src = src;
    modalImage.alt = '详细图片';
    currentImage = src;
    currentZoom = 1;
    modalImage.style.transform = `scale(${currentZoom})`;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 关闭模态框
function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 更新缩放
function updateZoom() {
    modalImage.style.transform = `scale(${currentZoom})`;
}

// 复制图片链接
async function copyImageUrl() {
    try {
        await navigator.clipboard.writeText(currentImage);
        showNotification('图片链接已复制！');
    } catch (err) {
        console.error('复制链接失败:', err);
        showNotification('复制链接失败，请重试');
    }
}



/**
 * Download the current image with enhanced functionality
 * - Adds proper error handling
 * - Shows loading state
 * - Generates meaningful filenames
 * - Handles large files
 * @returns {Promise<void>}
 */
async function downloadImage() {
    // Validate if there's an image to download
    if (!currentImage) {
        showNotification('没有可下载的图片');
        return;
    }

    try {
        showNotification('正在准备下载...');

        // Fetch the image
        const response = await fetch(currentImage);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Get the image blob
        const blob = await response.blob();

        // Generate meaningful filename
        let fileName = '';
        
        // Extract original filename from URL
        const urlFileName = currentImage.substring(currentImage.lastIndexOf('/') + 1);
        
        // Generate filename based on mode and timestamp
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '');
        const mode = currentMode === 'original' ? '原图' : '抠图';
        
        // Use original filename if valid, otherwise generate one
        if (urlFileName && urlFileName.length > 4) {
            // Insert mode indicator before extension
            const nameWithoutExt = urlFileName.substring(0, urlFileName.lastIndexOf('.'));
            const ext = urlFileName.substring(urlFileName.lastIndexOf('.'));
            fileName = `${nameWithoutExt}_${mode}${ext}`;
        } else {
            fileName = `图片_${mode}_${timestamp}${CONFIG.fileExtension}`;
        }

        // Create object URL for large files
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create and trigger download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        }, 100);

        showNotification('开始下载');
        
    } catch (error) {
        console.error('下载失败:', error);
        showNotification('下载失败，请重试');
    }
}


// 显示通知
function showNotification(message) {
    notification.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 1500);
}

// 初始化应用
document.addEventListener('DOMContentLoaded', initApp);
