import pandas as pd

# 1. 读取 CSV 文件
# 假设你的文件名是 poems.csv
df = pd.read_csv('for_llm_location.csv')

# 2. 去重逻辑
# subset=['title', 'author'] 表示只看这两列是否重复
# keep='first' 表示保留第一次出现的记录
df_cleaned = df.drop_duplicates(subset=['title', 'author'], keep='first')

# 3. 保存结果
df_cleaned.to_csv('poems_deduplicated.csv', index=False, encoding='utf-8-sig')

print(f"处理完成！原始记录：{len(df)} 条，去重后剩余：{len(df_cleaned)} 条。")