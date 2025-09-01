document.addEventListener('DOMContentLoaded', () => {
    fetch('https://lestialv.ddns.net:3001/api/orders/unread-count')
        .then(res => res.json())
        .then(data => {
            const badge = document.getElementById('orderNotify');
            if (data.success && data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        });
});