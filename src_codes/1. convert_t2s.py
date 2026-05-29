import json
import opencc

# 初始化转换器，'t2s.json' 代表 Traditional to Simplified (繁转简)
converter = opencc.OpenCC('t2s.json')

def convert_to_simplified(data):
    """
    递归遍历 JSON 数据，将所有的字符串从繁体转换为简体。
    """
    if isinstance(data, str):
        # 如果是字符串，直接转换
        return converter.convert(data)
    elif isinstance(data, list):
        # 如果是列表，遍历列表里的每一个元素进行转换
        return [convert_to_simplified(item) for item in data]
    elif isinstance(data, dict):
        # 如果是字典，保留键名不变，转换键值
        return {key: convert_to_simplified(value) for key, value in data.items()}
    else:
        # 如果是数字、布尔值等其他类型，直接返回原值
        return data

# 1. 读取繁体 JSON 文件
input_filename = 'Tangshi300_raw.json'   # 请替换为你的实际文件名
output_filename = 'Tangshi300_simp_raw.json'  # 转换后输出的文件名

print("正在读取文件...")
with open(input_filename, 'r', encoding='utf-8') as f:
    trad_data = json.load(f)

# 2. 执行转换
print("正在执行繁转简...")
simp_data = convert_to_simplified(trad_data)

# 3. 将转换后的简体数据写入新文件
print("正在保存文件...")
with open(output_filename, 'w', encoding='utf-8') as f:
    # ensure_ascii=False 确保输出的是中文字符而不是 Unicode 编码
    # indent=2 让输出的 JSON 文件保持漂亮的排版格式
    json.dump(simp_data, f, ensure_ascii=False, indent=2)

print(f"🎉 搞定！简体版本已保存为: {output_filename}")