import pandas as pd
from openai import OpenAI
from tqdm import tqdm
import time

# 1. 配置 DeepSeek API
API_KEY = "sk-946b3568b81c482992e4114723544d3e"  # 请替换为你的真实 API Key
client = OpenAI(
    api_key=API_KEY,
    base_url="https://api.deepseek.com"
)

# 2. 定义调用 DeepSeek 提取地点的函数
def extract_location(title):
    if not isinstance(title, str) or not title.strip():
        return "无"
    
    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system", 
                    "content": "你是一个专业的地理实体识别工具。你的任务是从用户给定的标题中提取出包含的地名（如国家、省份、城市、山川、著名建筑等）。"
                               "如果提取到多个地点，请用逗号分隔（如：北京,天津）。"
                               "如果没有包含任何地点，请严格且仅输出一个字：'无'。"
                               "绝对不要输出任何额外的解释性文字、标点符号或前缀。"
                },
                {
                    "role": "user", 
                    "content": title
                }
            ],
            temperature=0.1, 
            max_tokens=50
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"\n处理标题 '{title}' 时发生错误: {e}")
        return "API错误"

def main():
    input_file = "THIS_sum_sound_database.csv"
    output_file = "PROCESSED_sum_sound_database.csv"

    print("正在读取 CSV 文件...")
    df = pd.read_csv(input_file)
    print(f"原始数据共 {len(df)} 条。")

    # 3. 核心修改：过滤出 lng 列为空（NaN 或 空字符串）的条目
    df_filtered = df[df['lng'].isna() | (df['lng'] == '')].copy()
    print(f"过滤后 lng 为空（需要处理）的数据共 {len(df_filtered)} 条。")

    # 4. 增加一列 title_location 并初始化
    df_filtered['title_location'] = ""

    # 5. 遍历处理 (使用 tqdm 显示进度条)
    print("开始调用 DeepSeek API 提取地点...")
    locations = []
    
    titles = df_filtered['title'].tolist()
    
    for title in tqdm(titles, desc="处理进度"):
        loc = extract_location(title)
        locations.append(loc)
        time.sleep(0.1) 

    # 将提取结果赋值给新列
    df_filtered['title_location'] = locations

    # 6. 保存结果
    df_filtered.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n处理完成！结果已保存至 {output_file}")

if __name__ == "__main__":
    main()