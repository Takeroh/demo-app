SCENERY_LABELS = [
    # 自然・絶景
    "nature_mountain", "nature_sea", "nature_beach", "nature_forest",
    "nature_sunset", "nature_snow", "nature_starry_sky",
   
    # 都市・観光
    "urban_city", "urban_night_view", "urban_street_market",
    "amusement_park", "fireworks",
   
    # 文化・歴史
    "historical_temple_shrine", "historical_castle", "museum_art",
   
    # 食事・カフェ
    "food_restaurant", "food_sweets", "indoor_cafe", "alcohol_bar",
   
    # 移動・その他
    "transport_train", "transport_drive", "transport_airport",
    "indoor_hotel", "relax_onsen"
]


EMOTION_LABELS = [
    # --- 既存の基本感情 ---
    "joy",                # ニッコリ
    "excitement",         # 大興奮、盛り上がり
    "peaceful",           # 平和な、穏やか
    "relaxed",            # リラックス、くつろぐ
    "contemplative",      # 物思いにふける
    "traditional_japan",  # 和の風情、伝統
    "romantic",           # ロマンチック
    "nostalgic",          # エモい、懐かしい
    "delicious",          # 美味しい
    "tired",              # 疲れた、休憩
    "surprise",           # 驚き
    "sadness",            # 悲しみ、哀愁
    "default",            # その他・デフォルト


    # --- 追加：詳細な感情・リアクション ---
    "laughter",           # 大爆笑
    "anger",              # 怒り
    "confused",           # 疑問、混乱
    "cool",               # クール、かっこいい
    "love",               # 大好き、愛
    "shock",              # ショック、絶叫
    "shy",                # 照れる、赤面
    "gratitude",          # 感謝、ありがとう
    "cheers",             # 乾杯
    "agreement",          # OK、賛成
    "refusal",            # NG、拒否


    # --- 追加：行動・アクティビティ ---
    "working",            # 仕事、作業中
    "studying",           # 勉強、読書
    "shopping",           # 買い物
    "traveling",          # 旅行、移動
    "driving",            # ドライブ
    "train_trip",         # 電車旅
    "walking",            # 散歩、徒歩
    "photography",        # 写真撮影
    "music",              # 音楽鑑賞、演奏
    "sports",             # スポーツ
    "art",                # アート、創作
    "gaming",             # ゲーム


    # --- 追加：場所・風景・観光 ---
    "sightseeing",        # 観光地巡り
    "historic",           # 歴史的建造物、寺社
    "modern_city",        # 都市、夜景
    "nature",             # 大自然、山
    "beach",              # 海、ビーチ
    "park",               # 公園
    "amusement_park",     # 遊園地
    "museum",             # 博物館、美術館


    # --- 追加：動物・生き物 ---
    "zoo",                # 動物園
    "pet",                # ペット（犬猫など）
    "carnivore",          # 肉食動物
    "herbivores",         # 草食動物
    "fish",               # 魚、水族館
    "insect",             # 虫


    # --- 追加：天気・時間帯 ---
    "sunny",              # 晴れ
    "rainy",              # 雨
    "cloudy",             # 曇り
    "snowy",              # 雪
    "morning",            # 朝
    "night",              # 夜


    # --- 追加：その他 ---
    "idea",               # ひらめき
    "lucky",              # 幸運
    "urgent",             # 緊急、急ぎ
    "money",              # お金、会計
    "health"              # 健康、医療
]
# ==========================================
# 2. マッピング定義 (フロントエンドに渡すID)
# ==========================================


# 風景 -> 音楽ID (BGM)
MUSIC_MAPPING = {
    # 自然系
    "nature_mountain":          "bgm_hiking_acoustic",     # 爽やかなアコギ
    "nature_sea":               "bgm_ocean_wave",          # 波の音とピアノ
    "nature_beach":             "bgm_tropical_house",      # ビーチっぽい明るい曲
    "nature_forest":            "bgm_forest_healing",      # 森の環境音
    "nature_sunset":            "bgm_emotional_piano",     # 夕暮れのエモいピアノ
    "nature_snow":              "bgm_winter_bell",         # 冬っぽいキラキラ音
    "nature_starry_sky":        "bgm_ambient_space",       # 静かなアンビエント
   
    # 都市・賑やか系
    "urban_city":               "bgm_city_pop_drive",      # シティポップ
    "urban_night_view":         "bgm_lofi_hiphop",         # オシャレなローファイ
    "urban_street_market":      "bgm_market_bustle",       # 雑踏と明るい曲
    "amusement_park":           "bgm_carnival_fun",        # 遊園地のパレード風
    "fireworks":                "bgm_summer_festival",     # 夏祭り風
   
    # しっとり・文化系
    "historical_temple_shrine": "bgm_japanese_koto",       # 和風・琴の音
    "historical_castle":        "bgm_epic_orchestra",      # 壮大なオーケストラ
    "museum_art":               "bgm_classical_piano",     # クラシック
   
    # 食事・屋内系
    "food_restaurant":          "bgm_dinner_jazz",         # おしゃれジャズ
    "food_sweets":              "bgm_cute_pop",            # 可愛いポップ
    "indoor_cafe":              "bgm_cafe_bossanova",      # ボサノバ
    "alcohol_bar":              "bgm_moody_jazz_bar",      # 大人なバーの雰囲気
   
    # 移動・リラックス系
    "transport_train":          "bgm_travel_train",        # 旅番組のOP風
    "transport_drive":          "bgm_driving_rock",        # 疾走感のあるロック
    "transport_airport":        "bgm_airport_lounge",      # ラウンジ音楽
    "indoor_hotel":             "bgm_relaxing_spa",        # スパ・リラックス
    "relax_onsen":              "bgm_water_sound",         # 水の音・和風
   
    # デフォルト
    "default":                  "bgm_acoustic_guitar"
}


