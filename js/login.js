const API_BASE_URL = 'https://nerdech-app-4vbq53svdq-an.a.run.app/api'; // 本番環境ではCloud RunのURLに変更

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    
    errorDiv.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, password })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'ログインに失敗しました');
        }
        
        const data = await response.json();
        
        // トークンとユーザー情報を保存
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userRole', data.role);
        
        // 権限に応じてリダイレクト
        if (data.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'staff.html';
        }
        
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
});
