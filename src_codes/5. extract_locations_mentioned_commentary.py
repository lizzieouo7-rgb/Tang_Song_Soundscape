import json
import time
from openai import OpenAI

# ================= 1. 配置区 =================
INPUT_FILE = 'tang_21_descriptions_for_empty_lng.json'  # 请替换为你实际生成的文件名
OUTPUT_FILE = 'tang_21_with_locations.json'
DEEPSEEK_API_KEY = ''  # ⚠️ 请填入你的真实 API Key

# 依据 DeepSeek 官方文档，使用 OpenAI SDK 并替换 base_url
client = OpenAI(
    api_key=DEEPSEEK_API_KEY, 
    base_url="https://api.deepseek.com"
)

# ================= 2. 核心提取逻辑 =================
def extract_location(description):
    """调用 DeepSeek API 提取描述中的创作地点"""
    
    # 构造强指令 Prompt，限制 LLM 的输出格式
    prompt = f"""
    请阅读以下唐诗的背景或赏析描述，判断其中是否明确提到了这首诗的创作地点（例如“在滁州时作”、“贬谪黄州时”等）。
    
    要求：
    1. 如果提到了创作地点，请【严格只】输出该地名（例如“滁州”、“黄州”、“长安”）。
    2. 如果没有提到任何明确的创作地点，请【严格只】输出“无”。
    3. 绝对不要输出任何其他解释性或过渡性的文字。

    描述内容：
    {description}
    """

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",  # DeepSeek 的对话模型
            messages=[
                {"role": "system", "content": "你是一个严谨的信息提取助手，严格遵循用户的输出格式要求。"},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,  # 降低温度，使模型输出更确定、不发散
            max_tokens=20     # 地名很短，限制 token 节省成本并防止它说废话
        )
        
        # 获取清理过后的返回文本
        result = response.choices[0].message.content.strip()
        
        # 将模型输出的“无”转换为更为规范的空字符串，方便你后续处理
        if result == "无":
            return ""
        return result
        
    except Exception as e:
        print(f"❌ API 请求出错: {e}")
        return ""

# ================= 3. 开始批量处理 =================
try:
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"📂 成功加载数据，共 {len(data)} 条记录准备处理...\n")
except FileNotFoundError:
    print(f"❌ 错误：找不到文件 {INPUT_FILE}")
    exit()

for index, item in enumerate(data):
    poem_title = item.get('poem', '未知诗歌')
    description = item.get('description', '')
    
    if not description:
        item['mentioned_location'] = ""
        print(f"[{index+1}/{len(data)}] 《{poem_title}》: 描述为空，跳过。")
        continue
        
    print(f"[{index+1}/{len(data)}] 正在分析 《{poem_title}》...", end=" ", flush=True)
    
    # 调用 API
    location = extract_location(description)
    
    # 将提取结果写入新的字段
    item['mentioned_location'] = location
    
    if location:
        print(f"✅ 提取到地点: {location}")
    else:
        print("➖ 未提及明确地点")
        
    # ⏱️ 稍微停顿一下，防止并发请求过快触发 API 频率限制 (Rate Limit)
    time.sleep(0.5)

# ================= 4. 保存结果 =================
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=4)

print(f"\n🎉 提取完成！所有数据已保存至：{OUTPUT_FILE}")