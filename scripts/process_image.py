import sys
import os
import base64
from datetime import datetime
from fractions import Fraction
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ExifTags
import cv2
import json
import numpy as np
from openai import OpenAI 
from dotenv import load_dotenv

# カレントディレクトリではなく、このスクリプトのある場所から一つ上の .env を確実に指定する
env_path = os.path.join(os.path.dirname(__file__), '../.env')
load_dotenv(env_path, override=True)

# =================================================================
# 1. Exifデータ取得関数
# =================================================================

def get_exif(img: Image.Image) -> Optional[Dict[int, Any]]:
    """
    Pillow ImageオブジェクトからExif情報の辞書を安全に取得する。
    """
    try:
        # Exif情報が存在しない場合はNoneを返す
        return img._getexif()
    except Exception:
        return None

# =================================================================
# 2. 撮影日時抽出関数
# =================================================================

def get_datetime(exif_dict: Dict[int, Any]) -> Optional[str]:
    """
    Exif辞書から撮影日時を抽出し、ISO形式の文字列で返す。
    """
    if not exif_dict:
        return None
    
    # 'DateTimeOriginal' タグのキー (36867) を取得
    tag_key = next((k for k, v in ExifTags.TAGS.items() if v == 'DateTimeOriginal'), None)

    if tag_key and tag_key in exif_dict:
        dt_str = exif_dict[tag_key] # 例: 'YYYY:MM:DD HH:MM:SS'
        try:
            return datetime.strptime(dt_str, '%Y:%m:%d %H:%M:%S').isoformat()
        except ValueError:
            return None
    return None

# =================================================================
# 3. 位置情報抽出関数
# =================================================================
def _convert_to_degrees(value: Tuple[Tuple[int, int], ...]) -> float:
    """
    GPS座標のDMS形式 (Degree/Minute/Second) を10進数に変換する補助関数。
    """
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)


def get_gps(exif_dict: Dict[int, Any]) -> Optional[Dict[str, float]]:
    """
    Exif辞書から緯度と経度を抽出し、辞書で返す。
    """
    if not exif_dict:
        print("GPS Warning: Exif data is missing.", file=sys.stderr)
        return None

    gps_info_tag_key = next((k for k, v in ExifTags.TAGS.items() if v == 'GPSInfo'), None)
    
    if not gps_info_tag_key or gps_info_tag_key not in exif_dict:
        print("GPS Warning: GPSInfo tag is missing from Exif.", file=sys.stderr)
        return None
    
    gps_info = exif_dict[gps_info_tag_key]
    gps_tag_map = {v: k for k, v in ExifTags.GPSTAGS.items()}
    # print(f"GPS Info Tags: {gps_info}", file=sys.stderr)
    # print(f"GPS Tag Map: {gps_tag_map}", file=sys.stderr)
    
    # 必要なGPSタグのキーを取得
    lat_tag = gps_tag_map.get('GPSLatitude')
    lon_tag = gps_tag_map.get('GPSLongitude')
    lat_ref_tag = gps_tag_map.get('GPSLatitudeRef')
    lon_ref_tag = gps_tag_map.get('GPSLongitudeRef')

    # print(f"[GPS Tags] - Lat: {lat_tag}, Lon: {lon_tag}, LatRef: {lat_ref_tag}, LonRef: {lon_ref_tag}", file=sys.stderr)
    # print(f"[GPS Info] - Lat:{gps_info[lat_tag]}, Lon{gps_info[lon_tag]}", file=sys.stderr)
    # print(f"[GPS Info Type] - Lat:{type(gps_info[lat_tag])}, Lon{type(gps_info[lon_tag])}", file=sys.stderr)
    # print(f"[GPS Info Type2] - Lat:{type(gps_info[lat_tag][0])}, Lon{type(gps_info[lon_tag][0])}", file=sys.stderr)
    if not all(tag in gps_info for tag in [lat_tag, lon_tag, lat_ref_tag, lon_ref_tag]):
        print("GPS Warning: One or more critical GPS tags (Lat/Lon/Ref) are missing.", file=sys.stderr)
        return None

    try:
        # 10進数に変換
        lat = _convert_to_degrees(gps_info[lat_tag])
        lon = _convert_to_degrees(gps_info[lon_tag])
        # print(f"Extracted Raw Lat/Lon: {lat}, {lon}", file=sys.stderr)
        # 南北/東西の情報を適用
        if gps_info[lat_ref_tag] != 'N':
            lat *= -1
        if gps_info[lon_ref_tag] != 'E':
            lon *= -1
        print(f"Successfully extracted GPS: {lat}, {lon}", file=sys.stderr)
        return {'latitude': lat, 'longitude': lon}

    except Exception as e:
        print(f"GPS Warning: Error during conversion: {e}", file=sys.stderr)
        return None

# =================================================================
# 4. 回転関数
# =================================================================

