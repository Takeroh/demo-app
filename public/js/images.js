document.addEventListener('DOMContentLoaded', async () => {
    // 1. URLから現在のIDを取得 (例: results/?id=1700000000000)
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id'); 
    
    if (!resultId) {
        console.error("処理結果IDがありません。");
        return;
    }

    // 2. クエリパラメータ付きのURLを作成
    const apiUrl = `/api/results?id=${resultId}`; // ⭐️ IDを直接URLに結合
    
    // または、URLSearchParamsを使う（特殊文字がある場合に安全）
    // const params = new URLSearchParams({ id: resultId });
    // const apiUrl = `/api/results?${params.toString()}`;

    try {
        // 3. APIにアクセス
        const response = await fetch(apiUrl);
        const resultData = await response.json();

        if (response.ok) {
            console.log("結果データ:", resultData);
            const container = document.querySelector('#images');
            for (const imageUrl of resultData.imageUrls) {
                // 画像要素を作成してコンテナに追加
                const img = document.createElement("img");
                img.className = "image";
                img.src = imageUrl; // 直接URLを使用
                container.appendChild(img);
            }
            const del_button = document.querySelector('#del-button');
            del_button.classList.add('visible');
            del_button.addEventListener('click', async () => {
                if (!confirm('本当にこの結果とすべての関連画像を削除しますか？')) {
                    return;
                }

                try {
                    const response = await fetch(`/api/results/${resultId}`, {
                        method: 'DELETE' // ⭐️ DELETEメソッドでAPIを呼び出す
                    });

                    if (response.ok) {
                        alert('削除が完了しました。トップページに戻ります。');
                        // 削除後、ホームなど他のページに遷移させる
                        window.location.href = '/'; 
                    } else {
                        const errorResult = await response.json();
                        alert(`削除に失敗しました: ${errorResult.error}`);
                    }
                } catch (error) {
                    alert('通信エラーにより削除できませんでした。');
                    console.error(error);
                }
            });

        } else {
            console.error("データ取得失敗:", resultData.error);
        }

    } catch (error) {
        console.error("通信エラー:", error);
    }
});