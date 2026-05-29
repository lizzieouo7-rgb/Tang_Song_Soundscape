// Dynasty color palettes — each dynasty has its own ink identity
const DYNASTY_STYLES = {
    tang: {
        boundary: { color: '#8B7536', fillColor: '#C8A84B', fillOpacity: 0.08, weight: 2.5, dashArray: null },
        kde: { color: '#7A4E1A', fillColor: '#C07A3A', fillOpacity: 0.18 },
        clusterBase: '#8B6914',
        clusterLight: '#E8C97A',
        svgFilter: 'url(#ink-bleed-tang)',
        kdeHoverOpacity: 0.38
    },
    nsong: {
        boundary: { color: '#5A7060', fillColor: '#7A9E80', fillOpacity: 0.08, weight: 2.5, dashArray: null },
        kde: { color: '#3D5C44', fillColor: '#6E9E74', fillOpacity: 0.18 },
        clusterBase: '#4A7A52',
        clusterLight: '#A8D4AC',
        svgFilter: 'url(#ink-bleed-nsong)',
        kdeHoverOpacity: 0.38
    },
    ssong: {
        boundary: { color: '#4A6478', fillColor: '#6E8EA6', fillOpacity: 0.08, weight: 2.5, dashArray: null },
        kde: { color: '#2E4E6A', fillColor: '#5A7E9E', fillOpacity: 0.18 },
        clusterBase: '#3A6080',
        clusterLight: '#9ABFD4',
        svgFilter: 'url(#ink-bleed-ssong)',
        kdeHoverOpacity: 0.38
    }
};

let currentDynastyKey = 'tang';
const map = L.map('map', { zoomControl: true, preferCanvas: true}).setView([34.3416, 108.9398], 5);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; CARTO', subdomains: 'abcd', maxZoom: 18
}).addTo(map);

let currentBoundaryLayer = null;
let currentKDELayer = null;
let currentSoundsLayer = null;
let markerClusterGroup = null;
let allSoundsData = null;
let currentDynastyFeatures = [];
let activeCategories = new Set(['animal', 'nature', 'human', 'instrument', 'environment']);

const infoPanel = document.getElementById('info-panel');
const buttons = {
    'tang': document.getElementById('btn-tang'),
    'nsong': document.getElementById('btn-nsong'),
    'ssong': document.getElementById('btn-ssong')
};

// 雷达图相关变量
let poetData = {};
let selectedPoets = [];
const radarColors = ["#8b2b22", "#2a5b63"];
const radarCategories = ["animal", "nature", "human", "instrument", "environment"];
const radarCategoryLabels = ["Animal", "Nature", "Human", "Instrument", "Environment"];

async function loadGeoJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
}

async function init() {
    try {
        setupTabs();

        const citiesData = await loadGeoJSON('./data/cities.geojson');
        L.geoJSON(citiesData, {
            pointToLayer: function (feature, latlng) {
                const props = feature.properties;
                const customIcon = L.divIcon({
                    html: `<div class="city-marker-container">
                             <div class="city-square"></div>
                             <div class="city-labels">
                               <div class="city-name">${props.Name || ""}</div>
                               <div class="city-pinyin">${props.Name_PY || ""}</div>
                             </div>
                           </div>`,
                    className: 'custom-city-icon', iconSize: [0, 0], iconAnchor: [3, 3]
                });
                return L.marker(latlng, { icon: customIcon, interactive: false });
            }
        }).addTo(map);

        allSoundsData = await loadGeoJSON('./data/sounds.geojson');

        setupControlListeners();
        switchDynasty('tang', 'Tang');

        processPoetData(allSoundsData.features);
        renderPoetList();
        drawRadarChart();

    } catch (error) { console.error("Initialization failed:", error); }
}

function setupTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');

            const targetId = e.target.getAttribute('data-target');
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'tab-map') {
                setTimeout(() => { map.invalidateSize(); }, 100);
            }
        });
    });
}