# 感情 -> スタンプID
STAMP_MAPPING = {
    # --- 既存の基本感情 ---
    "joy":                "stamp_big_smile",      # ニッコリ
    "excitement":         "stamp_party_popper",   # クラッカー/キラキラ
    "peaceful":           "stamp_dove",           # 平和の鳩
    "relaxed":            "stamp_relax",          # リラックス/温泉
    "contemplative":      "stamp_thinking",       # 考える顔
    "traditional_japan":  "stamp_tea_cup",        # 伝統的な日本/湯呑み
    "romantic":           "stamp_heart_pink",     # ピンクのハート
    "nostalgic":          "stamp_film_camera",    # フィルムカメラ/セピア
    "delicious":          "stamp_yummy_face",     # 舌ペロリ/カトラリー
    "tired":              "stamp_sleeping_zzz",   # Zzz...
    "surprise":           "stamp_exclamation",    # ビックリマーク
    "sadness":            "stamp_crying_face",    # 涙
    "default":            "stamp_star",           # デフォルト


    # --- 追加：詳細な感情・リアクション ---
    "laughter":           "stamp_lol_face",       # 大爆笑
    "anger":              "stamp_angry_vein",     # 怒り/怒りマーク
    "confused":           "stamp_question_mark",  # 疑問/ハテナ
    "cool":               "stamp_sunglasses",     # クール/サングラス
    "love":               "stamp_heart_eyes",     # 目がハート
    "shock":              "stamp_scream_face",    # 叫び/ムンク
    "shy":                "stamp_blushing_face",  # 赤面/照れ
    "gratitude":          "stamp_praying_hands",  # 感謝/合掌
    "cheers":             "stamp_clinking_beer",  # 乾杯/ビール
    "agreement":          "stamp_ok_hand",        # OKサイン
    "refusal":            "stamp_cross_arms",     # NG/バツ


    # --- 追加：行動・アクティビティ ---
    "working":            "stamp_laptop",         # 仕事/PC
    "studying":           "stamp_pencil_books",   # 勉強/本
    "shopping":           "stamp_shopping_bag",   # 買い物
    "traveling":          "stamp_airplane",       # 旅行/飛行機
    "driving":            "stamp_car",            # ドライブ/車
    "train_trip":         "stamp_train",          # 電車旅
    "walking":            "stamp_sneakers",       # 散歩/靴
    "photography":        "stamp_camera_flash",   # 写真撮影
    "music":              "stamp_musical_note",   # 音楽/音符
    "sports":             "stamp_soccer_ball",    # スポーツ
    "art":                "stamp_palette",        # 芸術/パレット
    "gaming":             "stamp_game_controller",# ゲーム


    # --- 追加：場所・風景・観光（エッフェル塔などの観光地向け） ---
    "sightseeing":        "stamp_binoculars",     # 観光/双眼鏡
    "historic":           "stamp_temple",         # 歴史的建造物/寺社
    "modern_city":        "stamp_city_night",     # 都市/夜景
    "nature":             "stamp_mountain",       # 自然/山
    "beach":              "stamp_beach_umbrella", # 海/ビーチ
    "park":               "stamp_bench_tree",     # 公園/ベンチ
    "amusement_park":     "stamp_ferris_wheel",   # 遊園地/観覧車
    "zoo":                "stamp_zoo",      # 動物園
    "pet":                "stamp_pet",      # 犬/猫
    "carnivore":                "stamp_carnivore",      # 肉食動物  
    "herbivores":                "stamp_herbivores",      # 草食動物
    "fish":                "stamp_fish",      # 魚
    "insect":                "stamp_insect",      # 虫
    "museum":             "stamp_column",         # 博物館/柱


    # --- 追加：天気・時間帯 ---
    "sunny":              "stamp_sun",            # 晴れ
    "rainy":              "stamp_umbrella_rain",  # 雨
    "cloudy":             "stamp_cloud",          # 曇り
    "snowy":              "stamp_snowman",        # 雪/雪だるま
    "morning":            "stamp_sunrise",        # 朝/日の出
    "night":              "stamp_moon_stars",     # 夜/月と星


    # --- 追加：その他 ---
    "idea":               "stamp_light_bulb",     # ひらめき/電球
    "lucky":              "stamp_clover",         # 幸運/クローバー
    "urgent":             "stamp_alarm_clock",    # 緊急/時計
    "money":              "stamp_yen_bag",        # お金/買い物
    "health":             "stamp_pill_medical",   # 健康/薬
}





