import sys
import os
from datetime import datetime
from fractions import Fraction
from typing import Dict, Any, Optional, Tuple
import json
from PIL import Image, ExifTags
#OpenCVのimportが必要
#import cv2
#import numpy as np
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

# =================================================================
# メイン処理関数
# =================================================================

def process_image(input_path: str, output_dir: str, result_id: str, original_name: str) -> None:
    try:
        # 1. 入力パスから画像を読み込む
        img = Image.open(input_path)

        exif = get_exif(img)
        img = rotate_image(img, exif)

        meta_data = {}
        if exif:
            meta_data['date_time'] = get_datetime(exif)
            meta_data['location'] = get_gps(exif)
            # ログ出力 (Node.jsのstderrに出力される)
            print(f"Extracted Metadata: {meta_data}", file=sys.stderr)
        
        # 2. 画像処理のロジックをここに記述
        if img is None:
            print("画像が見つかりません。test.jpg を同じフォルダに置いてください。")
            exit()

        # ---- 2. コントラスト強調（CLAHE：映える処理の定番） ----
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)

        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        l2 = clahe.apply(l)

        lab2 = cv2.merge((l2, a, b))
        img_clahe = cv2.cvtColor(lab2, cv2.COLOR_LAB2BGR)

        # ---- 3. 彩度アップ（映える色にする） ----
        hsv = cv2.cvtColor(img_clahe, cv2.COLOR_BGR2HSV)
        h, s, v = cv2.split(hsv)

        s = cv2.multiply(s, 1.2)   # 彩度を20%アップ
        s = np.clip(s, 0, 255).astype(np.uint8)

        hsv2 = cv2.merge((h, s, v))
        img_vivid = cv2.cvtColor(hsv2, cv2.COLOR_HSV2BGR)

        # ---- 4. 軽くシャープ処理 ----
        kernel = np.array([[0, -1,  0],
                        [-1,  5, -1],
                        [0, -1,  0]])
        img_sharp = cv2.filter2D(img_vivid, -1, kernel)
        new_img = img_sharp # 一応コード書いたが、適切な映え写真はソースによって異なるので処理を変える可能性はある

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