function injectClusterStyles(dynastyKey) {
    const existing = document.getElementById('dynamic-cluster-style');
    if (existing) existing.remove();

    const style = DYNASTY_STYLES[dynastyKey];
    const base = style.clusterBase;
    const light = style.clusterLight;

    const css = `
        .marker-cluster-small { background-color: ${light}CC; }
        .marker-cluster-small div { background-color: ${base}CC; color: #fff; font-family: "Noto Serif SC", serif; font-size: 13px; }
        .marker-cluster-medium { background-color: ${light}BB; }
        .marker-cluster-medium div { background-color: ${base}DD; color: #fff; font-family: "Noto Serif SC", serif; font-size: 13px; }
        .marker-cluster-large { background-color: ${light}99; }
        .marker-cluster-large div { background-color: ${base}EE; color: #fff; font-family: "Noto Serif SC", serif; font-size: 13px; }
        .leaflet-cluster-anim .leaflet-marker-icon,
        .leaflet-cluster-anim .leaflet-marker-shadow { transition: left 0.3s ease-out, top 0.3s ease-out; }
        .marker-cluster { border-radius: 50%; border: 2px solid ${base}88; box-shadow: 0 0 8px ${base}44; }
        .marker-cluster div { border-radius: 50%; width: 30px; height: 30px; margin: 5px; display: flex; align-items: center; justify-content: center; }
    `;

    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-cluster-style';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
}

// ==========================================
// TAB 1
// ==========================================
function setupControlListeners() {
    document.getElementById('toggle-kde').addEventListener('change', (e) => {
        if (e.target.checked) { if (currentKDELayer) map.addLayer(currentKDELayer); }
        else { if (currentKDELayer) map.removeLayer(currentKDELayer); }
    });

    document.querySelectorAll('.cat-filter').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const val = e.target.value;
            if (e.target.checked) activeCategories.add(val);
            else activeCategories.delete(val);
            renderSoundPoints();
        });
    });
}

function switchDynasty(dynastyKey, dynastyNameInDB) {
    currentDynastyKey = dynastyKey;
    Object.values(buttons).forEach(btn => btn.classList.remove('active'));
    buttons[dynastyKey].classList.add('active');

    // Update dynasty button styling class on body for contextual coloring
    document.body.setAttribute('data-dynasty', dynastyKey);

    if (currentBoundaryLayer) map.removeLayer(currentBoundaryLayer);
    if (currentKDELayer) map.removeLayer(currentKDELayer);
    if (currentSoundsLayer) map.removeLayer(currentSoundsLayer);

    const dStyle = DYNASTY_STYLES[dynastyKey];
    injectClusterStyles(dynastyKey);

    // Boundary with ink-bleed SVG filter applied via pane
    loadGeoJSON(`./data/${dynastyKey}_boundary.geojson`).then(data => {
        // Create a custom pane for this boundary so we can apply SVG filter
        const paneName = `boundary-pane-${dynastyKey}`;
        if (!map.getPane(paneName)) {
            map.createPane(paneName);
            map.getPane(paneName).style.zIndex = 300;
        }

        currentBoundaryLayer = L.geoJSON(data, {
            pane: paneName,
            style: {
                color: dStyle.boundary.color,
                weight: dStyle.boundary.weight,
                fillColor: dStyle.boundary.fillColor,
                fillOpacity: dStyle.boundary.fillOpacity,
                opacity: 0.85,
                interactive: false,
                // Ink bleed: achieved via className + CSS SVG filter
                className: `boundary-ink boundary-${dynastyKey}`
            }
        }).addTo(map);

        // Apply SVG filter to the SVG paths in this layer
        setTimeout(() => {
            const svg = map.getPane(paneName).querySelector('svg');
            if (svg) {
                svg.style.filter = dStyle.svgFilter.replace('url(', '').replace(')', '');
                // Use real SVG filter reference
                svg.setAttribute('filter', dStyle.svgFilter);
            }
            // Also try path elements
            document.querySelectorAll(`.boundary-${dynastyKey} path`).forEach(path => {
                path.style.filter = dStyle.svgFilter;
            });
        }, 200);

    }).catch(e => {});

    // KDE layer with dynasty-matched colors
    loadGeoJSON(`./data/${dynastyKey}_kde.geojson`).then(data => {
        const kStyle = dStyle.kde;
        currentKDELayer = L.geoJSON(data, {
            style: {
                color: kStyle.color,
                weight: 1,
                fillColor: kStyle.fillColor,
                fillOpacity: kStyle.fillOpacity,
                interactive: true
            },
            onEachFeature: function (feature, layer) {
                layer.on('mouseover', function () { this.setStyle({ fillOpacity: dStyle.kdeHoverOpacity }); });
                layer.on('mouseout', function () { this.setStyle({ fillOpacity: kStyle.fillOpacity }); });
                layer.on('click', function (e) {
                    L.DomEvent.stopPropagation(e);
                    if (typeof turf === 'undefined') return;
                    const visiblePoints = currentDynastyFeatures.filter(f => {
                        if (!f || !f.geometry || !f.geometry.type || f.geometry.type !== 'Point' || !f.geometry.coordinates || f.geometry.coordinates.length < 2) return false;
                        let cat = String(f.properties.sound_category || 'environment').toLowerCase().trim();
                        if (cat === 'instument') cat = 'instrument';
                        return activeCategories.has(cat);
                    });
                    if (visiblePoints.length === 0) return;
                    try {
                        const pointsCollection = turf.featureCollection(visiblePoints);
                        const pointsWithin = turf.pointsWithinPolygon(pointsCollection, feature);
                        updateInfoPanelWithKDEList(pointsWithin.features);
                    } catch (err) { console.error("Turf Error:", err); }
                });
            }
        });
        if (document.getElementById('toggle-kde').checked) {
            currentKDELayer.addTo(map);
            currentKDELayer.bringToBack();
        }
    }).catch(e => {});

    if (allSoundsData && allSoundsData.features) {
        currentDynastyFeatures = allSoundsData.features.filter(f => {
            const dyn = String(f.properties.dynasty || f.properties.Dynasty || "").toLowerCase().trim();
            if (dynastyKey === 'tang' && (dyn.includes('tang') || dyn.includes('唐'))) return true;
            if (dynastyKey === 'nsong' && (dyn.includes('nsong') || dyn.includes('n_song') || dyn.includes('north') || dyn.includes('北'))) return true;
            if (dynastyKey === 'ssong' && (dyn.includes('ssong') || dyn.includes('s_song') || dyn.includes('south') || dyn.includes('南'))) return true;
            return false;
        });
        renderSoundPoints();
    }
}

