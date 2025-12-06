# scripts/image_processor.py
import sys
import os
from PIL import Image, ExifTags

# Exif情報に基づいて画像を回転する関数
def rotate_image_based_on_exif(img):
    try:
        exif = img._getexif()
    except Exception:
        # Exif情報がない場合はそのまま返す
        return img
    
    if exif is None:
        return img

    for orientation in ExifTags.TAGS.keys():
        if ExifTags.TAGS[orientation] == 'Orientation':
            break

    o = exif.get(orientation)
    
    # Orientationタグの値に基づいて回転/反転を適用
    if o == 3:
        img = img.transpose(Image.ROTATE_180)
    elif o == 6:
        img = img.transpose(Image.ROTATE_270)
    elif o == 8:
        img = img.transpose(Image.ROTATE_90)
        
    # ⚠️ 注意: Pillowの最新版では、img.load() と img.transpose() の後に
    # img.save() の前に img.getexif().get(orientation) を削除する処理が推奨されますが、
    # シンプルな自動修正なら上記のコードで動作することが多いです。
    
    return img

def process_image(input_path, output_path):
    try:
        # 1. 入力パスから画像を読み込む
        img = Image.open(input_path)
        img = rotate_image_based_on_exif(img) # Exif情報に基づいて回転
        
        # 2. 画像処理のロジックをここに記述
        new_img = img # (仮) 入力画像をコピー

        # 3. 処理後の画像を出力パスに保存する
        new_img.save(output_path)
        
        print(f"Successfully processed image and saved to {output_path}")
        sys.exit(0) # 成功終了

    except FileNotFoundError:
        print(f"Error: Input file not found at {input_path}", file=sys.stderr)
        sys.exit(1) # エラー終了
    except Exception as e:
        print(f"An unexpected error occurred: {e}", file=sys.stderr)
        sys.exit(1) # エラー終了

if __name__ == "__main__":
    if len(sys.argv) != 3:
        # 引数が足りない場合
        print("Usage: python image_processor.py <input_file_path> <output_file_path>", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    process_image(input_file, output_file)