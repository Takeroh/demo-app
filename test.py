import os
from openai import OpenAI       # ← この行が抜けていたのが原因です
from dotenv import load_dotenv  # .envファイルを読み込む機能

# .envファイルからAPIキーを読み込む
load_dotenv()

# クライアントの準備
client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY"),
)

try:
    # テスト送信
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": "大阪の面白い観光地を1つ教えて。"},
        ],
    )
    print("▼ GPTからの返答:")
    print(response.choices[0].message.content)

except Exception as e:
    print("エラーが発生しました:", e)