function renderSoundPoints() {
    if (currentSoundsLayer) map.removeLayer(currentSoundsLayer);
    if (markerClusterGroup) map.removeLayer(markerClusterGroup);

    const filteredFeatures = currentDynastyFeatures.filter(f => {
        let cat = String(f.properties.sound_category || 'environment').toLowerCase().trim();
        if (cat === 'instument') cat = 'instrument';
        return activeCategories.has(cat);
    });

    markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 35, spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true
    });

    currentSoundsLayer = L.geoJSON({ type: "FeatureCollection", features: filteredFeatures }, {
        pointToLayer: function (feature, latlng) {
            const props = feature.properties;
            let cat = String(props.sound_category || 'environment').toLowerCase().trim();
            if (cat === 'instument') cat = 'instrument';
            const posNeg = (props.is_negated === true || props.is_negated === 'TRUE') ? 'neg' : 'pos';
            // Ink drop opacity: uncertain sounds are more faded, like dry brush strokes
            const alpha = (props.certainty && (props.certainty === 'F' || props.certainty === 'FALSE')) ? 0.45 : 0.82;
            return L.marker(latlng, {
                icon: L.icon({
                    iconUrl: `./icons/${cat}_${posNeg}.svg`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
                }),
                opacity: alpha
            });
        },
        onEachFeature: function (feature, layer) { layer.on('click', () => { updateInfoPanelSingle(feature.properties); }); }
    });
    markerClusterGroup.addLayer(currentSoundsLayer);
    map.addLayer(markerClusterGroup);
}

