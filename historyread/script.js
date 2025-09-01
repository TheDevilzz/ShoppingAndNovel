document.addEventListener('DOMContentLoaded', function() {
    // 标签切换效果
    const tabs = document.querySelectorAll('.tab');
    const tabIndicator = document.querySelector('.tab-indicator');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有标签的激活状态
            tabs.forEach(t => t.classList.remove('active'));
            
            // 激活当前标签
            this.classList.add('active');
            
            // 移动指示器
            const tabIndex = Array.from(tabs).indexOf(this);
            tabIndicator.style.transform = `translateX(${tabIndex * 100}%)`;
            
            // 这里可以添加标签页内容切换逻辑
            const tabId = this.getAttribute('data-tab');
            //console.log(`切换到标签: ${tabId}`);
            
            // 如果有不同的内容区域，可以在这里切换显示
            // switchContent(tabId);
        });
    });

    // 阅读按钮点击事件
    const readButtons = document.querySelectorAll('.btn.read');
    readButtons.forEach(button => {
        button.addEventListener('click', function() {
            const bookItem = this.closest('.book-item');
            const bookTitle = bookItem.querySelector('.book-title').textContent;
            alert(`继续阅读：${bookTitle}`);
        });
    });

    // 删除按钮点击事件
    const deleteButtons = document.querySelectorAll('.btn.delete');
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const bookItem = this.closest('.book-item');
            const bookTitle = bookItem.querySelector('.book-title').textContent;
            
            if (confirm(`确定要删除《${bookTitle}》吗？`)) {
                // 添加删除动画
                bookItem.style.opacity = '0';
                bookItem.style.height = '0';
                bookItem.style.overflow = 'hidden';
                bookItem.style.transition = 'all 0.5s ease';
                
                // 延迟后移除元素
                setTimeout(() => {
                    bookItem.remove();
                }, 500);
            }
        });
    });

    // 下载按钮点击事件
    const downloadButtons = document.querySelectorAll('.download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const title = this.previousElementSibling.textContent;
            alert(`开始下载：${title}`);
        });
    });

    // เช็ค login
 const userId = sessionStorage.getItem('userId') || localStorage.getItem('userId');    if (!userId) {
        window.location.href = '/login/'; // redirect ไปหน้า login
        return;
    }

    // ดึงประวัติการอ่าน
    fetch(`https://lestialv.ddns.net:3001/api/reading-history/${userId}`)
      .then(res => res.json())
      .then(history => {
        const bookList = document.querySelector('.book-list');
        bookList.innerHTML = ''; // ล้างของเดิม

        if (!history.length) {
          bookList.innerHTML = '<div class="no-history">ยังไม่มีประวัติการอ่าน</div>';
          return;
        }

        history.forEach(item => {
          const box = document.createElement('div');
          //console.log(item);
          box.className = 'book-item';
          box.innerHTML = `
            <div class="book-cover">
                <img src="../Server${item.cover_image || 'noimg.png'}" alt="cover">
            </div>
            <div class="book-info">
                <h3 class="book-title">${item.novelTitle}</h3>
                <div class="book-progress">ถึงตอนที่ ${item.chapterNumber} : ${item.chapterTitle || ''}</div>
                <div class="book-update">อ่านล่าสุด: ${new Date(item.readAt).toLocaleString('th-TH')}</div>
            </div>
            <div class="book-actions">
                <button class="btn btn-primary btn-read" data-novel="${item.novelId}" data-chapter="${item.chapterNumber}">อ่านต่อ</button>
            </div>
          `;
          bookList.appendChild(box);
        });

        // Event: อ่านต่อ
        document.querySelectorAll('.btn-read').forEach(btn => {
          btn.addEventListener('click', function() {
            const novelId = this.getAttribute('data-novel');
            const chapter = this.getAttribute('data-chapter');
            window.location.href = `../novelcontent/?id=${novelId}&chapter=${chapter}`;
          });
        });
      });
});