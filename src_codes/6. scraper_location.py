import requests
import pandas as pd
import time
import urllib.parse

# ================= 1. 读取 CSV 文件 =================
filename = 'PROCESSED_sum_sound_database.csv'
try:
    df = pd.read_csv(filename)
    print(f"📂 成功加载文件，共发现 {len(df)} 条记录。")
    
    # 🌟【关键修复 1】：把 lat 和 lng 列强制转换为数值类型（浮点数）
    # 这样填入 34.523694 等小数时就不会报 dtype 错误了
    df['lat'] = pd.to_numeric(df['lat'], errors='coerce')
    df['lng'] = pd.to_numeric(df['lng'], errors='coerce')
    
except FileNotFoundError:
    print(f"❌ 错误：在当前目录下没找到 {filename}。请确保文件放对了位置。")
    exit()

# ================= 2. 核心配置 =================
base_url = "https://cnkgraph.com/Api/Biography/Poems/"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}

# ================= 3. 筛选需要爬取的行 =================
missing_lng_indices = df[df['lng'].isna()].index
print(f"🔍 发现 {len(missing_lng_indices)} 条记录缺失经纬度信息，开始爬取...\n")

# ================= 4. 开始自动化处理 =================
for idx in missing_lng_indices:
    title = str(df.loc[idx, 'title']) if pd.notna(df.loc[idx, 'title']) else ""
    author = str(df.loc[idx, 'author']) if pd.notna(df.loc[idx, 'author']) else ""
    
    search_keyword = f"{title} {author}".strip()
    
    if not search_keyword:
        print(f"第 {idx+1} 行: ⚠️ 标题和作者均为空，跳过。")
        continue

    encoded_keyword = urllib.parse.quote(search_keyword)
    request_url = f"{base_url}{encoded_keyword}"
    
    print(f"正在查询 (行号 {idx+1}): [{title}] {author} ...", end=" ", flush=True)
    
    try:
        response = requests.get(request_url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if data.get("Traces") and len(data["Traces"]) > 0:
                lat = data["Traces"][0].get("CenterLatitude")
                lng = data["Traces"][0].get("CenterLongitude")
                
                # 现在写入浮点数就不会报错了
                df.at[idx, 'lat'] = float(lat) if lat else None
                df.at[idx, 'lng'] = float(lng) if lng else None
                
                print(f"✅ 成功 ({lat}, {lng})")
            else:
                print("⚠️ 未找到坐标 (JSON数据为空)")
                
        # 🌟【关键修复 2】：单独处理 204 状态码
        elif response.status_code == 204:
            print("⚠️ API未收录此诗 (204无内容)")
            
        else:
            print(f"❌ 请求失败 (状态码: {response.status_code})")
            
    except Exception as e:
        print(f"❌ 异常: {e}")
    
    time.sleep(1.5)

# ================= 5. 导出合并后的数据 =================
output_file = "UPDATED_sum_sound_database.csv"
df.to_csv(output_file, index=False, encoding='utf-8-sig')
print(f"\n🎉 任务完成！数据已保存至：{output_file}")