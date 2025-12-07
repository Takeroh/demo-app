document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('photo-files');
    const fileSelect = document.getElementById("file-select");
    const form = document.getElementById('upload-form');
    const statusMessage = document.getElementById('status-message');
    const uploadButton = document.getElementById('submit-button'); // ボタンを取得

    fileSelect.addEventListener("click", (e) => {
        if (fileInput) {
            fileInput.click();
        }
    }, false);

    fileInput.addEventListener('change', function() {
        const statusText = document.querySelector('.file-status-text');
        const input = this;
        if (input.files.length > 0) {
            if (input.multiple) {
                // 複数選択の場合
                statusText.textContent = `${input.files.length} 個のファイルが選択されました`;
            } else {
                // 単数選択の場合
                statusText.textContent = input.files[0].name;
            }
            uploadButton.classList.add('valid'); // ボタンを有効化
            // statusMessage.textContent = 'ファイル選択完了。すぐにアップロードを開始します...';
            // statusMessage.style.color = 'orange'; 
            // form.submit(); // フォームを自動送信
        } else {
            statusText.textContent = '選択されていません';
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();    
        // if (event) {
        //     alert(event); // または画面上の要素に表示
        //     sessionStorage.removeItem('upload-status'); // 一度表示したら削除
        // }

        const files = fileInput.files;

        if (files.length === 0) {
            statusMessage.textContent = 'ファイルを選択してください。';
            return;
        }

        // ------------------------------------------
        // 1. アップロード準備とUIの無効化
        // ------------------------------------------
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append('photos', files[i]);
        }
        
        // ボタンを無効化し、重複送信を防ぐ
        uploadButton.disabled = true;
        statusMessage.textContent = 'アップロード中... サーバーで画像処理を開始しています。';
        statusMessage.style.color = 'orange'; // 処理中であることを視覚的に示す

        try {
            // ------------------------------------------
            // 2. バックエンドAPIにリクエストを送信
            // ------------------------------------------
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData 
            });

            const result = await response.json(); // サーバーからのJSON応答を解析

            // ------------------------------------------
            // 3. 応答に基づく処理
            // ------------------------------------------
            if (response.ok) {
                // 画面遷移の実行 (バックエンドからの指示、または固定パスを使用)
                const redirectPath = result.redirectUrl;

                // 成功時の処理：画像処理が完了したと見なし、画面遷移を行う
                statusMessage.textContent = `✅ 処理完了！ ${result.fileCount} 枚のファイルを処理しました。${redirectPath}に画面遷移します...`;
                statusMessage.style.color = 'green';
        
                
                // 画面遷移を数秒遅らせることで、完了メッセージをユーザーに見せる (任意)
                setTimeout(() => {
                    window.location.href = redirectPath;
                }, 1500); // 1.5秒後に遷移

            } else {
                // 失敗時の処理：HTTPエラー（4xx, 5xx）の場合
                statusMessage.textContent = `❌ 処理失敗: ${result.error || response.statusText}`;
                statusMessage.style.color = 'red';
            }
        } catch (error) {
            // 通信エラー（ネットワーク障害など）の場合
            statusMessage.textContent = `❌ 通信エラー: ${error.message}`;
            statusMessage.style.color = 'red';
        } finally {
            // 処理が完了 (成功/失敗) した後、ボタンを再度有効化する (遷移しない場合に備えて)
            uploadButton.disabled = false;
        }
    });
});

// document.addEventListener('DOMContentLoaded', () => {
//     const form = document.getElementById('upload-form');
//     const statusMessage = document.getElementById('status-message');

//     form.addEventListener('submit', async (event) => {
//         event.preventDefault(); // フォームの標準の送信動作をキャンセル

//         const fileInput = document.getElementById('photo-files');
//         const files = fileInput.files;

//         if (files.length === 0) {
//             statusMessage.textContent = 'ファイルを選択してください。';
//             return;
//         }

//         // 1. FormDataオブジェクトを作成
//         // ファイルをアップロードするために必要な形式
//         const formData = new FormData();
        
//         // 2. 選択されたすべてのファイルを 'photos' という名前でFormDataに追加
//         for (let i = 0; i < files.length; i++) {
//             formData.append('photos', files[i]); // バックエンドはこの 'photos' でファイルを受け取る
//         }

//         statusMessage.textContent = 'アップロード中...';

//         try {
//             // 3. バックエンドのAPIエンドポイントにPOSTリクエストを送信
//             const response = await fetch('/api/upload', {
//                 method: 'POST',
//                 // FormDataを使用する場合、Content-Typeヘッダーはブラウザが自動で設定するため不要（重要！）
//                 body: formData 
//             });

//             if (response.ok) {
//                 const result = await response.json();
//                 statusMessage.textContent = `アップロード成功！ ${result.fileCount} 枚のファイルを処理中です。`;
//                 // 入力ファイル： result.inputFile
//                 // 出力ファイル： result.outputFile
//                 // TODO: 処理結果の表示など、次のステップに進む
//             } else {
//                 statusMessage.textContent = `アップロード失敗: ${response.statusText}`;
//             }
//         } catch (error) {
//             statusMessage.textContent = `通信エラー: ${error.message}`;
//             console.error(error);
//         }
//     });
// });