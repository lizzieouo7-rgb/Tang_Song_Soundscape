import json
import os

def process_poem_data(tang_file, song_file, output_file):
    unified_database = []
    
    # ==========================================
    # 1. 处理《唐诗三百首》
    # ==========================================
    try:
        with open(tang_file, 'r', encoding='utf-8') as f:
            tang_data = json.load(f)
            
        print(f"正在处理唐诗，共计 {len(tang_data)} 首...")
        for index, poem in enumerate(tang_data, 1):
            title = poem.get("title", "无题")
            author = poem.get("author", "佚名")
            
            author_initial = author[0] if author else "佚"
            poem_id = f"tang_{title}_{author_initial}_{index:04d}"
            
            # 智能提取唐诗的具体体裁
            tags = poem.get("tags", [])
            genre = "诗" # 默认值
            
            unified_database.append({
                "id": poem_id,
                "title": title,
                "author": author,
                "dynasty": "唐",         # 新增：朝代
                "genre": genre,          # 新增：体裁（如五言律诗）
                "paragraphs": poem.get("paragraphs", [])
            })
    except FileNotFoundError:
        print(f"⚠️ 找不到唐诗文件: {tang_file}")

    # ==========================================
    # 2. 处理《宋词三百首》
    # ==========================================
    try:
        with open(song_file, 'r', encoding='utf-8') as f:
            song_data = json.load(f)
            
        print(f"正在处理宋词，共计 {len(song_data)} 首...")
        for index, poem in enumerate(song_data, 1):
            ci_pai = poem.get("rhythmic", "无题")
            author = poem.get("author", "佚名")
            
            author_initial = author[0] if author else "佚"
            poem_id = f"song_{ci_pai}_{author_initial}_{index:04d}"
            
            unified_database.append({
                "id": poem_id,
                "title": ci_pai,
                "author": author,
                "dynasty": "宋",         # 新增：朝代
                "genre": "词",           # 新增：体裁
                "paragraphs": poem.get("paragraphs", [])
            })
    except FileNotFoundError:
        print(f"⚠️ 找不到宋词文件: {song_file}")

    # ==========================================
    # 3. 导出统一数据库
    # ==========================================
    if unified_database:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(unified_database, f, ensure_ascii=False, indent=2)
        print(f"🎉 搞定！已成功合并 {len(unified_database)} 首诗词。")
        print(f"统一数据库已保存为: {output_file}")
    else:
        print("❌ 未能生成数据库，请检查输入文件。")

# ==========================================
# 运行配置区
# ==========================================
if __name__ == "__main__":
    # 确保这里的文件名和你之前转换好的一致
    INPUT_TANG_FILE = "Tangshi300_simp_raw.json"    
    INPUT_SONG_FILE = "Songci300_raw.json"    
    OUTPUT_FILE = "poem_database.json"
    
    process_poem_data(INPUT_TANG_FILE, INPUT_SONG_FILE, OUTPUT_FILE)