// ----------------------------------------------------
//  起動ロジック 1: APIキーを取得し、Google Maps APIをロードする
// ----------------------------------------------------
async function loadGoogleMapsScript() {
    try {
        // 1. APIエンドポイントからキーを取得
        const response = await fetch('/api/map-key');
        const data = await response.json();
        const apiKey = data.apiKey;

        if (!apiKey) {
            console.error("APIキーが取得できませんでした。");
            document.querySelector('#map').innerHTML = '<p style="text-align: center; padding: 20px; color: #c00;">Google Maps API キーが設定されていません</p>';
            return;
        }

        // 2. Google Maps APIをロードする <script> 要素を動的に作成
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        // 取得したキーを使用し、コールバック関数 (initMap) を指定
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=startMapProcess`; 
        // 既存のデータ取得と地図表示ロジックを 'startMapProcess' としてコールバックに指定

        // 3. <head> に挿入し、ロードを開始
        document.head.appendChild(script);

    } catch (error) {
        console.error("APIキーの取得またはスクリプトのロード中にエラーが発生しました:", error);
    }
}

// DOMContentLoaded イベントで API キーの取得を開始
document.addEventListener('DOMContentLoaded', loadGoogleMapsScript);


// ----------------------------------------------------
//  起動ロジック 2: Google Maps APIのコールバック関数 
// ----------------------------------------------------
// 元の document.addEventListener のコールバックの中身をここに移す
window.startMapProcess = async function() {
    console.log("Google Maps APIが正常にロードされました。データ取得を開始します。");
    
    // 既存のコードはここから始まります
    // ----------------------------------------------------

    // 1. URLから現在のIDを取得 (例: results/?id=1700000000000)
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('id'); 
    
    if (!resultId) {
        console.error("処理結果IDがありません。");
        return;
    }

    // 2. クエリパラメータ付きのURLを作成
    const apiUrl = `/api/results?id=${resultId}`;

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

            // 4. 有効な位置情報を持つ画像をフィルタリング
            const validLocations = sortedImageData.filter(data => 
                data.location && 
                typeof data.location.latitude === 'number' && 
                typeof data.location.longitude === 'number'
            );

            if (validLocations.length === 0) {
                console.warn("位置情報が含まれた画像がありません。");
                const container = document.querySelector('#map');
                container.innerHTML = '<p class="error">位置情報が利用できません</p>';
                return;
            }

            // 5. Google Map を初期化
            initializeMap(validLocations);

        } else {
            console.error("データ取得失敗:", resultData.error);
            const container = document.querySelector('#map');
            container.innerHTML = '<p class="error">データの取得に失敗しました</p>';
        }

    } catch (error) {
        console.error("通信エラー:", error);
        const container = document.querySelector('#map');
        container.innerHTML = '<p class="error">通信エラーが発生しました</p>';
    }
};

/**
 * Google Map を初期化し、マーカーと経路を表示
 * @param {Array} locations - 位置情報を含む画像データの配列
 */
function initializeMap(locations) {
    const container = document.querySelector('#map-container');
    
    // 中心座標を計算（最初の位置情報を使用）
    const center = {
        lat: locations[0].location.latitude,
        lng: locations[0].location.longitude
    };

    // Google Map を作成
    const map = new google.maps.Map(container, {
        zoom: 13,
        center: center,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true
    });

    // マーカーと経路のデータを準備
    const markers = [];
    const path = [];

    // 各撮影地点にマーカーを配置
    locations.forEach((data, index) => {
        const position = {
            lat: data.location.latitude,
            lng: data.location.longitude
        };

        path.push(position);

        // マーカーの色を決定（最初=緑、最後=赤、中間=黄）
        let color = '#FFC837'; // デフォルトは黄
        if (index === 0) {
            color = '#34A853'; // 緑（開始地点）
        } else if (index === locations.length - 1) {
            color = '#EA4335'; // 赤（終了地点）
        }

        // SVGで番号付きのマーカーアイコンを動的生成（中央に番号を表示）
        const iconUrl = generateNumberedMarkerDataUrl(index + 1, color);

        const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: `撮影地点 ${index + 1}`,
            icon: {
                url: iconUrl,
                scaledSize: new google.maps.Size(40, 40)
            }
        });

        // マーカーのクリックイベント
        marker.addListener('click', () => {
            showInfoWindow(map, marker, data, index);
        });

        markers.push(marker);
    });

    // 撮影経路を描画（Polyline）
    const polyline = new google.maps.Polyline({
        path: path,
        geodesic: true,
        strokeColor: '#4285F4',
        strokeOpacity: 0.7,
        strokeWeight: 3,
        map: map
    });

    // 地図の表示範囲を自動調整
    const bounds = new google.maps.LatLngBounds();
    path.forEach(pos => bounds.extend(pos));
    map.fitBounds(bounds, 50);

    // 地図表示と画像表示の切り替えボタンの設定
    const toggleButton = document.querySelector('#toggle-button');
    toggleButton.classList.add('visible');
    toggleButton.addEventListener('click', () => {
        container.classList.toggle('visible');
        const imagesContainer = document.querySelector('#images');
        imagesContainer.classList.toggle('visible');
        if (container.classList.contains('visible')) {
            toggleButton.textContent = 'スライドショーを表示';
        } else {
            toggleButton.textContent = '旅行経路を表示';
        }
    });
}

/**
 * マーカークリック時の情報ウィンドウを表示
 * @param {google.maps.Map} map
 * @param {google.maps.Marker} marker
 * @param {Object} data - 画像データ
 * @param {number} index - インデックス
 */
function showInfoWindow(map, marker, data, index) {
    // 既存のInfoWindow があれば閉じる
    if (window.currentInfoWindow) {
        window.currentInfoWindow.close();
    }

    // 撮影日時をフォーマット
    let dateStr = '日時不明';
    if (data.date_time) {
        const date = new Date(data.date_time);
        dateStr = date.toLocaleString('ja-JP', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 情報ウィンドウのコンテンツ
    const content = `
        <div class="map-info-window">
            <!-- <p><strong>撮影地点 ${index + 1}</strong></p> -->
            <p>${dateStr}</p>
            <img src="${data.filepath}" alt="写真 ${index + 1}" style="width: 100%; height: auto; margin-top: 8px; border-radius: 4px;">
            <!-- <p>緯度: ${data.location.latitude.toFixed(5)}</p> -->
            <!-- <p>経度: ${data.location.longitude.toFixed(5)}</p> -->
        </div>
    `;

    const infoWindow = new google.maps.InfoWindow({
        content: content
    });

    infoWindow.open(map, marker);
    window.currentInfoWindow = infoWindow;
}

/**
 * 指定した番号と色で円形SVGマーカーを生成し、data URL を返す
 * @param {number} number
 * @param {string} color - 背景色の16進カラー（例: '#34A853'）
 * @returns {string} data:image/svg+xml;utf8,...
 */
function generateNumberedMarkerDataUrl(number, color) {
        const size = 80; // SVGピクセルサイズ（高解像度でも綺麗に見える）
        const radius = 30;
        const text = String(number);
        // テキスト色は背景に応じて白を使う（簡易判定）
        const textColor = '#FFFFFF';

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
        <svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>
            <circle cx='${size/2}' cy='${size/2 - 4}' r='${radius}' fill='${color}' stroke='#ffffff' stroke-width='2'/>
            <text x='50%' y='50%' dy='6' text-anchor='middle' fill='${textColor}' font-family='Arial, Helvetica, sans-serif' font-size='28' font-weight='700'>${text}</text>
        </svg>`;

        return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}