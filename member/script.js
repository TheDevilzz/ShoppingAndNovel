document.addEventListener('DOMContentLoaded', () => {
    fetch('https://lestialv.ddns.net:3001/api/members')
        .then(res => res.json())
        .then(members => {
            renderSidebar(members);
            renderProfile(members[0]); // แสดงตัวแรกเป็น default

            // Event: คลิก avatar
            document.querySelectorAll('.avatar-btn').forEach(btn => {
                btn.addEventListener('click', function () {
                    const memberId = this.dataset.memberId;
                    const member = members.find(m => m.ID == memberId);
                    renderProfile(member);

                    // active class
                    document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                });
            });
        });
});

function renderSidebar(members) {
    const sidebar = document.querySelector('.sidebar');
    sidebar.innerHTML = members.map((m, i) => `
        <button class="avatar-btn${i === 0 ? ' active' : ''}" data-member-id="${m.ID}">
            <img src="../Server/${m.iconimg}" alt="${m.Name}">
        </button>
    `).join('') + `
        <button class="back-btn" style="width: 64px; height: 64px; padding: 0; border: none; background: #e0e0e0; margin-bottom: 10px; border-radius: 50%; overflow: hidden; cursor: pointer; display: block; position: relative;" onclick="window.location.href='../';">
            &#8592; 
        </button>
    `;
}

function renderProfile(member) {
    const content = document.querySelector('.content');
    content.style.background = `linear-gradient(135deg, white 0%, white 50%, ${member.bgColor} 50%, ${member.bgColor} 100%)`;

    // อัปเดตชื่อใหญ่ด้านหลัง (ไม่สร้าง div ใหม่)
    const bigBgName = document.getElementById('bigBgName');
    if (bigBgName) {
        bigBgName.textContent = member.Name;
    }

    // ใส่เฉพาะ character-profile (ไม่ต้องมี big-bg-name ในนี้)
    content.querySelectorAll('.character-profile').forEach(e => e.remove());
    const profileHTML = `
        <div class="character-profile">
            <div class="character-info">
                <h1 class="character-name">${member.Name}</h1>
                <p class="character-description">${member.description}</p>
                <div class="social-links">
                    <a class="social-btn x" href="${member.X}" target="_blank">
                        <img src="../member/img/Twit.png" alt="Twitter" style="height:48px;">
                    </a>
                    <a class="social-btn twitch" href="${member.Tiktok}" target="_blank">
                        <img src="../member/img/Tiktok.png" alt="Tiktok" style="height:48px;">
                    </a>
                    <a class="social-btn youtube" href="${member.Youtube}" target="_blank">
                        <img src="../member/img/Youtube.png" alt="Youtube" style="height:48px;">
                    </a>
                </div>
            </div>
            <div>
                <img src="../Server/${member.img}" alt="${member.Name}" class="character-image">
            </div>
        </div>
    `;
    content.insertAdjacentHTML('beforeend', profileHTML);
}
