document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('upload-form');
    const statusMessage = document.getElementById('status-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // フォームの標準の送信動作をキャンセル

        const fileInput = document.getElementById('photo-files');
        const files = fileInput.files;

        if (files.length === 0) {
            statusMessage.textContent = 'ファイルを選択してください。';
            return;
        }

        // 1. FormDataオブジェクトを作成
        // ファイルをアップロードするために必要な形式
        const formData = new FormData();
        
        // 2. 選択されたすべてのファイルを 'photos' という名前でFormDataに追加
        for (let i = 0; i < files.length; i++) {
            formData.append('photos', files[i]); // バックエンドはこの 'photos' でファイルを受け取る
        }

        statusMessage.textContent = 'アップロード中...';

        try {
            // 3. バックエンドのAPIエンドポイントにPOSTリクエストを送信
            const response = await fetch('/api/upload', {
                method: 'POST',
                // FormDataを使用する場合、Content-Typeヘッダーはブラウザが自動で設定するため不要（重要！）
                body: formData 
            });

            if (response.ok) {
                const result = await response.json();
                statusMessage.textContent = `アップロード成功！ ${result.fileCount} 枚のファイルを処理中です。${result.inputFile} から ${result.outputFile} へ。`;
                // TODO: 処理結果の表示など、次のステップに進む
            } else {
                statusMessage.textContent = `アップロード失敗: ${response.statusText}`;
            }
        } catch (error) {
            statusMessage.textContent = `通信エラー: ${error.message}`;
            console.error(error);
        }
    });
});