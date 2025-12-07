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

            const sortedImageData = resultData.imageData.sort((a, b) => {
                // 撮影日時順にソート（ISO 8601形式の文字列として直接比較）
                if (a.date_time < b.date_time) {
                    return -1; // a を b より前に配置
                }
                if (a.date_time > b.date_time) {
                    return 1;  // a を b より後に配置
                }
                return 0; // 順序変更なし
            });

            // 4. マップを画面に表示
            const container = document.querySelector('#map');
            const map = `<p>マップ</p>` // ここに地図埋め込みコードを追加（今はただの文字列）
            container.insertAdjacentHTML('beforeend', map);


        } else {
            console.error("データ取得失敗:", resultData.error);
        }

    } catch (error) {
        console.error("通信エラー:", error);
    }
});