def rotate_image(img: Image.Image, exif_dict: Dict[int, Any]) -> Image.Image:
    """
    Exif辞書のOrientationタグに基づき、画像を物理的に回転させる。
    """
    if not exif_dict:
        return img
    
    orientation_tag_key = next((k for k, v in ExifTags.TAGS.items() if v == 'Orientation'), None)
    
    if not orientation_tag_key or orientation_tag_key not in exif_dict:
        return img
    
    o = exif_dict[orientation_tag_key]
    
    # Orientationタグの値に基づいて回転/反転を適用
    if o == 3:
        img = img.transpose(Image.ROTATE_180)
    elif o == 6:
        img = img.transpose(Image.ROTATE_270)
    elif o == 8:
        img = img.transpose(Image.ROTATE_90)
    return img

def analyze_image_mood(img_path: str) -> str:
    """
    画像をGPT-4o-miniに送信し、最適なフィルターを決定する。
    戻り値: 'vivid', 'sad', 'sketch' のいずれか
    """
    api_key = os.environ.get("OPENAI_API_KEY")
    load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))
    client = OpenAI(api_key=api_key)

    # 画像をBase64エンコード
    with open(img_path, "rb") as image_file:
        base64_image = base64.b64encode(image_file.read()).decode('utf-8')

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini", # コストと速度重視でminiを使用
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": (
                                "Analyze this image and decide which filter style fits best.\n"
                                "1. 'vivid': For landscapes, food, or happy scenes (enhance color/contrast).\n"
                                "2. 'sad': For rainy, dark, or melancholic scenes (desaturate, cool tone).\n"
                                "3. 'sketch': For architectural, structural, or high-contrast lines (pencil style).\n"
                                "Return ONLY the keyword: 'vivid', 'sad', or 'sketch'."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=10
        )
        decision = response.choices[0].message.content.strip(" '\"").lower()
        
        # 想定外の回答が来た場合のガード
        if decision not in ['vivid', 'sad', 'sketch']:
            print(f"GPT returned unexpected value: {decision}. Fallback to 'vivid'.", file=sys.stderr)
            return "vivid"
            
        return decision

    except Exception as e:
        print(f"GPT API Error: {e}. Fallback to 'vivid'.", file=sys.stderr)
        return "vivid"
