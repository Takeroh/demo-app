import sys
import json

def decide_effects(json_str: str):
    try:
        # 1. Node.jsから渡されたJSON文字列をパース
        data = json.loads(json_str)
        img_path = data['filepath']
        print(f"Received image path: {img_path}", file=sys.stderr)
        
        # 2. 効果音・スタンプを決定　(現在は決め打ち) 
        scenery = ""
        emotion = ""
        sound_file = "example.mp3"
        stamp_file = "heart.png"
            
        # 3. 結果をJSONとして構築
        result = {
            'filepath': img_path,
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