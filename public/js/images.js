document.addEventListener('DOMContentLoaded', async () => {
    // 1. URLから現在のIDを取得
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id'); 
    
    if (!resultId) {
        console.error("処理結果IDがありません。");
        return;
    }

    // 2. API URL作成
    const apiUrl = `/api/results?id=${resultId}`;

    // 住所取得用関数（Google Maps）
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
                    let prefecture = '';
                    let municipality = '';
                    comp.forEach(c => {
                        if (c.types && c.types.includes('administrative_area_level_1')) prefecture = c.long_name;
                        if (c.types && (c.types.includes('administrative_area_level_2') || c.types.includes('locality') || c.types.includes('postal_town') || c.types.includes('sublocality'))) {
                            if (!municipality) municipality = c.long_name;
                        }
                    });
                    resolve({ formatted_address: results[0].formatted_address, prefecture, municipality });
                } else {
                    reject(new Error(status || 'No results'));
                }
            });
        });
    }

    // 住所取得用関数（Nominatim）
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
        const res = await fetch(url, { headers: { 'Referer': window.location.origin } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data) throw new Error('No result');
        const addr = data.address || {};
        let prefecture = addr.state || addr.region || '';
        const iso = addr['ISO3166-2-lvl4'] || addr['ISO3166-2'] || addr['ISO3166-2-lvl2'];
        if ((!prefecture || prefecture.startsWith('ISO')) && iso) {
            const key = String(iso).toUpperCase();
            if (ISO3166_TO_PREF[key]) prefecture = ISO3166_TO_PREF[key];
        }
        const municipality = addr.city || addr.town || addr.village || addr.county || addr.municipality || '';
        const display = `${prefecture}${prefecture && municipality ? ' ' : ''}${municipality}`.trim();
        return { formatted_address: data.display_name || display, prefecture, municipality };
    }

    try {
        // 3. APIからデータ取得
        const response = await fetch(apiUrl);
        const resultData = await response.json();

        if (response.ok) {
            console.log("結果データ:", resultData);

            const sortedImageData = resultData.imageData.sort((a, b) => {
                if (a.date_time < b.date_time) return -1;
                if (a.date_time > b.date_time) return 1;
                return 0;
            });

            // 4. 画像を画面に表示
            const container = document.querySelector('#images');
            
            sortedImageData.forEach((imageData, index) => {
                let date_time = '日時情報なし';
                if (imageData.date_time) {
                    const date = new Date(imageData.date_time);
                    date_time = date.toLocaleString('ja-JP', { 
                        year: 'numeric', month: '2-digit', day: '2-digit', 
                        hour: '2-digit', minute: '2-digit'
                    });
                }

                const hasLocation = imageData.location && typeof imageData.location.latitude === 'number' && typeof imageData.location.longitude === 'number';

                // ★ここがポイント: audioタグに id や class をつけて操作しやすくしています
                const imageItem = `
                <div class="image-item" data-index="${index}">
                    <p>${date_time}</p>
                    <p class="image-address">${hasLocation ? '住所: 取得中...' : '住所: なし'}</p>
                    <div class="image-frame">
                        <img class="image" src="${imageData.filepath}" alt="写真 ${index + 1}">
                        <img class="stamp" src="${imageData.effects.stamp}" alt="スタンプ画像">
                    </div>
                    <audio class="bgm-player" controls src="${imageData.effects.sound}" type="audio/mp3">効果音</audio>
                    <p class="num">${index + 1} / ${sortedImageData.length}</p>
                </div>
                `;
                container.insertAdjacentHTML('beforeend', imageItem);

                // 住所取得処理（変更なし）
                if (hasLocation) {
                    const lastItem = container.lastElementChild;
                    const addressEl = lastItem.querySelector('.image-address');
                    const lat = imageData.location.latitude;
                    const lon = imageData.location.longitude;
                    geocodeLatLngWithGoogle(lat, lon)
                        .then(res => {
                            const pref = res.prefecture || '';
                            const muni = res.municipality || '';
                            const display = `${pref}${pref && muni ? ' ' : ''}${muni}`.trim();
                            addressEl.textContent = display ? `住所: ${display}` : `住所: ${res.formatted_address}`;
                        })
                        .catch(() => {
                            reverseGeocodeNominatim(lat, lon)
                                .then(res => {
                                    const pref = res.prefecture || '';
                                    const muni = res.municipality || '';
                                    const display = `${pref}${pref && muni ? ' ' : ''}${muni}`.trim();
                                    addressEl.textContent = display ? `住所: ${display}` : `住所: ${res.formatted_address}`;
                                })
                                .catch(() => {
                                    addressEl.innerHTML = `住所: 取得できません (<a href="https://maps.google.com/?q=${lat},${lon}" target="_blank">地図で確認</a>)`;
                                });
                        });
                }
            });

            // ==================================================
            // ★追加機能: スクロール検知と自動再生のロジック
            // ==================================================
            const observerOptions = {
                root: null, // ビューポートを基準
                rootMargin: '0px',
                threshold: 0.6 // 画面の60%が表示されたら「見えた」と判定
            };

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    const audio = entry.target.querySelector('.bgm-player');
                    
                    if (!audio) return;

                    if (entry.isIntersecting) {
                        // 画面に入ったとき: 再生を試みる
                        // ※ブラウザのポリシーにより、ユーザーが一度でもクリックするまでは自動再生が失敗する場合があります
                        audio.currentTime = 0; // 頭出し
                        audio.play().catch(e => {
                            console.log("自動再生できませんでした（ユーザー操作待ち）:", e);
                        });
                    } else {
                        // 画面から出たとき: 停止
                        audio.pause();
                        // 次回のために時間をリセットしたい場合はここで行う
                        // audio.currentTime = 0; 
                    }
                });
            }, observerOptions);

            // すべての画像アイテムを監視対象にする
            const items = document.querySelectorAll('.image-item');
            items.forEach(item => {
                observer.observe(item);
            });
            // ==================================================

            // 削除ボタン処理
            const del_button = document.querySelector('#del-button');
            if (del_button) {
                del_button.classList.add('visible');
                del_button.addEventListener('click', async () => {
                    if (!confirm('本当にこの結果とすべての関連画像を削除しますか？')) return;
                    try {
                        const response = await fetch(`/api/results/${resultId}`, { method: 'DELETE' });
                        if (response.ok) {
                            alert('削除が完了しました。トップページに戻ります。');
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
            }

        } else {
            console.error("データ取得失敗:", resultData.error);
        }

    } catch (error) {
        console.error("通信エラー:", error);
    }
});