import json
import os
from pypinyin import pinyin, Style

def format_author_en(name):
    """
    将中文名转为英文格式：
    李白 -> Li Bai
    骆宾王 -> Luo Binwang
    """
    if not name or not isinstance(name, str):
        return ""
    
    # 获取不带声调的拼音列表
    py_list = pinyin(name, style=Style.NORMAL)
    py_list = [item[0] for item in py_list]
    
    if len(py_list) == 0:
        return ""
    if len(py_list) == 1:
        return py_list[0].capitalize()
    
    # 姓：第一个字，首字母大写
    surname = py_list[0].capitalize()
    # 名：后续所有字合并，首字母大写
    given_name = "".join(py_list[1:]).capitalize()
    
    return f"{surname} {given_name}"

def main():
    # --- 绝对路径处理核心部分 ---
    # 获取当前脚本 (pinyin_process.py) 所在的文件夹绝对路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 构建输入和输出文件的完整路径
    input_file = os.path.join(current_dir, 'sounds.geojson')
    output_file = os.path.join(current_dir, 'sounds_updated.geojson')
    
    # 检查文件是否存在，给出友好提示
    if not os.path.exists(input_file):
        print(f"❌ 错误：在以下路径找不到文件：\n{input_file}")
        return

    print(f"📂 正在读取: {input_file}")

    # --- 处理 GeoJSON ---
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        features = data.get('features', [])
        count = 0

        for feature in features:
            properties = feature.get('properties', {})
            author_cn = properties.get('author', '')
            
            if author_cn:
                author_en = format_author_en(author_cn)
                properties['author_en'] = author_en
                count += 1
        
        # --- 保存结果 ---
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ 处理成功！")
        print(f"✨ 已为 {count} 个要素添加了 'author_en' 列。")
        print(f"💾 结果保存至: {output_file}")

    except Exception as e:
        print(f"💥 处理过程中发生错误: {e}")

if __name__ == "__main__":
    main()