function updateInfoPanelSingle(props) {
    const isNeg = (props.is_negated === 'TRUE' || props.is_negated === true) ? 'Yes' : 'No';
    const title = props.title || 'Unknown';
    const author = props.author || 'Unknown';
    const authorEn = props.author_en ? ` <span style="font-size:0.9rem;color:#a09080;font-weight:normal;font-style:italic;">(${props.author_en})</span>` : '';

    const phrase = props.original_phrase || 'No phrase';
    const phraseEn = props.original_phrase_en || '';
    const context = props.context_window ? props.context_window.replace(/\n/g, '<br>') : 'No context data';

    const sourceRaw = props.sound_source_raw || '';
    const sourceEn = props.sound_source_en || '';
    const sourceDisplay = sourceEn ? `${sourceEn} / ${sourceRaw}` : (sourceRaw || 'Unknown');
const categoryRaw = (props.sound_category || 'environment').toLowerCase().trim();
    
    let catKey = categoryRaw;
    if (catKey === 'instument') catKey = 'instrument';

    const catMap = {
        'animal': 'Animal',
        'nature': 'Nature',
        'human': 'Human',
        'instrument': 'Instrument',
        'environment': 'Environment'
    };
    
    const catDisplay = catMap[catKey] || categoryRaw;
    const catClass = `cat-badge cat-${catKey}`;

    infoPanel.innerHTML = `
        <div class="panel-deco-line"></div>
        <h2>${props.title || 'Unknown'}</h2>
        <h4>${props.author || 'Unknown'} ${props.author_en ? `<span style="font-size:0.9rem;opacity:0.7;">(${props.author_en})</span>` : ''}</h4>
        <div class="original-phrase">${props.original_phrase || ''}</div>
        ${props.original_phrase_en ? `<div class="original-phrase-en">"${props.original_phrase_en}"</div>` : ''}
        <div class="context-window"><strong>Context：</strong><br>${props.context_window ? props.context_window.replace(/\\n/g, '<br>') : ''}</div>
        <div class="meta-info">
            <p><span>Sound Source:</span> ${props.sound_source_en || ''} / ${props.sound_source_raw || ''}</p>
            <p><span>Category:</span> <span class="${catClass}">${catDisplay}</span></p>
            <p><span>Absent Sound:</span> ${(props.is_negated === 'TRUE' || props.is_negated === true) ? 'Yes' : 'No'}</p>
        </div>`;
}
function updateInfoPanelWithKDEList(features) {
    if (features.length === 0) { infoPanel.innerHTML = `<h2>Regional Analysis</h2><p>No data</p>`; return; }
    let listHtml = `<div class="panel-deco-line"></div><h2>Regional Analysis</h2><h4>${features.length} records in total.</h4><div style="margin-top:20px;">`;
    features.forEach(f => {
        const p = f.properties;
        const author = p.author || 'Unknown';
        const authorEn = p.author_en ? ` (${p.author_en})` : '';

        listHtml += `<div class="kde-list-item">
                        <h5>${p.title || 'Unknown'} · ${author}${authorEn}</h5>
                        <p>Category: ${p.sound_category || ''}</p>
                        <div class="phrase">${p.original_phrase || ''}</div>
                        ${p.original_phrase_en ? `<div class="phrase-en">"${p.original_phrase_en}"</div>` : ''}
                     </div>`;
    });
    infoPanel.innerHTML = listHtml + `</div>`;
}

buttons['tang'].addEventListener('click', () => switchDynasty('tang', 'Tang'));
buttons['nsong'].addEventListener('click', () => switchDynasty('nsong', 'N. Song'));
buttons['ssong'].addEventListener('click', () => switchDynasty('ssong', 'S. Song'));


// ==========================================
// TAB 2
// ==========================================

function processPoetData(features) {
    features.forEach(f => {
        const p = f.properties;
        const author = p.author ? p.author.trim() : "Unknown";
        if (author === "Unknown" || author === "无名氏") return;

        if (!poetData[author]) {
            poetData[author] = {
                name: author,
                nameEn: p.author_en || '',
                dynasty: classifyDynasty(p.dynasty),
                categories: { animal: 0, nature: 0, human: 0, instrument: 0, environment: 0 },
                features: []
            };
        }

        let cat = String(p.sound_category || '').toLowerCase().trim();
        if (cat === 'instument') cat = 'instrument';

        if (poetData[author].categories.hasOwnProperty(cat)) {
            poetData[author].categories[cat]++;
            poetData[author].features.push(f);
        }
    });

    Object.values(poetData).forEach(poet => {
        poet.total = radarCategories.reduce((sum, c) => sum + poet.categories[c], 0);
    });
}

function classifyDynasty(dynRaw) {
    const dyn = String(dynRaw || "").toLowerCase();
    if (dyn.includes('tang') || dyn.includes('唐')) return '唐 Tang';
    if (dyn.includes('nsong') || dyn.includes('n_song') || dyn.includes('north') || dyn.includes('北')) return '北宋 N. Song';
    if (dyn.includes('ssong') || dyn.includes('s_song') || dyn.includes('south') || dyn.includes('南')) return '南宋 S. Song';
    return 'Other';
}

