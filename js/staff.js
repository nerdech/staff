const API_BASE_URL = 'http://localhost:8080/api'; // 本番環境ではCloud RunのURLに変更

let salesChart;

// 認証チェック
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (!token) {
        window.location.href = 'index.html';
        return false;
    }
    
    if (role === 'admin') {
        window.location.href = 'admin.html';
        return false;
    }
    
    return token;
}

// ログアウト
function logout() {
    const token = checkAuth();
    if (!token) return;
    
    fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: {
            'Authorization': token
        }
    }).finally(() => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    const token = checkAuth();
    if (!token) return;
    
    const userName = localStorage.getItem('userName');
    const userId = localStorage.getItem('userId');
    
    document.getElementById('userName').textContent = userName;
    
    await loadUserProfile(userId, token);
    await loadSalesData(userId, token);
    await loadOrders(userId, token);
    await loadLevels(userId, token);
});

// ユーザー情報読み込み
async function loadUserProfile(userId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        const user = await response.json();
        
        document.getElementById('name').value = user.name || '';
        document.getElementById('businessType').value = user.businessType || 'individual';
        document.getElementById('businessName').value = user.businessName || '';
        document.getElementById('address').value = user.address || '';
        document.getElementById('birthdate').value = user.birthdate || '';
        document.getElementById('currentLevel').textContent = user.level || 1;
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

// 売上データ読み込み
async function loadSalesData(userId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/sales/${userId}`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        const salesData = await response.json();
        
        // グラフ描画
        drawSalesChart(salesData);
        
        // 統計表示
        const currentMonth = salesData[salesData.length - 1];
        const threeMonthTotal = salesData.slice(-3).reduce((sum, month) => sum + month.totalSales, 0);
        
        document.getElementById('currentMonthSales').textContent = currentMonth.totalSales.toLocaleString();
        document.getElementById('threeMonthSales').textContent = threeMonthTotal.toLocaleString();
        
        // 月別詳細表示
        displayMonthlySalesDetail(salesData);
        
    } catch (error) {
        console.error('Error loading sales:', error);
    }
}

// グラフ描画
function drawSalesChart(salesData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    
    const labels = salesData.map(data => {
        const year = data.yearMonth.substring(0, 4);
        const month = data.yearMonth.substring(4, 6);
        return `${year}/${month}`;
    });
    
    const values = salesData.map(data => data.totalSales);
    
    if (salesChart) {
        salesChart.destroy();
    }
    
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '売上',
                data: values,
                borderColor: '#333',
                backgroundColor: 'rgba(51, 51, 51, 0.1)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.parsed.y.toLocaleString() + '円';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '円';
                        }
                    }
                }
            }
        }
    });
}

// 月別詳細表示
function displayMonthlySalesDetail(salesData) {
    const container = document.getElementById('monthlySalesDetail');
    container.innerHTML = '';
    
    // 新しい月から表示
    const reversedData = [...salesData].reverse();
    
    reversedData.forEach(monthData => {
        const year = monthData.yearMonth.substring(0, 4);
        const month = monthData.yearMonth.substring(4, 6);
        
        const monthDiv = document.createElement('div');
        monthDiv.style.marginBottom = '2rem';
        
        let html = `
            <h3 style="margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e0e0e0;">
                ${year}年${month}月 - 合計: ${monthData.totalSales.toLocaleString()}円
            </h3>
        `;
        
        if (monthData.orders && monthData.orders.length > 0) {
            html += '<table class="table" style="font-size: 0.9rem;"><thead><tr><th>案件名</th><th>金額</th><th>日付</th></tr></thead><tbody>';
            
            monthData.orders.forEach(order => {
                const date = new Date(order.date).toLocaleDateString('ja-JP');
                html += `
                    <tr>
                        <td>${order.title}</td>
                        <td>${order.amount.toLocaleString()}円</td>
                        <td>${date}</td>
                    </tr>
                `;
            });
            
            html += '</tbody></table>';
        }
        
        if (monthData.manualAdjustment !== 0) {
            html += `<p style="margin-top: 0.5rem; color: #666; font-size: 0.9rem;">手入力調整: ${monthData.manualAdjustment.toLocaleString()}円</p>`;
        }
        
        if (!monthData.orders || monthData.orders.length === 0) {
            html += '<p style="color: #999;">案件データがありません</p>';
        }
        
        monthDiv.innerHTML = html;
        container.appendChild(monthDiv);
    });
}

// 案件一覧読み込み
async function loadOrders(userId, token) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        const orders = await response.json();
        const tbody = document.getElementById('ordersTable');
        tbody.innerHTML = '';
        
        if (orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">担当案件がありません</td></tr>';
            return;
        }
        
        orders.forEach(order => {
            // 自分の割当金額を取得
            const myAssignment = order.assignments.find(a => a.userId === userId);
            const myAmount = myAssignment ? myAssignment.amount : 0;
            
            const statusBadge = getStatusBadge(order.status);
            const deadline = order.deadline ? new Date(order.deadline).toLocaleDateString('ja-JP') : '-';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${order.title}</td>
                <td>${myAmount.toLocaleString()}円</td>
                <td>${deadline}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// レベル情報読み込みと進捗表示
async function loadLevels(userId, token) {
    try {
        const [levelsResponse, salesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/levels`, { headers: { 'Authorization': token } }),
            fetch(`${API_BASE_URL}/sales/${userId}`, { headers: { 'Authorization': token } })
        ]);
        
        if (!levelsResponse.ok || !salesResponse.ok) return;
        
        const levels = await levelsResponse.json();
        const salesData = await salesResponse.json();
        
        // 現在のレベルを取得
        const userResponse = await fetch(`${API_BASE_URL}/user/${userId}`, {
            headers: { 'Authorization': token }
        });
        const user = await userResponse.json();
        const currentLevel = user.level;
        
        // 3ヶ月売上合計
        const threeMonthTotal = salesData.slice(-3).reduce((sum, month) => sum + month.totalSales, 0);
        
        // 次のレベルを見つける
        const sortedLevels = levels.sort((a, b) => a.levelNumber - b.levelNumber);
        const nextLevel = sortedLevels.find(l => l.levelNumber > currentLevel);
        
        if (nextLevel) {
            const progress = (threeMonthTotal / nextLevel.requiredSales) * 100;
            const remaining = nextLevel.requiredSales - threeMonthTotal;
            
            document.getElementById('levelProgress').style.display = 'block';
            document.getElementById('progressFill').style.width = Math.min(progress, 100) + '%';
            document.getElementById('progressText').textContent = 
                `レベル${nextLevel.levelNumber}（${nextLevel.description}）まであと${remaining.toLocaleString()}円`;
        }
        
    } catch (error) {
        console.error('Error loading levels:', error);
    }
}

// ステータスバッジ
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-pending">未着手</span>',
        'in_progress': '<span class="badge badge-in-progress">進行中</span>',
        'completed': '<span class="badge badge-completed">完了</span>'
    };
    return badges[status] || status;
}

// プロフィール更新
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = checkAuth();
    if (!token) return;
    
    const userId = localStorage.getItem('userId');
    
    const data = {
        name: document.getElementById('name').value,
        businessType: document.getElementById('businessType').value,
        businessName: document.getElementById('businessName').value,
        address: document.getElementById('address').value,
        birthdate: document.getElementById('birthdate').value
    };
    
    const newPassword = document.getElementById('newPassword').value;
    if (newPassword) {
        data.newPassword = newPassword;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) throw new Error('更新に失敗しました');
        
        alert('更新しました');
        localStorage.setItem('userName', data.name);
        document.getElementById('userName').textContent = data.name;
        document.getElementById('newPassword').value = '';
        
    } catch (error) {
        alert(error.message);
    }
});
