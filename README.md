
# 📜 Tang Song Soundscape

> **Explore the historical soundscapes of classical Chinese literature across space and time.** > 🌐 **[Live Demo: Interactive Soundscape Map](#)** *(Replace this with your GitHub Pages link)*

## 📖 About The Project

Currently, the public primarily experiences classical Chinese literature by focusing on visual imagery. However, auditory details—such as the chirping of cicadas, the blowing of frontier winds, or the playing of Jiangnan flutes—are crucial for building the poetic atmosphere. 

This digital humanities project transforms abstract sound descriptions from **300 Tang Poems** and **300 Song Lyrics (Ci)** into an intuitive, interactive visual map. By tracking these "sound events," this project explores how the geographic distribution and categories of auditory imagery shifted over 600 years, reflecting broader historical, political, and cultural changes (from the expansive Tang frontiers to the urbanized Southern Song commercial hubs).

### ✨ Key Features
* **Time-Space Navigation:** Toggle between Tang, Northern Song, and Southern Song dynasties to observe the geographic shift of sound centers.
* **Ink-Wash Heatmaps (KDE):** Dynamic Kernel Density Estimation visualizes the "noisiest" cultural hubs in a traditional Chinese aesthetic.
* **Details-on-Demand:** Click any sound marker (ink drop) to read the original poetic phrase, its English translation, and context.
* **Poets Graph (Radar Chart):** Compare the sound description preferences of different poets (e.g., Li Bai vs. Su Shi) using D3.js.

---

## 🛠 The Data Pipeline & Methodology

To ensure historical accuracy and prevent "LLM Hallucinations", this project implemented a strict **Human-in-the-Loop** mechanism and a **4-Level Geocoding Pipeline**. 

The source code for this pipeline is sequentially organized in the `src_codes/` directory:

1.  **Text Preprocessing & Ontology Extraction**
    * `1. convert_t2s.py`: Converts raw traditional Chinese text to simplified.
    * `2. poem_level_db.py`: Builds the foundational poetry metadata database.
2.  **Sound Event Extraction (LLM)**
    * `3. extract_sounds_llm.py`: Utilizes LLM APIs to extract auditory phrases, sound sources, and perception modalities (heard vs. inferred).
3.  **The 4-Level Geocoding Pipeline**
    * *Priority 1 & 2 (Direct Mentions):* `4. extract_mentioed_commentary.py` & `5. extract_locations_mentioned_commentary.py`.
    * *Priority 3 (Web Scraping):* `6. scraper_location.py` (Cross-referencing chronological maps from Souyun).
    * *Priority 4 (Cross-Model Arbitration):* `7. deduplicated_before_LLM_judge.py` & `8. locations_list_after_LLM_judge.py`. **(Core Highlight)** We used multiple LLMs (DeepSeek & Gemini) to extract locations, and employed Claude as an automated "judge" to evaluate discrepancies. Script #8 automatically executes Claude's verdicts, filtering out errors and tagging uncertain historical locations with an `F` (False/Uncertain) certainty score.

---

## 📂 Repository Structure

```text
├── data/                   # Processed GeoJSON data (Sounds, Cities, Boundaries, KDE)
├── documents/              # Academic reports and high-res layout designs (PDFs)
├── icons/                  # Custom SVG markers (ink drops for 5 sound categories)
├── qgis_assets/            # Original QGIS project (.qgz) and GeoPackage data (.gpkg)
├── src_codes/              # Python scripts for data processing (numbered by pipeline stage)
├── index.html              # Web app entry point
├── script.js               # Frontend logic (Leaflet map & D3 radar chart)
└── style.css               # Web styling and traditional Chinese color palette
```

## How to use

1. **View the Interactive Web Map**
Simply visit the GitHub Pages URL to experience the interactive visualization. The frontend is built with pure HTML/CSS/JS, utilizing Leaflet.js (with Canvas rendering) for spatial mapping and D3.js for data visualization.
2. **Explore the GIS Data**
For researchers and GIS professionals:
Download the qgis_assets/ directory.
Open final_project_Yuxin_Su.qgz in QGIS (v3.x or higher).
The custom SVG symbology is located in the Customized_svgs/ folder. The boundaries of the dynasties were manually vectorized based on "Tan Qixiang's Edition of The Historical Atlas of China".
3. **Read the Academic Reports**
For a deep dive into the research methodology, data abstraction, and visualization design rationale, please refer to the PDF files in the documents/ folder.

## Author & Acknowledgements
**Author**: Yuxin Su
**Data Source**: chinese-poetry (GitHub)
**Basemap**: CARTO Voyager (Web) / Mapzen Global Terrain (QGIS)

Created as a final project for Spatial Data & Interactive Data Visualization coursework.