function renderPoetList() {
    const container = document.getElementById('poet-list-container');
    container.innerHTML = '';

    const groups = { '唐 Tang': [], '北宋 N. Song': [], '南宋 S. Song': [], 'Other': [] };
    Object.values(poetData).forEach(poet => { if (groups[poet.dynasty]) groups[poet.dynasty].push(poet); });

    Object.keys(groups).forEach(dynasty => {
        const poets = groups[dynasty];
        if (poets.length === 0) return;
        poets.sort((a, b) => b.total - a.total);

        const groupDiv = document.createElement('div');
        groupDiv.className = 'dynasty-group';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'dynasty-title expanded';
        titleDiv.innerHTML = `${dynasty} <span class="toggle-icon">▼</span>`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'dynasty-content';

        titleDiv.onclick = () => {
            titleDiv.classList.toggle('expanded');
            contentDiv.style.display = titleDiv.classList.contains('expanded') ? 'block' : 'none';
            titleDiv.querySelector('.toggle-icon').innerText = titleDiv.classList.contains('expanded') ? '▼' : '▶';
        };
        groupDiv.appendChild(titleDiv);

        poets.forEach(poet => {
            const wrapper = document.createElement('div');
            wrapper.className = 'poet-wrapper';

            const item = document.createElement('div');
            item.className = 'poet-item';
            item.dataset.name = poet.name;

            const nameSection = document.createElement('div');
            nameSection.className = 'poet-info-main';

            const enNameHtml = poet.nameEn ? `<span class="poet-en">${poet.nameEn}</span>` : '';
            nameSection.innerHTML = `<span>${poet.name}${enNameHtml}</span><span class="poet-count">${poet.total}</span>`;

            nameSection.onclick = () => {
                const idx = selectedPoets.indexOf(poet.name);
                if (idx > -1) {
                    selectedPoets.splice(idx, 1);
                    item.classList.remove('selected');
                } else {
                    if (selectedPoets.length >= 2) {
                        const removedName = selectedPoets.shift();
                        document.querySelectorAll('.poet-item').forEach(el => {
                            if (el.dataset.name === removedName) el.classList.remove('selected');
                        });
                    }
                    selectedPoets.push(poet.name);
                    item.classList.add('selected');
                }
                drawRadarChart();
            };

            const expandBtn = document.createElement('div');
            expandBtn.className = 'poet-expand-btn';
            expandBtn.innerHTML = '▼';

            const subList = document.createElement('div');
            subList.className = 'poet-sublist';
            subList.style.display = 'none';

            poet.features.forEach(f => {
                const phraseText = f.properties.original_phrase || 'No phrase';
                const phraseItem = document.createElement('div');
                phraseItem.className = 'phrase-item';
                phraseItem.innerText = phraseText;
                phraseItem.title = phraseText;
                phraseItem.onclick = () => goToMap(f);
                subList.appendChild(phraseItem);
            });

            expandBtn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = subList.style.display === 'none';
                subList.style.display = isHidden ? 'block' : 'none';
                expandBtn.innerHTML = isHidden ? '▲' : '▼';
            };

            item.appendChild(nameSection);
            item.appendChild(expandBtn);
            wrapper.appendChild(item);
            wrapper.appendChild(subList);
            contentDiv.appendChild(wrapper);
        });

        groupDiv.appendChild(contentDiv);
        container.appendChild(groupDiv);
    });
}

function goToMap(feature) {
    document.querySelector('.nav-tab[data-target="tab-map"]').click();

    const dynRaw = String(feature.properties.dynasty || feature.properties.Dynasty || "").toLowerCase();
    let targetDynKey = 'tang';
    if (dynRaw.includes('nsong') || dynRaw.includes('n_song') || dynRaw.includes('north') || dynRaw.includes('北')) {
        targetDynKey = 'nsong';
    } else if (dynRaw.includes('ssong') || dynRaw.includes('s_song') || dynRaw.includes('south') || dynRaw.includes('南')) {
        targetDynKey = 'ssong';
    } else if (dynRaw.includes('tang') || dynRaw.includes('唐')) {
        targetDynKey = 'tang';
    }

    if (!buttons[targetDynKey].classList.contains('active')) {
        buttons[targetDynKey].click();
    }

    setTimeout(() => {
        const coords = feature.geometry.coordinates;
        if (coords && coords.length >= 2) {
            map.flyTo([coords[1], coords[0]], 12, { duration: 1 });
        }
        updateInfoPanelSingle(feature.properties);
    }, 200);
}

