import sys
import json
import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

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
        # 1. Node.jsから渡されたJSON文字列をパース
        data = json.loads(json_str)
        file_system_path = data['temp_path']
        # if raw_path.startswith("/"):
        #     # 先頭の / を取って public と結合する
        #     file_system_path = os.path.join("public", raw_path.lstrip("/"))
        # else:
        #     file_system_path = os.path.join("public", raw_path)
            
        print(f"Reading file from: {file_system_path}", file=sys.stderr)
        
        # 2. 効果音・スタンプを決定
        # GPTで解析
        gpt_result = analyze_image(file_system_path)
        
        # 結果を取得
        scenery = gpt_result.get("scenery", "default")
        emotion = gpt_result.get("emotion", "default")
        
        # マッピングからIDを取得
        music_id = MUSIC_MAPPING.get(scenery, MUSIC_MAPPING["default"])
        stamp_id = STAMP_MAPPING.get(emotion, STAMP_MAPPING["default"])
        
        # 次のセクション3で使う変数名に合わせて値をセット
        sound_file = f"{music_id}.mp3"
        stamp_file = f"{stamp_id}.png"
            
        # 3. 結果をJSONとして構築
        result = {
            # 'filepath': file_system_path,
            'analysis':{
                'scenery': scenery,
                'emotion': emotion
            },
            'effects': {
                'sound': f'/assets/sounds/{sound_file}',
                'stamp': f'/assets/stamps/{stamp_file}'
            }
        }

        # 4. JSON文字列を標準出力に書き出し、Node.jsに返す
        print(json.dumps(result))
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