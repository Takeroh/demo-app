// ----------------------------------------
// 1. import 文
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
// 3. データ読み込み (サーバー起動時)
// ----------------------------------------

// images.json を読み込む
// ファイルの存在確認やエラーハンドリングを追加すると、より堅牢になる
try {
    const images = JSON.parse(fs.readFileSync("images.json", "utf8"));
} catch (error) {
    console.error("Error reading images.json:", error);
    // アプリケーションの継続が困難な場合はここで終了処理を行う
}

// ----------------------------------------
// 4. ルーティング定義
// ----------------------------------------

// APIとして JSON を返す
app.get("/images", (req, res) => {
  res.json(images);
});

// ルートは index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post('/api/upload', upload.array('photos', 10), async (req, res) => { // 👈 async を追加

    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'ファイルがアップロードされていません。' });
    }

    // 複数ファイルを処理するためのPromiseの配列を作成
    const processingPromises = req.files.map(file => 
        processImage(file, path, __dirname)
    );

    try {
        // 全てのファイルの処理が完了するのを待つ (並行処理)
        const results = await Promise.all(processingPromises);
        
        // 処理が全て成功したら、フロントエンドに結果を返す
        res.status(200).json({ 
            message: '全ての画像処理が完了しました。',
            fileCount: results.length,
            // 処理後の画像URLのリストを返す
            imageUrls: results.map(r => r.imageUrl) 
        });

    } catch (error) {
        // 1つでもファイル処理が失敗したら、500エラーを返す
        console.error('画像処理中に全体エラーが発生:', error);
        
        // 🚨 重要: 失敗した場合、残っているファイルも含めて全て削除
        // processImage内で一時ファイル削除は行っているため、
        // エラーログを出力し、失敗レスポンスを返します。
        res.status(500).json({ error: `画像処理中にエラーが発生しました。詳細はログを確認してください。` });

    } finally {
        // 処理の成否にかかわらず、残りの一時ファイルをクリーンアップ (念のため)
        // ただし、Promise.allが終了した時点で、mapで生成された全ファイルは処理済みのはずです
    }
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
// 5. サーバー起動
// ----------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});