function drawRadarChart() {
    const container = d3.select("#radar-chart");
    container.selectAll("*").remove();
    document.getElementById('radar-legend').innerHTML = '';

    const validSelectedPoets = selectedPoets.filter(name => poetData[name] && poetData[name].total > 0);

    if (validSelectedPoets.length === 0) {
        container.append("div").style("color", "#a09080").style("margin-top", "200px")
            .style("font-family", "'Noto Serif SC', serif").text("Please select a poet from the left.");
        document.getElementById('wordcloud-container').innerHTML = '';
        return;
    }

    validSelectedPoets.forEach((name, i) => {
        const p = poetData[name];
        const enName = p.nameEn ? ` ${p.nameEn}` : '';
        const legendItem = `<div class="legend-item">
            <div class="legend-color" style="background:${radarColors[i]}"></div>
            ${p.name}${enName} (${p.total} sounds)
        </div>`;
        document.getElementById('radar-legend').innerHTML += legendItem;
    });

    const width = 500, height = 500, margin = 80;
    const radius = Math.min(width, height) / 2 - margin;
    const svg = container.append("svg").attr("width", width).attr("height", height)
        .append("g").attr("transform", `translate(${width / 2},${height / 2})`);
    const maxValue = 0.7; 
    const rScale = d3.scaleLinear().range([0, radius]).domain([0, maxValue]);
    const angleSlice = Math.PI * 2 / radarCategories.length;

    const ticks = [0.2, 0.4, 0.6];
    svg.selectAll(".grid-circle").data(ticks).enter().append("circle")
        .attr("r", d => rScale(d))
        .style("fill", "none").style("stroke", "#d4c9b8").style("stroke-dasharray", "4,4");

    const axis = svg.selectAll(".axis").data(radarCategories).enter().append("g");
    axis.append("line")
        .attr("x2", (d, i) => rScale(maxValue) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => rScale(maxValue) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("stroke", "#c8bca8").style("stroke-width", "1px");

    axis.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", (d, i) => rScale(maxValue * 1.2) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => rScale(maxValue * 1.2) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("font-family", "'Noto Serif SC', serif").style("font-size", "13px")
        .text((d, i) => radarCategoryLabels[i]);

    const radarLine = d3.lineRadial().angle((d, i) => i * angleSlice).radius(d => rScale(d.value)).curve(d3.curveLinearClosed);

    validSelectedPoets.forEach((name, idx) => {
        const pData = poetData[name];
        const plotData = radarCategories.map(cat => ({
            axis: cat,
            value: pData.categories[cat] / pData.total
        }));

        const color = radarColors[idx];

        svg.append("path").datum(plotData)
            .attr("d", radarLine)
            .style("fill", color).style("fill-opacity", 0.25)
            .style("stroke", color).style("stroke-width", 2);

        svg.selectAll(".point-" + idx).data(plotData).enter().append("circle")
            .attr("r", 4)
            .attr("cx", (d, i) => rScale(d.value) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("cy", (d, i) => rScale(d.value) * Math.sin(angleSlice * i - Math.PI / 2))
            .style("fill", color).style("stroke", "#fff");
    });

    drawWordCloud();
}

function drawWordCloud() {
    const wcContainer = document.getElementById('wordcloud-container');
    wcContainer.innerHTML = '';

    if (selectedPoets.length === 0) return;

    let allTags = [];

    selectedPoets.forEach((name, idx) => {
        const pData = poetData[name];
        const color = radarColors[idx];

        let phrases = pData.features
            .map(f => f.properties.original_phrase)
            .filter(p => p && p.trim() !== '' && p !== 'No phrase' && p !== '无原句记录');

        phrases = [...new Set(phrases)];

        if (phrases.length > 12) {
            phrases = phrases.sort(() => 0.5 - Math.random()).slice(0, 12);
        }

        phrases.forEach(phrase => {
            const size = (Math.random() * 0.7 + 0.9).toFixed(2);
            const opacity = (Math.random() * 0.4 + 0.6).toFixed(2);
            allTags.push({ text: phrase, color: color, size: size, opacity: opacity });
        });
    });

    allTags.sort(() => 0.5 - Math.random());

    allTags.forEach(tag => {
        const span = document.createElement('span');
        span.className = 'cloud-tag';
        span.innerText = tag.text;
        span.style.color = tag.color;
        span.style.fontSize = `${tag.size}rem`;
        span.style.opacity = tag.opacity;
        span.style.fontWeight = Math.random() > 0.5 ? 'bold' : 'normal';
        wcContainer.appendChild(span);
    });
}

init();
