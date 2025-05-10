let currentPage = 1;
const postId = 26402; // 根据实际需要修改
const pageSize = 20; // 每页显示数量

// 每次打开 Popup 时执行（包括首次打开和关闭后重新打开）
document.addEventListener("DOMContentLoaded", async () => {
    currentPage = await readPage();
    await fetchComments(currentPage);
});

document.getElementById('comments').addEventListener("click", async (event) => {
    const target = event.target;
    if (target.classList.contains("oo")) {
        await sendVote(target, "pos");
    }
    if (target.classList.contains("xx")) {
        await sendVote(target, "neg");
    }
});

async function sendVote(target, like_type) {
    const comment_id = parseInt(target.dataset.id);
    const num = parseInt(target.dataset.num);
    const payload = {
        comment_id: comment_id,
        like_type: like_type,
        data_type: "comment"
    };
    try {
        const response = await fetch('https://jandan.net/api/comment/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        let txt = "";
        if (like_type === 'pos') {
            txt = "OO [" + (num + 1) + "]";
        } else {
            txt = "XX [" + (num + 1) + "]";
        }
        target.textContent = result.message || txt;
    } catch (error) {
        console.log(error.message);
    }
}


async function readPage() {
    const result = await chrome.storage.local.get("pageNumber");
    const currentNumber = result.pageNumber || 1; // 默认值0
    return currentNumber;
}

async function savePage(newNumber) {
    chrome.storage.local.set({ pageNumber: newNumber }, () => {
        console.log("数字已保存！");
    });
}

async function fetchComments(page = 1) {
    try {
        showLoading(true);
        const response = await fetch(`https://jandan.net/api/comment/post/${postId}?order=desc&page=${page}`);
        const data = await response.json();

        if (data.code === 0) {
            renderComments(data.data.list);
            updatePagination(data.data.total, page);
            await savePage(page);
        } else {
            console.error('API Error:', data.msg);
        }
    } catch (error) {
        console.error('Fetch Error:', error);
    } finally {
        showLoading(false);
    }
}

function updatePagination(total, current) {
    const totalPages = Math.ceil(total / pageSize);
    document.getElementById('pageInfo').textContent = `第${current}页/共${totalPages}页`;
    document.getElementById('prevPage').disabled = current <= 1;
    document.getElementById('nextPage').disabled = current >= totalPages;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        fetchComments(currentPage);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    currentPage++;
    fetchComments(currentPage);
});

document.getElementById('indexPage').addEventListener('click', () => {
    currentPage = 1;
    fetchComments(currentPage);
});

document.getElementById('jandan').addEventListener('click', (e) => {
    e.preventDefault(); // 阻止默认跳转
    chrome.tabs.create({ url: e.target.href });
});

function renderComments(comments) {
    const container = document.getElementById('comments');
    container.innerHTML = '';

    comments.forEach(comment => {
        const card = document.createElement('div');
        card.className = 'comment-card';
        card.innerHTML = `
            <div class="content">${processContent(comment.content)}</div>
            <div class="meta" id="meta">
                <span>作者: ${comment.author}</span>
                <span class="oo" data-id="${comment.id}" data-num="${comment.vote_positive}">OO [${comment.vote_positive}]</span>
				<span class="xx" data-id="${comment.id}" data-num="${comment.vote_negative}">XX [${comment.vote_negative}]</span>
                <span>${comment.ip_location}</span>
            </div>
        `;
        container.appendChild(card);
        // 延迟加载图片
        initLazyLoad(card);
    });
}

function processContent(content) {
    // 替换img标签加入加载占位符
    return content.replace(/<img[^>]+>/g, (match) => {
        const src = match.match(/src="([^"]+)"/)[1];
        return `
            <div class="image-wrapper">
                <div class="loading-placeholder">
                    <div class="loading-spinner"></div>
                </div>
                <img class="thumbnail" data-src="${src}" alt="图片">
            </div>
        `;
    });
}

function initLazyLoad(card) {
    const options = {
        rootMargin: '0px',
        threshold: 0.1
    };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const wrapper = img.parentElement;
                const placeholder = wrapper.querySelector('.loading-placeholder');
                // 开始加载图片
                img.src = img.dataset.src;
                img.onload = () => {
                    img.classList.add('loaded');
                    if (placeholder) placeholder.remove();
                };
                img.onerror = () => {
                    placeholder.innerHTML = '加载失败';
                    placeholder.style.background = '#ffebee';
                };
                observer.unobserve(img);
            }
        });
    }, options);
    card.querySelectorAll('img[data-src]').forEach(img => {
        observer.observe(img);
    });
}
const backToTop = document.getElementById('backToTop');

// 显示/隐藏按钮
window.addEventListener('scroll', () => {
    backToTop.classList.toggle('show', window.scrollY > 200);
});

// 平滑滚动到顶部
backToTop.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