# =================================================================
# 5.画像処理関数
# =================================================================
#1.映えの処理
def enhance_image(
    img_pil: Image.Image,
    clahe_clip: float = 2.0,        # コントラスト強調の強さ（小さいほど自然）
    saturation_scale: float = 1.2,  # 彩度アップ倍率（1.0〜1.15が自然）
    sharp_amount: float = 0.3        # シャープの強さ（0〜0.5が推奨）
) -> Image.Image:
    """
    Pillow Image を受け取り、
    - CLAHE（マイルド）
    - 彩度アップ（控えめ）
    - アンシャープマスク（軽め）
    を適用して、自然に映える画像を返す関数。
    """

    # RGB 変換（Pillow → NumPy）
    img_pil = img_pil.convert("RGB")
    img = np.array(img_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # ---- 1. コントラスト強調（CLAHE） ----
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=clahe_clip, tileGridSize=(8, 8))
    l2 = clahe.apply(l)

    lab2 = cv2.merge((l2, a, b))
    img_clahe = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

    # ---- 2. 彩度アップ（控えめ） ----
    hsv = cv2.cvtColor(img_clahe, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    s = cv2.multiply(s, saturation_scale)
    s = np.clip(s, 0, 255).astype(np.uint8)

    hsv2 = cv2.merge((h, s, v))
    img_vivid = cv2.cvtColor(hsv2, cv2.COLOR_HSV2BGR)

    # ---- 3. 軽いシャープ処理（アンシャープマスク） ----
    if sharp_amount > 0:
        blur = cv2.GaussianBlur(img_vivid, (0, 0), sigmaX=1.0)
        img_sharp = cv2.addWeighted(
            img_vivid, 1.0 + sharp_amount,
            blur,      -sharp_amount,
            0
        )
    else:
        img_sharp = img_vivid

    # BGR → RGB → Pillow Image に戻す
    img_rgb = cv2.cvtColor(img_sharp, cv2.COLOR_BGR2RGB)
    return Image.fromarray(img_rgb)

#sad関数

def sad_filter(img_pil: Image.Image, mood: float = 0.6) -> Image.Image:
    """
    しんみりした雰囲気を少しだけ足すフィルター。
    mood: 0.0（効果なし）〜 1.0（最大でもそこまでキツくない）
    """

    # mood を 0〜1 にクリップ
    mood = max(0.0, min(1.0, mood))

    # mood から内部パラメータを決める（値はかなり控えめ）
    sat_scale     = 1.0 - 0.35 * mood   # 彩度 ↓
    bright_scale  = 1.0 - 0.08 * mood   # 明るさ ↓
    cool_strength = 0.12 * mood         # ほんのり寒色寄りに

    # Pillow → BGR(OpenCV)
    img_pil = img_pil.convert("RGB")
    img = np.array(img_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # ---- 1. HSV で彩度と明るさだけいじる ----
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    s = (s.astype(np.float32) * sat_scale)
    v = (v.astype(np.float32) * bright_scale)

    s = np.clip(s, 0, 255).astype(np.uint8)
    v = np.clip(v, 0, 255).astype(np.uint8)

    hsv2 = cv2.merge((h, s, v))
    img_toned = cv2.cvtColor(hsv2, cv2.COLOR_HSV2BGR)

    # ---- 2. ほんの少しだけ寒色寄りに（スケールで調整）----
    img_f = img_toned.astype(np.float32)
    # B（青）を少しだけ増やし、R（赤）を少しだけ減らす
    img_f[:, :, 0] *= (1.0 + cool_strength)   # B
    img_f[:, :, 2] *= (1.0 - cool_strength)   # R

    img_f = np.clip(img_f, 0, 255).astype(np.uint8)

    # BGR → Pillow
    img_rgb = cv2.cvtColor(img_f, cv2.COLOR_BGR2RGB)
    return Image.fromarray(img_rgb)

#鉛筆
def pencil_sketch_filter(img_pil: Image.Image, mood: float=0.5) -> Image.Image:
    """
    OpenCV の pencilSketch を使った鉛筆画フィルター。
    mood: 0.0（効果なし）〜 1.0（控えめ〜標準の鉛筆画）
    """

    # mood を 0〜1 に制限
    mood = max(0.0, min(1.0, mood))

    # pencilSketch 用の軽めパラメータを生成
    sigma_s = 30 + 70 * mood       # 空間スケール（大きいとより鉛筆画ぽい）
    sigma_r = 0.05 + 0.15 * mood   # 反射率（小さい方が線が細く繊細）
    shade   = 0.03 + 0.07 * mood   # 影の濃さ（控えめ～標準）

    # Pillow → BGR(OpenCV)
    img_pil = img_pil.convert("RGB")
    img = np.array(img_pil)
    img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    # pencilSketch（gray, color を返す）
    dst_gray, dst_color = cv2.pencilSketch(
        img,
        sigma_s=sigma_s,
        sigma_r=sigma_r,
        shade_factor=shade
    )

    # 今回は「控えめなグレー鉛筆画」のほうを使う
    sketch = dst_gray

    # グレー → RGB → Pillow
    sketch_rgb = cv2.cvtColor(sketch, cv2.COLOR_GRAY2RGB)
    return Image.fromarray(sketch_rgb)

# =================================================================
# メイン処理関数
# =================================================================

def process_image(input_path: str, output_dir: str, result_id: str, original_name: str) -> None:
    try:
        # 1. 入力パスから画像を読み込む
        img_pil = Image.open(input_path)

        exif = get_exif(img_pil)
        img_pil = rotate_image(img_pil, exif)

        meta_data = {}
        if exif:
            meta_data['date_time'] = get_datetime(exif)
            meta_data['location'] = get_gps(exif) 
        else:
            meta_data['date_time'] = get_datetime(exif)
            meta_data['location'] = get_gps(exif)           
            print("No Exif data found in image.", file=sys.stderr)
        # ログ出力 (Node.jsのstderrに出力される)
        print(f"Extracted Metadata: {meta_data}", file=sys.stderr)
        
        # 2. GPTによるスタイル判定 (API Call)
        print("Consulting GPT-4o for image style...", file=sys.stderr)
        style = analyze_image_mood(input_path)
        print(f"GPT Decision: {style}", file=sys.stderr)
        
        # メタデータに決定したスタイルも含める（フロントエンドで表示したければ）
        meta_data['style'] = style

        # 3. 判定結果に基づき画像処理を実行
        if style == "vivid":
            new_img = enhance_image(img_pil)
        elif style == "sad":
            new_img = sad_filter(img_pil)
        elif style == "sketch":
            new_img = pencil_sketch_filter(img_pil)
        else:
            new_img = enhance_image(img_pil) # Default

        # 3. 処理後の画像を出力パスに保存する
        if meta_data['date_time']:
            time_prefix = datetime.fromisoformat(meta_data['date_time']).strftime('%y%m%d%H%M%S') # 日時をYYMMDDHHmmss形式にフォーマット (命名の基礎)
        else:
            # 日時情報がない場合は、処理時刻を使用
            time_prefix = datetime.now().strftime('unknown_%y%m%d%H%M%S')
        file_ext = os.path.splitext(original_name)[1]
        final_filename = f"{result_id}-{time_prefix}{file_ext}"
        meta_data['filepath'] =  '/results/images/'+ final_filename
        output_path = os.path.join(output_dir, final_filename)

        new_img.save(output_path)
        
        print(json.dumps(meta_data)) # Node.js側で受け取るためにメタデータを標準出力に出力
        print(f"Successfully processed image and saved to {output_path}", file=sys.stderr)
        sys.exit(0) # 成功終了

    except FileNotFoundError:
        print(f"Error: Input file not found at {input_path}", file=sys.stderr)
        sys.exit(1) # エラー終了
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1) # エラー終了

# =================================================================
# 実行部分
# =================================================================

if __name__ == "__main__":
    if len(sys.argv) != 5:
        print("Usage: python process_image.py <temp_path> <output_dir> <result_id> <original_name>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    result_id = sys.argv[3]
    original_name = sys.argv[4]
    
    process_image(input_file, output_dir, result_id, original_name)