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

            // 4. 画像を画面に表示

            const container = document.querySelector('#images');
            sortedImageData.forEach((imageData, index) => {
                let date_time = '日時情報なし';
                if (imageData.date_time) {
                    // YYYY-MM-DDTHH:MM:SS 形式から日付と時刻を抽出・整形
                    const date = new Date(imageData.date_time);
                    date_time = date.toLocaleString('ja-JP', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit', second: '2-digit' 
                    });
                }

                let location = '場所情報なし';
                if (imageData.location && imageData.location.latitude && imageData.location.longitude) {
                    const lat = imageData.location.latitude.toFixed(5);
                    const lon = imageData.location.longitude.toFixed(5);
                    location = `緯度: ${lat}, 経度: ${lon}`;
                    
                    // Google Mapsへのリンクを追加することも可能
                    location += ` (<a href="https://maps.google.com/?q=${lat},${lon}" target="_blank">地図で確認</a>)`;
                }

                const imageItem = `
                <div class="image-item">
                    <p>撮影日時： ${date_time}</p>
                    <p>撮影場所： ${location}</p>
                    <p>推定場所： ${imageData.analysis.scenery}</p>
                    <p>推定感情： ${imageData.analysis.emotion}</p>
                    <div class="image-frame">
                        <img class="image" src="${imageData.filepath}" alt="写真 ${index + 1}">
                        <img class="stamp" src="${imageData.effects.stamp}" alt="スタンプ画像">
                    </div>
                    <audio controls src="${imageData.effects.sound}" type="audio/mp3">効果音</audio>
                    <p class="num">${index + 1} / ${sortedImageData.length}</p>
                </div>
                `
                container.insertAdjacentHTML('beforeend', imageItem);
            });

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