import sys
import json
import os
import base64
from openai import OpenAI
from dotenv import load_dotenv
import random

# 設定ファイルと.envの読み込み
sys.path.append(os.path.dirname(__file__))
from mapping_config import SCENERY_LABELS, EMOTION_LABELS, MUSIC_MAPPING, STAMP_MAPPING

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# AI分析用のヘルパー関数
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def analyze_image(image_path):
    print(f"GPT Analyzing: {image_path}", file=sys.stderr)
    base64_image = encode_image(image_path)
    # base64_image = convert_to_base64_uri(image_path)
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": f"""Analyze this image and return JSON. Scenery Options: {SCENERY_LABELS} Emotion Options: {EMOTION_LABELS} Format: {{ "scenery": "...", "emotion": "..." }}"""},
            {"role": "user", "content": [{"type": "text", "text": "Analyze this image."}, {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}]},
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def decide_effects(json_str: str):
    try:
        # 1. 入力が単体かリスト（配列）か判定して統一
        input_data = json.loads(json_str)
        
        # もしリストじゃなかったらリストに変換（後方互換性のため）
        if not isinstance(input_data, list):
            input_data = [input_data]
            
        results = []
        
        # ★ポイント: 「どのスタンプをもう使ったか」を管理する辞書
        # キー: 感情ラベル, 値: まだ使っていないスタンプのリスト
        available_stamps = {}

        # マッピング定義からコピーしてシャッフルしておく（ランダム順にするため）
        for emotion, stamps in STAMP_MAPPING.items():
            if isinstance(stamps, list):
                shuffled = stamps[:] # コピー作成
                random.shuffle(shuffled) # シャッフル
                available_stamps[emotion] = shuffled
            else:
                available_stamps[emotion] = [stamps] # 1個だけの場合もリスト化

        # 2. 画像ごとにループ処理
        for data in input_data:
            file_system_path = data['temp_path']
            print(f"Reading file from: {file_system_path}", file=sys.stderr)
            
            # GPT解析
            gpt_result = analyze_image(file_system_path)
            scenery = gpt_result.get("scenery", "default")
            emotion = gpt_result.get("emotion", "default")
            
            # 音楽決定 (シチュエーションに基づく)
            music_id = MUSIC_MAPPING.get(scenery, MUSIC_MAPPING["default"])
            
            # ==========================================
            # ★スタンプ決定 (重複防止ロジック)
            # ==========================================
            
            # その感情の「まだ使っていないスタンプリスト」を取得
            # なければデフォルトのリストを取得
            candidates = available_stamps.get(emotion)
            if not candidates:
                 # 万が一空なら補充（リセット）
                refill = STAMP_MAPPING.get(emotion, STAMP_MAPPING["default"])
                if isinstance(refill, list):
                    candidates = refill[:]
                    random.shuffle(candidates)
                else:
                    candidates = [refill]
                available_stamps[emotion] = candidates

            # リストから1つ取り出す (pop) -> 「使った」ことになる
            stamp_id = candidates.pop(0) 
            
            # もしリストが空になったら、次に来る同じ感情のために補充しておく
            if len(candidates) == 0:
                refill = STAMP_MAPPING.get(emotion, STAMP_MAPPING["default"])
                if isinstance(refill, list):
                    new_stock = refill[:]
                    random.shuffle(new_stock)
                    available_stamps[emotion] = new_stock
                else:
                    available_stamps[emotion] = [refill]

            # ==========================================

            sound_file = f"{music_id}.mp3"
            stamp_file = f"{stamp_id}.png"
            
            # 結果リストに追加
            results.append({
                # 元のデータ情報を保持したい場合はここに追加
                'temp_path': file_system_path,
                'analysis':{
                    'scenery': scenery,
                    'emotion': emotion
                },
                'effects': {
                    'sound': f'/assets/sounds/{sound_file}',
                    'stamp': f'/assets/stamps/{stamp_file}'
                }
            })

        # 4. JSON文字列を標準出力に書き出し、Node.jsに返す
        print(json.dumps(results))
        print(f"Successfully decided effects", file=sys.stderr)
        sys.exit(0)

    except Exception as e:
        print(f"Error in effect decision: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python decide_effects.py <metadata_json_string>", file=sys.stderr)
        sys.exit(1)
    
    json_str = sys.argv[1]
    decide_effects(json_str)