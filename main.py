import os
import json
import base64
import sys
import glob
from openai import OpenAI
from dotenv import load_dotenv
from mapping_config import SCENERY_LABELS, EMOTION_LABELS, MUSIC_MAPPING, STAMP_MAPPING

# 設定読み込み
load_dotenv()
client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# 画像フォルダと出力ファイル
IMAGE_FOLDER = "images"
OUTPUT_FILE = "result.json"

#画像をGPT用にエンコード
def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

#関数: GPT-4oで画像を分析
def analyze_image(image_path):
    base64_image = encode_image(image_path)
    print(f"Analyzing: {os.path.basename(image_path)}")
    
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": f"""
                Analyze this image and return JSON.
                Scenery Options: {SCENERY_LABELS}
                Emotion Options: {EMOTION_LABELS}
                Format: {{ "scenery": "...", "emotion": "..." }}
                """
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image."},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ],
            },
        ],
        response_format={"type": "json_object"}
    )
    return json.loads(response.choices[0].message.content)

def main():
    # 画像ファイルを集める
    image_files = glob.glob(f"{IMAGE_FOLDER}/*.jpg") + glob.glob(f"{IMAGE_FOLDER}/*.png")
    
    if not image_files:
        print("画像が見つかりません。", file=sys.stderr)
        return

    # 結果を格納するリスト
    results = []

    for img_path in image_files:
        #AI分析を実行
        gpt_result = analyze_image(img_path)
        
        #マッピング（IDへの変換）
        scenery = gpt_result.get("scenery", "default")
        emotion = gpt_result.get("emotion", "default")
        
        music_id = MUSIC_MAPPING.get(scenery, MUSIC_MAPPING["default"])
        stamp_id = STAMP_MAPPING.get(emotion, STAMP_MAPPING["default"])

        #データ作成
        record = {
            'filepath': img_path, 
            'analysis': {
                'scenery': scenery,
                'emotion': emotion
            },
            'effects': {
                'sound': f'/assets/sounds/{music_id}.mp3',
                'stamp': f'/assets/stamps/{stamp_id}.png'
            }
        }
        results.append(record)

    # JSON保存
    final_output = {"analyzed_data": results}

    with open(OUTPUT_FILE, "w", encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)
        
    #print(f"\n{OUTPUT_FILE} を作成")

if __name__ == "__main__":
    main()