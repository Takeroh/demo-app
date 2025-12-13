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
import dotenv from 'dotenv';
dotenv.config();

// 環境設定
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express(); // ★ここで app を定義しています
const PORT = process.env.PORT || 3000;

// Google Maps APIキーを取得
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// ----------------------------------------
// 2. 初期ミドルウェアと設定
// ----------------------------------------

// CORS設定
app.use(cors());

// 静的ファイル設定
app.use(express.static("public"));

// Multerの設定
const upload = multer({ dest: 'uploads/' }); 
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// データディレクトリを定義
const IMAGES_DIR = path.join(__dirname, '/public/results/images');
const JSON_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR);
}

// ----------------------------------------
// 3. ルーティング定義
// ----------------------------------------

// ★ここが修正箇所：処理後の画像パスを格納したJSONファイルを動的に作成し、結果IDを返す
app.post('/api/upload', upload.array('photos', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'ファイルがアップロードされていません。' });
    }

    // 処理IDを生成 (タイムスタンプを使用)
    const resultId = Date.now().toString();
    const resultsImageUrls = []; // エラー時の削除用

    try {
        // [Step 1] まず全ての画像に対して、並列で processImage (GPS抽出・保存) を実行
        // ここではまだ decideEffects は呼ばない
        const imageProcessingPromises = req.files.map(async file => {
            const processedResult = await processImage(file, path, __dirname);
            // processedResult = { filepath, date_time, location, temp_path }
            
            resultsImageUrls.push(path.join('public', processedResult.filepath));
            return processedResult;
        });

        // 全画像の処理が終わるのを待つ
        // processedMetaList は [ {filepath...}, {filepath...}, ... ] という配列になる
        const processedMetaList = await Promise.all(imageProcessingPromises);

        // [Step 2] 抽出した全データの配列を、まとめて1回だけ Python に渡す！
        // これにより Python 側で「重複なしのランダム選択」が可能になる
        let effectsList = [];
        if (processedMetaList.length > 0) {
            // decideEffects は配列を受け取り、配列を返す想定で動くようになります
            effectsList = await decideEffects(processedMetaList);
        }

        // [Step 3] 「画像処理結果」と「効果音・スタンプ結果」を結合する
        // Promise.all は順序を維持するので、インデックスで結合して安全
        const results = processedMetaList.map((meta, index) => {
            // Python から返ってきた配列の同じ場所にあるデータを取得
            // Python側でエラー等のため数が合わない場合のガードを入れておく
            const effect = effectsList[index] || { analysis: {}, effects: {} };
            
            return {
                ...meta,    // date_time, location, filepath
                ...effect   // analysis, effects (sound, stamp)
            };
        });
        
        // ⭐️ 処理後の画像URLのリストをJSONデータとして格納
        const resultData = {
            id: resultId,
            timestamp: new Date().toISOString(),
            fileCount: results.length,
            imageData: results
        };

        // uploads/ の一時ファイルを削除
        if (req.files) {
            req.files.forEach(file => {
                cleanupSingleFile(file.path); 
            });
        }
        
        // ⭐️ 動的JSONファイルを保存
        const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);
        fs.writeFileSync(jsonFilePath, JSON.stringify(resultData, null, 2));

        // 成功レスポンス
        res.status(200).json({ 
            message: '全ての画像処理が完了しました。',
            fileCount: results.length,
            resultId: resultId, 
            redirectUrl: `/results/?id=${resultId}`
        });

    } catch (error) {
        console.error('画像処理中に全体エラーが発生:', error);
        
        // エラー時のクリーンアップ処理
        if (req.files) {
            req.files.forEach(file => {
                cleanupSingleFile(file.path); 
            });
        }
        
        // 生成してしまった処理済み画像も削除
        const cleanupPromises = resultsImageUrls.map(filePath => cleanupSingleFile(filePath));
        await Promise.allSettled(cleanupPromises);
        
        res.status(500).json({ error: `画像処理中にエラーが発生しました。詳細はログを確認してください。` });
    }
});


// 処理結果JSONを動的に読み込んで返す
app.get("/api/results", (req, res) => {
    const resultId = req.query.id; // URLのクエリパラメータからIDを取得

    if (!resultId) {
        return res.status(400).json({ error: "結果ID (id) が指定されていません。" });
    }
    
    const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);

    try {
        const data = fs.readFileSync(jsonFilePath, "utf8");
        const results = JSON.parse(data);
        res.json(results);
    } catch (error) {
        console.error(`Error reading result file ${resultId}.json:`, error);
        res.status(404).json({ error: `指定されたID (${resultId}) の処理結果が見つかりません。` });
    }
});

app.get('/api/map-key', (req, res) => {
    res.json({ 
            apiKey: GOOGLE_MAPS_API_KEY 
        });
});

