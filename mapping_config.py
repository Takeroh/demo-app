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
    "joy",          # 楽しい、笑顔
    "excitement",   # 大興奮、盛り上がり
    "calm",         # 落ち着く、まったり
    "romantic",     # ロマンチック、うっとり
    "nostalgic",    # エモい、懐かしい
    "delicious",    # 美味しい！
    "tired",        # 疲れた、休憩
    "surprise",     # 驚き
    "sadness"       # 帰りたくない、哀愁
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
    "joy":          "stamp_big_smile",      # ニッコリ
    "excitement":   "stamp_party_popper",   # クラッカー/キラキラ
    "calm":         "stamp_tea_cup",        # お茶/湯気
    "romantic":     "stamp_heart_pink",     # ピンクのハート
    "nostalgic":    "stamp_film_camera",    # フィルムカメラ/セピア
    "delicious":    "stamp_yummy_face",     # 舌ペロリ/カトラリー
    "tired":        "stamp_sleeping_zzz",   # Zzz...
    "surprise":     "stamp_exclamation",    # ビックリマーク
    "sadness":      "stamp_crying_face",    # 涙
    "default":      "stamp_star"
}