document.addEventListener('DOMContentLoaded', async () => {
    // 1. URLから現在のIDを取得 (例: results/?id=1700000000000)
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id'); 
    
    if (!resultId) {
        console.error("処理結果IDがありません。");
        return;
    }

    // 2. クエリパラメータ付きのURLを作成
    const apiUrl = `/api/results?id=${resultId}`; //⭐️ IDを直接URLに結合
    
    // または、URLSearchParamsを使う（特殊文字がある場合に安全）
    // const params = new URLSearchParams({ id: resultId });
    // const apiUrl = `/api/results?${params.toString()}`;

    /**
     * 緯度経度から住所を取得（Google Maps JS の Geocoder を使用）
     * Promise を返す。Google API が利用できない場合は reject する。
     */
    function geocodeLatLngWithGoogle(lat, lng) {
        return new Promise((resolve, reject) => {
            if (!window.google || !google.maps || !google.maps.Geocoder) {
                return reject(new Error('Google Maps Geocoder is not available'));
            }
            const geocoder = new google.maps.Geocoder();
            const latlng = { lat: Number(lat), lng: Number(lng) };
            geocoder.geocode({ location: latlng }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const comp = results[0].address_components || [];
                    // 抽出ロジック: 都道府県と市区町村
                    let prefecture = '';
                    let municipality = '';
                    comp.forEach(c => {
                        if (c.types && c.types.includes('administrative_area_level_1')) {
                            prefecture = c.long_name;
                        }
                        // 市区町村に相当する型はいくつかある
                        if (c.types && (c.types.includes('administrative_area_level_2') || c.types.includes('locality') || c.types.includes('postal_town') || c.types.includes('sublocality'))) {
                            if (!municipality) municipality = c.long_name;
                        }
                    });
                    resolve({
                        formatted_address: results[0].formatted_address,
                        prefecture,
                        municipality
                    });
                } else {
                    reject(new Error(status || 'No results'));
                }
            });
        });
    }

    /**
     * Nominatim による逆ジオコーディング（フォールバック）
     * ブラウザから直接叩くため、過負荷に注意。小規模な利用のみ推奨。
     */
    // ISO 3166-2:JP コードを都道府県名に変換するマップ
    const ISO3166_TO_PREF = {
        'JP-01': '北海道','JP-02': '青森県','JP-03': '岩手県','JP-04': '宮城県','JP-05': '秋田県','JP-06': '山形県','JP-07': '福島県',
        'JP-08': '茨城県','JP-09': '栃木県','JP-10': '群馬県','JP-11': '埼玉県','JP-12': '千葉県','JP-13': '東京都','JP-14': '神奈川県',
        'JP-15': '新潟県','JP-16': '富山県','JP-17': '石川県','JP-18': '福井県','JP-19': '山梨県','JP-20': '長野県','JP-21': '岐阜県',
        'JP-22': '静岡県','JP-23': '愛知県','JP-24': '三重県','JP-25': '滋賀県','JP-26': '京都府','JP-27': '大阪府','JP-28': '兵庫県',
        'JP-29': '奈良県','JP-30': '和歌山県','JP-31': '鳥取県','JP-32': '島根県','JP-33': '岡山県','JP-34': '広島県','JP-35': '山口県',
        'JP-36': '徳島県','JP-37': '香川県','JP-38': '愛媛県','JP-39': '高知県','JP-40': '福岡県','JP-41': '佐賀県','JP-42': '長崎県',
        'JP-43': '熊本県','JP-44': '大分県','JP-45': '宮崎県','JP-46': '鹿児島県','JP-47': '沖縄県'
    };

    async function reverseGeocodeNominatim(lat, lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=ja`;
        const res = await fetch(url, {
            // ブラウザでは User-Agent を設定できないため Referer を付ける
            headers: { 'Referer': window.location.origin }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data) throw new Error('No result');
        const addr = data.address || {};
        // Nominatim のフィールド名に依存して都道府県と市区町村を決定
        let prefecture = addr.state || addr.region || '';
        // 一部レスポンスで ISO コードが返る場合はマップで変換
        const iso = addr['ISO3166-2-lvl4'] || addr['ISO3166-2'] || addr['ISO3166-2-lvl2'];
        if ((!prefecture || prefecture.startsWith('ISO')) && iso) {
            const key = String(iso).toUpperCase();
            if (ISO3166_TO_PREF[key]) prefecture = ISO3166_TO_PREF[key];
        }
        // 市区町村系を優先して取得
        const municipality = addr.city || addr.town || addr.village || addr.county || addr.municipality || '';
        const display = `${prefecture}${prefecture && municipality ? ' ' : ''}${municipality}`.trim();
        return { formatted_address: data.display_name || display, prefecture, municipality };
    }

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
                        hour: '2-digit', minute: '2-digit'
                    });
                }

                const hasLocation = imageData.location && typeof imageData.location.latitude === 'number' && typeof imageData.location.longitude === 'number';

                const imageItem = `
                <div class="image-item">
                    <p>${date_time}</p>
                    <p class="image-address">${hasLocation ? '住所: 取得中...' : '住所: なし'}</p>
                    <div class="image-frame">
                        <img class="image" src="${imageData.filepath}" alt="写真 ${index + 1}">
                        <img class="stamp" src="${imageData.effects.stamp}" alt="スタンプ画像">
                    </div>
                    <audio controls src="${imageData.effects.sound}" type="audio/mp3">効果音</audio>
                    <p class="num">${index + 1} / ${sortedImageData.length}</p>
                </div>
                `;
                container.insertAdjacentHTML('beforeend', imageItem);

                // 住所の非同期取得（Google Geocoder が利用可能な場合）
                if (hasLocation) {
                    const lastItem = container.lastElementChild;
                    const addressEl = lastItem.querySelector('.image-address');
                    const lat = imageData.location.latitude;
                    const lon = imageData.location.longitude;

                    geocodeLatLngWithGoogle(lat, lon)
                        .then(res => {
                            // Google の結果から都道府県・市区町村を優先表示
                            const pref = res.prefecture || '';
                            const muni = res.municipality || '';
                            const display = `${pref}${pref && muni ? ' ' : ''}${muni}`.trim();
                            addressEl.textContent = display ? `住所: ${display}` : `住所: ${res.formatted_address}`;
                        })
                        .catch(() => {
                            // Google が利用できない場合は Nominatim を試す
                            reverseGeocodeNominatim(lat, lon)
                                .then(res => {
                                    const pref = res.prefecture || '';
                                    const muni = res.municipality || '';
                                    const display = `${pref}${pref && muni ? ' ' : ''}${muni}`.trim();
                                    addressEl.textContent = display ? `住所: ${display}` : `住所: ${res.formatted_address}`;
                                })
                                .catch(() => {
                                    // 取得できない場合は外部の地図リンクを表示
                                    addressEl.innerHTML = `住所: 取得できません (<a href="https://maps.google.com/?q=${lat},${lon}" target="_blank">地図で確認</a>)`;
                                });
                        });
                }
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