const API_BASE_URL = 'https://nerdech-app-4vbq53svdq-an.a.run.app/api'; // 本番環境ではCloud RunのURLに変更

let allUsers = [];
let allOrders = [];
let allLevels = [];
let currentAssignments = [];

// 認証チェック
function checkAuth() {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    
    if (!token || role !== 'admin') {
        window.location.href = 'index.html';
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

// タブ切り替え
function showTab(tabName) {
    // すべてのタブを非表示
    document.getElementById('usersTab').style.display = 'none';
    document.getElementById('ordersTab').style.display = 'none';
    document.getElementById('levelsTab').style.display = 'none';
    
    // ボタンのスタイルリセット
    document.getElementById('tabUsers').classList.remove('btn-primary');
    document.getElementById('tabUsers').classList.add('btn-secondary');
    document.getElementById('tabOrders').classList.remove('btn-primary');
    document.getElementById('tabOrders').classList.add('btn-secondary');
    document.getElementById('tabLevels').classList.remove('btn-primary');
    document.getElementById('tabLevels').classList.add('btn-secondary');
    
    // 選択したタブを表示
    if (tabName === 'users') {
        document.getElementById('usersTab').style.display = 'block';
        document.getElementById('tabUsers').classList.remove('btn-secondary');
        document.getElementById('tabUsers').classList.add('btn-primary');
    } else if (tabName === 'orders') {
        document.getElementById('ordersTab').style.display = 'block';
        document.getElementById('tabOrders').classList.remove('btn-secondary');
        document.getElementById('tabOrders').classList.add('btn-primary');
    } else if (tabName === 'levels') {
        document.getElementById('levelsTab').style.display = 'block';
        document.getElementById('tabLevels').classList.remove('btn-secondary');
        document.getElementById('tabLevels').classList.add('btn-primary');
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    const token = checkAuth();
    if (!token) return;
    
    const userName = localStorage.getItem('userName');
    document.getElementById('userName').textContent = userName;
    
    await loadUsers(token);
    await loadOrders(token);
    await loadLevels(token);
    
    // デフォルトで社員管理タブを表示
    showTab('users');
});

// ======== 社員管理 ========

async function loadUsers(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        allUsers = await response.json();
        displayUsers();
        
        // 発注モーダルの担当者セレクトボックスを更新
        updateAssignmentUserSelect();
        
    } catch (error) {
        console.error('Error loading users:', error);
        alert('ユーザー一覧の取得に失敗しました');
    }
}

function displayUsers() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    allUsers.forEach(user => {
        const roleBadge = user.role === 'admin' ? 
            '<span class="badge badge-admin">管理者</span>' : 
            '<span class="badge badge-staff">一般社員</span>';
        
        const businessType = user.businessType === 'corporate' ? '法人' : '個人';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.userId}</td>
            <td>${user.name}</td>
            <td>${businessType}${user.businessName ? ` (${user.businessName})` : ''}</td>
            <td>レベル ${user.level}</td>
            <td>${roleBadge}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.85rem; margin-right: 0.5rem;" 
                        onclick="editUser('${user.userId}')">編集</button>
                <button class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.85rem; margin-right: 0.5rem;" 
                        onclick="viewSales('${user.userId}')">売上</button>
                <button class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.85rem;" 
                        onclick="deleteUser('${user.userId}')">削除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    form.reset();
    
    if (userId) {
        // 編集モード
        const user = allUsers.find(u => u.userId === userId);
        if (!user) return;
        
        document.getElementById('userModalTitle').textContent = 'ユーザー編集';
        document.getElementById('editUserId').value = userId;
        document.getElementById('userId').value = userId;
        document.getElementById('userId').disabled = true;
        document.getElementById('password').required = false;
        document.getElementById('passwordHint').style.display = 'inline';
        
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userBusinessType').value = user.businessType || 'individual';
        document.getElementById('userBusinessName').value = user.businessName || '';
        document.getElementById('userAddress').value = user.address || '';
        document.getElementById('userBirthdate').value = user.birthdate || '';
        document.getElementById('userRole').value = user.role || 'staff';
        document.getElementById('userLevel').value = user.level || 1;
    } else {
        // 新規作成モード
        document.getElementById('userModalTitle').textContent = 'ユーザー追加';
        document.getElementById('userId').disabled = false;
        document.getElementById('password').required = true;
        document.getElementById('passwordHint').style.display = 'none';
    }
    
    modal.classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
}

function editUser(userId) {
    openUserModal(userId);
}

async function deleteUser(userId) {
    if (!confirm(`ユーザー "${userId}" を削除してもよろしいですか？`)) return;
    
    const token = checkAuth();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('削除に失敗しました');
        
        alert('ユーザーを削除しました');
        await loadUsers(token);
        
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = checkAuth();
    if (!token) return;
    
    const editUserId = document.getElementById('editUserId').value;
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    const data = {
        userId: userId,
        name: document.getElementById('userName').value,
        businessType: document.getElementById('userBusinessType').value,
        businessName: document.getElementById('userBusinessName').value,
        address: document.getElementById('userAddress').value,
        birthdate: document.getElementById('userBirthdate').value,
        role: document.getElementById('userRole').value,
        level: parseInt(document.getElementById('userLevel').value)
    };
    
    if (password) {
        data.password = password;
    }
    
    try {
        let response;
        if (editUserId) {
            // 更新
            response = await fetch(`${API_BASE_URL}/user/${editUserId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            // 新規作成
            response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '保存に失敗しました');
        }
        
        alert(editUserId ? '更新しました' : '作成しました');
        closeUserModal();
        await loadUsers(token);
        
    } catch (error) {
        alert(error.message);
    }
});

// ======== 発注管理 ========

async function loadOrders(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        allOrders = await response.json();
        displayOrders();
        
    } catch (error) {
        console.error('Error loading orders:', error);
        alert('発注一覧の取得に失敗しました');
    }
}

function displayOrders() {
    const tbody = document.getElementById('ordersTable');
    tbody.innerHTML = '';
    
    if (allOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">発注データがありません</td></tr>';
        return;
    }
    
    allOrders.forEach(order => {
        const statusBadge = getStatusBadge(order.status);
        const deadline = order.deadline ? new Date(order.deadline).toLocaleDateString('ja-JP') : '-';
        
        // 担当者一覧
        const assignees = order.assignments.map(a => {
            const user = allUsers.find(u => u.userId === a.userId);
            return user ? `${user.name}(${a.amount.toLocaleString()}円)` : `${a.userId}(${a.amount.toLocaleString()}円)`;
        }).join(', ');
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.title}</td>
            <td>${order.totalAmount.toLocaleString()}円</td>
            <td>${assignees || '-'}</td>
            <td>${deadline}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.85rem; margin-right: 0.5rem;" 
                        onclick="editOrder('${order.orderId}')">編集</button>
                <button class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.85rem;" 
                        onclick="deleteOrder('${order.orderId}')">削除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge badge-pending">未着手</span>',
        'in_progress': '<span class="badge badge-in-progress">進行中</span>',
        'completed': '<span class="badge badge-completed">完了</span>'
    };
    return badges[status] || status;
}

function updateAssignmentUserSelect() {
    const select = document.getElementById('assignmentUserId');
    select.innerHTML = '<option value="">担当者を選択...</option>';
    
    allUsers.filter(u => u.role === 'staff').forEach(user => {
        const option = document.createElement('option');
        option.value = user.userId;
        option.textContent = `${user.name} (${user.userId})`;
        select.appendChild(option);
    });
}

function openOrderModal(orderId = null) {
    const modal = document.getElementById('orderModal');
    const form = document.getElementById('orderForm');
    form.reset();
    currentAssignments = [];
    
    if (orderId) {
        // 編集モード
        const order = allOrders.find(o => o.orderId === orderId);
        if (!order) return;
        
        document.getElementById('orderModalTitle').textContent = '発注編集';
        document.getElementById('editOrderId').value = orderId;
        document.getElementById('orderTitle').value = order.title;
        document.getElementById('orderTotalAmount').value = order.totalAmount;
        document.getElementById('orderDeadline').value = order.deadline ? order.deadline.split('T')[0] : '';
        document.getElementById('orderStatus').value = order.status;
        
        currentAssignments = [...order.assignments];
    } else {
        // 新規作成モード
        document.getElementById('orderModalTitle').textContent = '発注作成';
    }
    
    updateAssignmentsList();
    modal.classList.add('active');
}

function closeOrderModal() {
    document.getElementById('orderModal').classList.remove('active');
}

function editOrder(orderId) {
    openOrderModal(orderId);
}

async function deleteOrder(orderId) {
    if (!confirm('この発注を削除してもよろしいですか？')) return;
    
    const token = checkAuth();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('削除に失敗しました');
        
        alert('発注を削除しました');
        await loadOrders(token);
        
    } catch (error) {
        alert(error.message);
    }
}

function addAssignment() {
    const userId = document.getElementById('assignmentUserId').value;
    const amount = parseInt(document.getElementById('assignmentAmount').value);
    
    if (!userId || !amount || amount <= 0) {
        alert('担当者と金額を入力してください');
        return;
    }
    
    // 既に追加されているか確認
    const exists = currentAssignments.find(a => a.userId === userId);
    if (exists) {
        alert('この担当者は既に追加されています');
        return;
    }
    
    currentAssignments.push({ userId, amount });
    
    document.getElementById('assignmentUserId').value = '';
    document.getElementById('assignmentAmount').value = '';
    
    updateAssignmentsList();
}

function removeAssignment(userId) {
    currentAssignments = currentAssignments.filter(a => a.userId !== userId);
    updateAssignmentsList();
}

function updateAssignmentsList() {
    const container = document.getElementById('assignmentsList');
    const totalAmount = parseInt(document.getElementById('orderTotalAmount').value) || 0;
    
    if (currentAssignments.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 0.9rem;">担当者が追加されていません</p>';
    } else {
        container.innerHTML = '';
        currentAssignments.forEach(assignment => {
            const user = allUsers.find(u => u.userId === assignment.userId);
            const userName = user ? user.name : assignment.userId;
            
            const div = document.createElement('div');
            div.className = 'assignment-item';
            div.innerHTML = `
                <span>${userName}: ${assignment.amount.toLocaleString()}円</span>
                <button class="assignment-remove" onclick="removeAssignment('${assignment.userId}')">×</button>
            `;
            container.appendChild(div);
        });
    }
    
    // 合計表示
    const assignmentTotal = currentAssignments.reduce((sum, a) => sum + a.amount, 0);
    document.getElementById('assignmentTotal').textContent = assignmentTotal.toLocaleString();
    document.getElementById('totalAmountDisplay').textContent = totalAmount.toLocaleString();
}

// 総額が変更されたときに合計表示を更新
document.getElementById('orderTotalAmount').addEventListener('input', updateAssignmentsList);

document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = checkAuth();
    if (!token) return;
    
    const editOrderId = document.getElementById('editOrderId').value;
    const totalAmount = parseInt(document.getElementById('orderTotalAmount').value);
    
    // 割り振り合計チェック
    const assignmentTotal = currentAssignments.reduce((sum, a) => sum + a.amount, 0);
    if (assignmentTotal !== totalAmount) {
        alert(`割り振り合計（${assignmentTotal.toLocaleString()}円）が総額（${totalAmount.toLocaleString()}円）と一致しません`);
        return;
    }
    
    const data = {
        title: document.getElementById('orderTitle').value,
        totalAmount: totalAmount,
        deadline: document.getElementById('orderDeadline').value,
        status: document.getElementById('orderStatus').value,
        assignments: currentAssignments
    };
    
    try {
        let response;
        if (editOrderId) {
            // 更新
            response = await fetch(`${API_BASE_URL}/orders/${editOrderId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } else {
            // 新規作成
            response = await fetch(`${API_BASE_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '保存に失敗しました');
        }
        
        alert(editOrderId ? '更新しました' : '作成しました');
        closeOrderModal();
        await loadOrders(token);
        
    } catch (error) {
        alert(error.message);
    }
});

// ======== レベル管理 ========

async function loadLevels(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/levels`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        allLevels = await response.json();
        displayLevels();
        
    } catch (error) {
        console.error('Error loading levels:', error);
        alert('レベル一覧の取得に失敗しました');
    }
}

function displayLevels() {
    const tbody = document.getElementById('levelsTable');
    tbody.innerHTML = '';
    
    if (allLevels.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">レベル設定がありません</td></tr>';
        return;
    }
    
    allLevels.forEach(level => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>レベル ${level.levelNumber}</td>
            <td>${level.description}</td>
            <td>${level.requiredSales.toLocaleString()}円</td>
            <td>
                <button class="btn btn-secondary" style="padding: 0.4rem 1rem; font-size: 0.85rem; margin-right: 0.5rem;" 
                        onclick="editLevel('${level.levelId}')">編集</button>
                <button class="btn btn-danger" style="padding: 0.4rem 1rem; font-size: 0.85rem;" 
                        onclick="deleteLevel('${level.levelId}')">削除</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openLevelModal(levelId = null) {
    const modal = document.getElementById('levelModal');
    const form = document.getElementById('levelForm');
    form.reset();
    
    if (levelId) {
        const level = allLevels.find(l => l.levelId === levelId);
        if (!level) return;
        
        document.getElementById('levelModalTitle').textContent = 'レベル編集';
        document.getElementById('editLevelId').value = levelId;
        document.getElementById('levelNumber').value = level.levelNumber;
        document.getElementById('levelDescription').value = level.description || '';
        document.getElementById('levelRequiredSales').value = level.requiredSales;
    } else {
        document.getElementById('levelModalTitle').textContent = 'レベル追加';
    }
    
    modal.classList.add('active');
}

function closeLevelModal() {
    document.getElementById('levelModal').classList.remove('active');
}

function editLevel(levelId) {
    openLevelModal(levelId);
}

async function deleteLevel(levelId) {
    if (!confirm('このレベル設定を削除してもよろしいですか？')) return;
    
    const token = checkAuth();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/levels/${levelId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('削除に失敗しました');
        
        alert('レベルを削除しました');
        await loadLevels(token);
        
    } catch (error) {
        alert(error.message);
    }
}

document.getElementById('levelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const token = checkAuth();
    if (!token) return;
    
    const editLevelId = document.getElementById('editLevelId').value;
    
    const data = {
        levelNumber: parseInt(document.getElementById('levelNumber').value),
        description: document.getElementById('levelDescription').value,
        requiredSales: parseInt(document.getElementById('levelRequiredSales').value)
    };
    
    if (editLevelId) {
        data.levelId = editLevelId;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/levels`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || '保存に失敗しました');
        }
        
        alert(editLevelId ? '更新しました' : '作成しました');
        closeLevelModal();
        await loadLevels(token);
        
    } catch (error) {
        alert(error.message);
    }
});

// ======== 売上調整 ========

async function viewSales(userId) {
    const token = checkAuth();
    if (!token) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/sales/${userId}`, {
            headers: { 'Authorization': token }
        });
        
        if (!response.ok) throw new Error('データの取得に失敗しました');
        
        const salesData = await response.json();
        const user = allUsers.find(u => u.userId === userId);
        
        const modal = document.getElementById('salesModal');
        const content = document.getElementById('salesModalContent');
        
        let html = `<h3 style="margin-bottom: 1.5rem;">${user.name} の売上データ</h3>`;
        
        const reversedData = [...salesData].reverse();
        
        reversedData.forEach(monthData => {
            const year = monthData.yearMonth.substring(0, 4);
            const month = monthData.yearMonth.substring(4, 6);
            
            html += `
                <div style="margin-bottom: 2rem; padding: 1rem; background-color: #f8f9fa; border-radius: 4px;">
                    <h4 style="margin-bottom: 1rem;">${year}年${month}月</h4>
                    <p>発注からの売上: ${(monthData.totalSales - monthData.manualAdjustment).toLocaleString()}円</p>
                    <p>手入力調整: ${monthData.manualAdjustment.toLocaleString()}円</p>
                    <p style="font-weight: bold; font-size: 1.1rem;">合計: ${monthData.totalSales.toLocaleString()}円</p>
                    
                    <div style="margin-top: 1rem;">
                        <label>手入力調整額を変更:</label>
                        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
                            <input type="number" id="adjust_${monthData.yearMonth}" value="${monthData.manualAdjustment}" 
                                   style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                            <button class="btn btn-primary" style="padding: 0.5rem 1rem;" 
                                    onclick="adjustSales('${userId}', '${monthData.yearMonth}')">更新</button>
                        </div>
                    </div>
                    
                    ${monthData.orders && monthData.orders.length > 0 ? `
                        <details style="margin-top: 1rem;">
                            <summary style="cursor: pointer; color: #333; font-weight: 500;">案件詳細を表示</summary>
                            <table class="table" style="margin-top: 0.5rem; font-size: 0.9rem;">
                                <thead>
                                    <tr><th>案件名</th><th>金額</th><th>日付</th></tr>
                                </thead>
                                <tbody>
                                    ${monthData.orders.map(order => `
                                        <tr>
                                            <td>${order.title}</td>
                                            <td>${order.amount.toLocaleString()}円</td>
                                            <td>${new Date(order.date).toLocaleDateString('ja-JP')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </details>
                    ` : ''}
                </div>
            `;
        });
        
        html += `
            <div style="display: flex; justify-content: flex-end; margin-top: 2rem;">
                <button class="btn btn-secondary" onclick="closeSalesModal()">閉じる</button>
            </div>
        `;
        
        content.innerHTML = html;
        modal.classList.add('active');
        
    } catch (error) {
        alert('売上データの取得に失敗しました');
    }
}

function closeSalesModal() {
    document.getElementById('salesModal').classList.remove('active');
}

async function adjustSales(userId, yearMonth) {
    const token = checkAuth();
    if (!token) return;
    
    const adjustment = parseInt(document.getElementById(`adjust_${yearMonth}`).value);
    
    try {
        const response = await fetch(`${API_BASE_URL}/sales/${userId}/${yearMonth}/adjust`, {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ adjustment })
        });
        
        if (!response.ok) throw new Error('調整に失敗しました');
        
        alert('売上を調整しました');
        
        closeSalesModal();
        await viewSales(userId);
        
    } catch (error) {
        alert(error.message);
    }
}
