// ----------------------------------------
// 1. インポートと環境設定
// ----------------------------------------
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import multer from 'multer';
import cors from 'cors';
import { spawn } from 'child_process'

// 環境設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

// ----------------------------------------
// 2. 初期ミドルウェアと設定
// ----------------------------------------

// CORS設定 (早めに適用)
app.use(cors());

// 1回目の静的ファイル設定のみを残す
app.use(express.static("public"));

// Multerの設定
const upload = multer({ dest: 'uploads/' }); 
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// ----------------------------------------
// 3. ルーティング定義
// ----------------------------------------

// データディレクトリを定義
const IMAGES_DIR = path.join(__dirname, '/public/results/images'); // JSONファイルを保存するディレクトリ
const JSON_DIR = path.join(__dirname, 'data'); // JSONファイルを保存するディレクトリ
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR);
}

// 処理後の画像パスを格納したJSONファイルを動的に作成し、結果IDを返す
app.post('/api/upload', upload.array('photos', 10), async (req, res) => {
    // ... (ファイルの存在チェックはそのまま) ...
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'ファイルがアップロードされていません。' });
    }

    // 処理IDを生成 (タイムスタンプを使用)
    const resultId = Date.now().toString();

    // 複数ファイルを処理するためのPromiseの配列を作成
    const processingPromises = req.files.map(file => 
        processImage(file, path, __dirname)
    );

    try {
        // 全てのファイルの処理が完了するのを待つ (並行処理)
        const results = await Promise.all(processingPromises);
        
        // ⭐️ 処理後の画像URLのリストをJSONデータとして格納
        const resultData = {
            id: resultId,
            timestamp: new Date().toISOString(),
            imageUrls: results.map(r => r.imageUrl)
        };
        
        // ⭐️ 動的JSONファイルを保存 (例: data/1700000000000.json)
        const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(resultData, null, 2));

        // 処理が全て成功したら、結果IDと画面遷移情報をフロントエンドに返す
        res.status(200).json({ 
            message: '全ての画像処理が完了しました。',
            fileCount: results.length,
            resultId: resultId, // 新しく生成したID
            redirectUrl: `/results/?id=${resultId}` // クエリパラメータにIDを付けて遷移
        });

    } catch (error) {
        // ... (エラー処理はそのまま) ...
        console.error('画像処理中に全体エラーが発生:', error);
        res.status(500).json({ error: `画像処理中にエラーが発生しました。詳細はログを確認してください。` });
    } finally {
        // ... (finally ブロックはそのまま) ...
    }
});


// 処理結果JSONを動的に読み込んで返す
// /api/results?id=1700000000000 の形式でアクセス
app.get("/api/results", (req, res) => {
    const resultId = req.query.id; // URLのクエリパラメータからIDを取得

    if (!resultId) {
        return res.status(400).json({ error: "結果ID (id) が指定されていません。" });
    }
    
    const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);

    try {
        // JSONファイルを読み込む
        const data = fs.readFileSync(jsonFilePath, "utf8");
        const results = JSON.parse(data);
        res.json(results);
    } catch (error) {
        // ファイルが見つからない、またはJSON形式がおかしい場合
        console.error(`Error reading result file ${resultId}.json:`, error);
        res.status(404).json({ error: `指定されたID (${resultId}) の処理結果が見つかりません。` });
    }
});

// index.js (ルーティング定義セクション)

// ⭐️ 新しいAPIエンドポイント: 処理結果と関連するファイルを削除
app.delete('/api/results/:id', (req, res) => {
    const resultId = req.params.id; // URLパスからIDを取得
    
    if (!resultId) {
        return res.status(400).json({ error: "結果IDが指定されていません。" });
    }

    const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);

    try {
        // 1. JSONファイルを読み込み、画像パスのリストを取得
        const data = fs.readFileSync(jsonFilePath, "utf8");
        const results = JSON.parse(data);
        const imageUrls = results.imageUrls || []; // 処理された画像パスのリスト

        // 2. 関連する画像ファイルをすべて削除
        imageUrls.forEach(url => {
            // URLからファイルシステム上の絶対パスを再構築
            // 例: /results/images/12345.jpg -> public/results/images/12345.jpg
            const imageFilename = path.basename(url); // ファイル名のみを取得
            const imageFilePath = path.join(IMAGES_DIR, imageFilename);
            
            if (fs.existsSync(imageFilePath)) {
                fs.unlinkSync(imageFilePath);
                console.log(`削除: 画像ファイル ${imageFilename}`);
            }
        });

        // 3. メタデータJSONファイルを削除
        fs.unlinkSync(jsonFilePath);
        console.log(`削除: JSONファイル ${resultId}.json`);

        // 成功レスポンス
        res.status(200).json({ message: `処理結果ID ${resultId} に関連するすべてのファイルが削除されました。` });

    } catch (error) {
        // ファイルが見つからない、または削除に失敗した場合
        console.error(`削除エラー (ID: ${resultId}):`, error);
        // ファイルが見つからなかった場合も200を返すか、エラーを返すか選択
        res.status(500).json({ error: `ファイルの削除中にエラーが発生しました。` });
    }
});

// ルートは index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// *******************************************************************
// ユーティリティ関数（Promiseベースでファイルを処理）
// *******************************************************************

// 単一ファイルを処理し、一時ファイルを削除する Promise ベースの関数
function processImage(file, pathModule, dirname) {
    
    return new Promise((resolve, reject) => {
        const tempFilePath = file.path;
        const originalName = file.originalname;
        const outputDir = pathModule.join(dirname, 'public', 'results', 'images');
        const outputFileName = Date.now() + '-' + originalName.replace(/[^a-z0-9.]/gi, '_') + pathModule.extname(originalName);
        const outputFilePath = pathModule.join(outputDir, outputFileName);

        // 永続ディレクトリの確認と作成（初回のみ実行される）
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Pythonプロセスの実行ロジック...
        const pythonProcess = spawn('python3', [
            './scripts/process_image.py',
            tempFilePath,                 
            outputFilePath                
        ]);
        
        let pythonErrorOutput = '';
        pythonProcess.stderr.on('data', (data) => {
            pythonErrorOutput += data.toString();
        });

        // システムエラー
        pythonProcess.on('error', (err) => {
            console.error('Pythonプロセス起動エラー:', err);
            // 削除してPromiseを拒否
            cleanupSingleFile(tempFilePath);
            reject(new Error('Pythonプロセス起動に失敗。'));
        });

        // 終了処理
        pythonProcess.on('close', (code) => {
            cleanupSingleFile(tempFilePath); 

            if (code !== 0) {
                // 処理失敗
                const errorMsg = `Python実行エラー (Code ${code}): ${pythonErrorOutput.substring(0, 100)}...`;
                console.error(errorMsg);
                reject(new Error(errorMsg));
                return;
            }
            
            // 処理成功: 解決（resolve）
            resolve({ 
                imageUrl: `/results/images/${outputFileName}`,
                success: true
            });
        });
    });
}

// 単一ファイルを削除する関数
function cleanupSingleFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            // ログに残すが、アプリケーションのクラッシュは避ける
            console.error(`一時ファイル削除失敗: ${filePath}`, err);
        } else {
            console.log(`一時ファイル ${filePath} を削除しました。`);
        }
    });
}

// ----------------------------------------
// 4. サーバー起動
// ----------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});