// 処理結果と関連するファイルを削除
app.delete('/api/results/:id', (req, res) => {
    const resultId = req.params.id; 
    
    if (!resultId) {
        return res.status(400).json({ error: "結果IDが指定されていません。" });
    }

    const jsonFilePath = path.join(JSON_DIR, `${resultId}.json`);

    try {
        const data = fs.readFileSync(jsonFilePath, "utf8");
        const results = JSON.parse(data);
        const imageUrls = [];
        for (const imageData of results.imageData) {
            imageUrls.push(imageData.filepath);
        }

        imageUrls.forEach(url => {
            const imageFilename = path.basename(url);
            const imageFilePath = path.join(IMAGES_DIR, imageFilename);
            if (fs.existsSync(imageFilePath)) {
                fs.unlinkSync(imageFilePath);
                console.log(`削除: 画像ファイル ${imageFilename}`);
            }
        });

        fs.unlinkSync(jsonFilePath);
        console.log(`削除: JSONファイル ${resultId}.json`);
        res.status(200).json({ message: `処理結果ID ${resultId} に関連するすべてのファイルが削除されました。` });

    } catch (error) {
        console.error(`削除エラー (ID: ${resultId}):`, error);
        res.status(500).json({ error: `ファイルの削除中にエラーが発生しました。` });
    }
});

// ルートは index.html を返す
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


// *******************************************************************
// ユーティリティ関数
// *******************************************************************

// 単一ファイルを処理
function processImage(file, pathModule, dirname) {
    return new Promise((resolve, reject) => {
        const tempFilePath = file.path;
        const originalName = file.originalname;
        const outputDir = pathModule.join(dirname, 'public', 'results', 'images');
        const resultId = Date.now().toString();

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const pythonProcess = spawn('python3', [
            './scripts/process_image.py',
            tempFilePath,
            outputDir,
            resultId,
            originalName
        ]);

        let pythonOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
            console.log(`[Python ProcessImage STDOUT]: ${pythonOutput}`);
        });

        let pythonErrorOutput = '';
        pythonProcess.stderr.on('data', (data) => {
            pythonErrorOutput += data.toString();
            console.error(`[Python ProcessImage STDERR]: ${pythonErrorOutput}`);
        });

        pythonProcess.on('error', (err) => {
            console.error('Pythonプロセス起動エラー:', err);
            cleanupSingleFile(tempFilePath);
            reject(new Error('Pythonプロセス起動に失敗。'));
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                const errorMsg = `Python実行エラー (Code ${code}): ${pythonErrorOutput.substring(0, 100)}...`;
                console.error(errorMsg);
                reject(new Error(errorMsg));
                return;
            }

            try {
                const rawOutput = pythonOutput.trim();
                const parsedResult = JSON.parse(rawOutput);

                if (!parsedResult.filepath) {
                    throw new Error("Pythonからの出力に必要なデータが不足しています。");
                }
                resolve(parsedResult); 
            } catch (e) {
                console.error(`Python出力解析エラー: ${e.message}`, { output: pythonOutput, error: pythonErrorOutput });
                reject(new Error(`Pythonスクリプトからの結果解析に失敗しました。`));
            }
        });
    });
}

// 効果音・スタンプを決定する関数 (リスト対応済み)
function decideEffects(imageData) {
    return new Promise((resolve, reject) => {
        // Pythonに渡すデータをJSON文字列に変換 (配列でもOK)
        const jsonString = JSON.stringify(imageData);

        const pythonProcess = spawn('python3', [
            './scripts/decide_effects.py',
            jsonString
        ]);

        let pythonOutput = '';
        pythonProcess.stdout.on('data', (data) => {
            pythonOutput += data.toString();
            console.log(`[Python DecideEffects STDOUT]: ${pythonOutput}`);
        });

        let pythonErrorOutput = '';
        pythonProcess.stderr.on('data', (data) => {
            const output = data.toString();
            pythonErrorOutput += output;
            console.error(`[Python DecideEffects STDERR]: ${output.trim()}`);
        });

        pythonProcess.on('error', (err) => {
            console.error('decideEffects: Pythonプロセス起動エラー:', err);
            reject(new Error(`decideEffects: Pythonプロセス起動に失敗。${err.message}`));
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(pythonOutput);
                    console.log(`[Python DecideEffects STDOUT]: ${JSON.stringify(result)}`);
                    resolve(result); 
                } catch (e) {
                    console.error('decideEffects: JSONパースエラー:', e);
                    console.error('Python Output:', pythonOutput);
                    reject(new Error(`decideEffects: Pythonの出力解析に失敗しました。Error: ${pythonErrorOutput}`));
                }
            } else {
                console.error(`decideEffects: Pythonプロセスがコード ${code} で終了しました。`);
                reject(new Error(`decideEffects処理エラー: ${pythonErrorOutput}`));
            }
        });
    });
}

// 単一ファイルを削除する関数
function cleanupSingleFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return;
    fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error(`ファイル削除失敗: ${filePath}`, err);
        }
    });
}

// ----------------------------------------
// 4. サーバー起動
// ----------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});