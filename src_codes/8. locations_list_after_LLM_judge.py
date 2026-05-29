import pandas as pd
import os

def parse_txt_safely(file_path):
    """更加稳健的 4 行一组解析逻辑"""
    records = []
    
    # 尝试不同的编码读取文件
    encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb18030']
    lines = []
    
    for enc in encodings:
        try:
            with open(file_path, 'r', encoding=enc) as f:
                # 过滤掉纯空白行，但保留内容
                lines = [line.strip() for line in f.readlines() if line.strip()]
            if lines:
                print(f"成功使用 {enc} 编码读取，总计 {len(lines)} 行有效内容。")
                break
        except Exception:
            continue

    if not lines:
        print("错误：无法读取文件内容或文件为空！")
        return pd.DataFrame()

    # 判断第一行是否为表头（如果第一行包含“标题”二字，则从第二行开始解析）
    start_idx = 1 if "标题" in lines[0] else 0
    
    # 每 4 行作为一个记录进行循环
    for i in range(start_idx, len(lines), 4):
        # 确保剩余行数足够组成一个记录
        if i + 3 < len(lines):
            title = lines[i]
            author = lines[i+1]
            location = lines[i+2]
            
            # 处理最后一行的复杂情况 (可信度 结论 理由)
            last_line = lines[i+3]
            parts = last_line.split(maxsplit=2)
            
            reliability = parts[0] if len(parts) > 0 else ""
            conclusion = parts[1] if len(parts) > 1 else ""
            reason = parts[2] if len(parts) > 2 else ""
            
            records.append({
                "标题": title,
                "作者": author,
                "DS地点": location,
                "DS可信度": reliability,
                "仲裁结论": conclusion,
                "仲裁理由": reason
            })
    
    df = pd.DataFrame(records)
    if df.empty:
        print("警告：解析后未发现有效数据记录，请检查 TXT 格式是否为 4 行一组。")
    else:
        print(f"成功解析出 {len(df)} 条数据记录。")
    return df

def main():
    txt_path = "claude_judge.txt"
    csv_path = "location_seek_ds.csv"
    output_path = "location_ds_verified.csv"

    # 检查文件是否存在
    if not os.path.exists(txt_path):
        print(f"错误：找不到文件 {txt_path}")
        return

    # 1. 解析 TXT
    df_txt = parse_txt_safely(txt_path)
    
    # 防御性编程：如果 df_txt 为空，不再继续执行
    if df_txt.empty or "标题" not in df_txt.columns:
        print("由于 TXT 解析失败，程序终止。")
        return

    # 2. 读取 CSV
    try:
        df_csv = pd.read_csv(csv_path, sep=r',\s*', engine='python', encoding='utf-8-sig')
    except Exception as e:
        # 如果 utf-8 报错，尝试 gbk
        df_csv = pd.read_csv(csv_path, sep=r',\s*', engine='python', encoding='gbk')

    # 清理数据
    df_txt['标题'] = df_txt['标题'].str.strip()
    df_csv['title'] = df_csv['title'].str.strip()

    # 3. 逻辑过滤
    # 只要结论里包含“剔除”或“删除”就过滤
    remove_titles = df_txt[df_txt['仲裁结论'].str.contains('剔除|删除', na=False)]['标题'].tolist()
    # 只要结论里包含“降级”就打 F
    downgrade_titles = df_txt[df_txt['仲裁结论'].str.contains('降级', na=False)]['标题'].tolist()

    # 4. 执行过滤并标记
    df_result = df_csv[~df_csv['title'].isin(remove_titles)].copy()
    df_result['certainty'] = df_result['title'].apply(lambda x: 'F' if x in downgrade_titles else '')

    # 5. 保存结果
    df_result.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"--- 任务成功 ---")
    print(f"已剔除条目：{len(remove_titles)} 条")
    print(f"已标记 F 条目：{len(downgrade_titles)} 条")
    print(f"最终结果已保存至：{output_path}")

if __name__ == "__main__":
    main()