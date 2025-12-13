document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('photo-files');
    const fileSelect = document.getElementById("file-select");
    const form = document.getElementById('upload-form');
    const statusMessage = document.getElementById('status-message');
    const uploadButton = document.getElementById('submit-button');

    const spinner = document.getElementById("loading-spinner"); // ← スピナー

    // -------------------------------
    // ファイル選択ボタン（擬似クリック）
    // -------------------------------
    fileSelect.addEventListener("click", () => fileInput.click());

    // -------------------------------
    // ファイル選択時の表示処理
    // -------------------------------
    fileInput.addEventListener('change', function() {
        const statusText = document.querySelector('.file-status-text');

        if (this.files.length > 0) {
            statusText.textContent =
                this.multiple ? `${this.files.length} 個のファイルが選択されました`
                              : this.files[0].name;

            uploadButton.classList.add('valid'); 
        } else {
            statusText.textContent = '選択されていません';
        }
    });

    // -------------------------------
    // アップロード実行処理
    // -------------------------------
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const files = fileInput.files;

        if (files.length === 0) {
            statusMessage.textContent = 'ファイルを選択してください。';
            return;
        }

        // --------------------------
        // UIロック & スピナーON
        // --------------------------
        uploadButton.disabled = true;
        spinner.classList.remove("hidden");    // ← スピナー表示
        statusMessage.textContent = 'アップロード中... サーバーで画像処理しています。';
        statusMessage.style.color = 'orange';

        // FormData 準備
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('photos', files[i]);
        }

        try {
            // --------------------------
            // バックエンドへ送信
            // --------------------------
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData 
            });

            const result = await response.json();

            // --------------------------
            // 成功処理
            // --------------------------
            if (response.ok) {
                const redirectPath = result.redirectUrl;

                statusMessage.textContent =
                    `✅ 処理完了！ ${result.fileCount} 枚を処理しました。画面遷移します…`;
                statusMessage.style.color = 'green';

                // 遷移前に少しだけ“完了感”を見せる
                setTimeout(() => {
                    window.location.href = redirectPath;
                }, 1200);

            } else {
                // --------------------------
                // サーバーエラーなど
                // --------------------------
                statusMessage.textContent = `❌ 処理失敗: ${result.error || response.statusText}`;
                statusMessage.style.color = 'red';

                uploadButton.disabled = false;
                spinner.classList.add("hidden"); // ← スピナー非表示
            }

        } catch (error) {
            // --------------------------
            // 通信エラー
            // --------------------------
            statusMessage.textContent = `❌ 通信エラー: ${error.message}`;
            statusMessage.style.color = 'red';

            uploadButton.disabled = false;
            spinner.classList.add("hidden"); // ← スピナー非表示
        }
    });
});
