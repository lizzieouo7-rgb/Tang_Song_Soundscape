import json
import os
import uuid
import time
from openai import OpenAI

# ==========================================
# 1. 配置 DeepSeek API
# ==========================================
# 请把这里的字符串换成你申请的 DeepSeek API Key
DEEPSEEK_API_KEY = ""

client = OpenAI(
    api_key=DEEPSEEK_API_KEY,
    base_url="https://api.deepseek.com" # DeepSeek 的官方接口地址
)

def extract_sounds_from_poem(poem,max_retries = 3):
    poem_text = "".join(poem.get("paragraphs", []))
    poem_title = poem.get("title", "")
    poem_author = poem.get("author", "")
    
    # 构建极其严谨的 System Prompt (Prompt Engineering)
    system_prompt = """
    You are an expert in Digital Humanities and classical Chinese literature.
    Your task is to extract ALL sound-related entries from the provided poem.

    ## Definitions
    A "sound entry" is any phrase where:
    - A sound is directly described or strongly implied
    - An onomatopoeia is used
    - A sound-producing action is explicitly named (e.g., 歌, 弹, 击)
    - A sound is negated (e.g., 不闻, 无声, 莫唱)
    - A "spatial anchor" is the location where the sound occurs or is perceived. 
    It can be explicitly stated in the line, inferred from adjacent lines, or deduced from the poem's title. If absolutely no location can be determined, it should be marked as null.
    Do NOT extract phrases that are purely visual, tactile, spatial, 
    or olfactory imagery with no auditory dimension.

    ## Controlled Vocabularies (use EXACT values, case-sensitive)

    sound_category:
    - "Nature"      : sounds from natural elements (wind, rain, water, thunder)
    - "Animal"      : sounds from animals or birds
    - "Human"       : sounds from human voice or body (singing, weeping, speech)
    - "Instrument"  : sounds from musical instruments
    - "Environment" : sounds from man-made objects or built environment 
                    (bells, clocks, oars, footsteps)
    - "Other"       : use only if none of the above apply; 
                    set confidence_score below 0.5

    perception_modality:
    - "direct"     : the speaker explicitly perceives the sound
    - "implied"    : sound is strongly implied by context or action
    - "inferred"   : sound is indirectly inferred (e.g., from visual scene)

    perception_reality:
    - "real"       : sound occurs in the present moment of the poem
    - "memory"     : sound is recalled from the past
    - "dream"      : sound occurs within a dream
    - "imagination": sound is imagined or anticipated
    
    location_type:
    - "toponym"     : a specific, namable geographic location (e.g., 长安, 楚江, 岭外). This is highly valuable for GIS mapping.
    - "micro_space" : a generic spatial setting or architectural element (e.g., 楼头, 窗外, 林间, 孤舟).
    - "implied"     : the location is not explicitly stated in the line but strongly implied by the poem's title or overall context.
    - "null"        : no specific location can be determined.
    ## Output Schema
    For EACH sound entry, output a JSON object with these exact fields:

    {
        "sound_id": "snd_[8 random hex characters]",
        "poem_id": "[provided poem_id]",
        "original_phrase": "[exact Chinese phrase containing the sound]",
        "original_phrase_en": "[literal English translation of the phrase]",
        "sound_source_raw": "[the primary sound-producing entity in Chinese]",
        "sound_source_en": "[English translation of sound source]",
        "context_window": "[the full line containing the phrase]",
        "sound_category": "[one value from sound_category vocabulary above]",
        "location_raw": "[exact Chinese text indicating the location, or null if none]",
        "location_en": "[English translation of the location, or null]",
        "location_type": "[one value from location_type vocabulary above]",
        "perception_modality": "[one value from perception_modality vocabulary above]",
        "perception_reality": "[one value from perception_reality vocabulary above]",
        "is_negated": [true or false],
        "extraction_method": "LLM",
        "confidence_score": [float between 0.0 and 1.0]
    }

    ## Rules
    1. Output ONLY a valid JSON object. No markdown, no explanation, 
    no ```json fences.
    2. If no sounds are present, output an empty array: []
    3. Never use "Unknown" in any field.
    4. If a category is uncertain, pick the closest value and 
    set confidence_score below 0.5.
    5. If multiple phrases in the same line refer to the same sound 
    source, extract only the single most representative phrase.
    6. For is_negated, mark true when the sound is explicitly 
    refused, forbidden, absent, or unheard 
    (e.g., 不闻, 无声, 莫唱, 休啼).
    7. For location_raw, extract the most concise spatial phrase possible. Do not extract the whole line.
    8. If location_type is "null", then location_raw and location_en MUST be strictly set to the JSON null value (not the string "null").
    """

    user_prompt = f"Poem Title: {poem_title}\nAuthor: {poem_author}\nText: {poem_text}\n\nExtract the sounds according to the schema."

    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
                timeout=30 # 设置超时时间防止卡死
            )
            
            result_text = response.choices[0].message.content
            extracted_data = json.loads(result_text)
            
            if isinstance(extracted_data, list):
                sounds = extracted_data
            elif isinstance(extracted_data, list):
                sounds = extracted_data.get("sounds", [])
            else:
                sounds = []
            
            for sound in sounds:
                sound["poem_id"] = poem.get("id")
                sound["sound_id"] = f"snd_{uuid.uuid4().hex[:8]}"
                
            return sounds

        except Exception as e:
            print(f"   ⚠️ 提取 {poem_title} 失败 (尝试 {attempt+1}/{max_retries}): {e}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # 指数退避: 1s, 2s, 4s...
            else:
                print(f"   ❌ {poem_title} 彻底失败，已跳过。")
                return [] # 只有在多次重试后才放弃

# ==========================================
# 2. 批量处理并保存
# ==========================================
def main():
    input_file = "poem_database.json"
    output_file = "sound_level_database.json"
    
    with open(input_file, 'r', encoding='utf-8') as f:
        mvp_poems = json.load(f)
        
    all_sounds = []
    print(f"🚀 开始使用 DeepSeek 提取 {len(mvp_poems)} 首诗词的声音特征...")
    
    for i, poem in enumerate(mvp_poems, 1):
        print(f"正在分析 ({i}/{len(mvp_poems)}): {poem['title']} - {poem['author']}")
        sounds = extract_sounds_from_poem(poem)
        all_sounds.extend(sounds)
        print(f"   -> 提取到 {len(sounds)} 个声音事件。")
        
        if i % 10 == 0 or i == len(mvp_poems):
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(all_sounds, f, ensure_ascii=False, indent=2)
            print(f"   💾 [进度保存] 已保存前 {i} 首的数据到本地。")
            
    print(f"\n🎉 提取完成！总共找到 {len(all_sounds)} 个声音事件。")

if __name__ == "__main__":
    main()
