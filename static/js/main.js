/* main.js - Unificirana JS logika za cijelu aplikaciju */

document.addEventListener("DOMContentLoaded", () => {
    // ------- Globalni Chart.js Setup -------

    // Plugin za dodavanje pozadinske boje na grafikon
    const chartBackgroundPlugin = {
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart) => {
            const ctx = chart.ctx;
            ctx.save();
            ctx.globalCompositeOperation = 'destination-over';
            // Direktno dohvaćanje CSS varijable za pozadinu
            const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--chart-bg-color').trim();
            ctx.fillStyle = bgColor || '#ffffff'; // Fallback na bijelu
            ctx.fillRect(0, 0, chart.width, chart.height);
            ctx.restore();
        }
    };
    Chart.register(chartBackgroundPlugin); // Registracija plugina globalno

    let chartInstances = {}; // Objekt za praćenje svih instanci grafikona

    // Funkcija za dohvaćanje boja iz CSS varijabli
    const getCssVar = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim();

    // Defaultne opcije za sve grafikone
    const getDefaultChartOptions = () => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { labels: { color: getCssVar('--text-color') } }
        },
        scales: {
            y: {
                ticks: { color: getCssVar('--text-color'), stepSize: 10 },
                grid: { color: getCssVar('--card-border-color') },
                min: 0, // Default min vrijednost
                max: 100 // Default max vrijednost
            },
            x: {
                ticks: { color: getCssVar('--text-color') },
                grid: { color: getCssVar('--card-border-color') }
            }
        }
    });

    // Kreira ili ažurira grafikon s novim podacima i opcijama
    function createOrUpdateChart(canvasId, type, data, options) {
        if (chartInstances[canvasId]) {
            chartInstances[canvasId].data = data;
            chartInstances[canvasId].options = options;
            chartInstances[canvasId].update();
        } else {
            const ctx = document.getElementById(canvasId).getContext('2d');
            chartInstances[canvasId] = new Chart(ctx, { type, data, options });
        }
    }

    // Ponovno iscrtava sve grafikone (korisno kod promjene teme)
    function redrawAllCharts() {
        for (const canvasId in chartInstances) {
            const chart = chartInstances[canvasId];
            const newOptions = getDefaultChartOptions(); // Uvijek kreni od svježih defaultnih opcija

            // Ponovno primijeni specifične limite ovisno o ID-u grafikona
            if (canvasId === 'tempChart') {
                newOptions.scales.y.max = 50;
            } else if (canvasId === 'luxChart') {
                newOptions.scales.y.max = undefined; // Bez gornjeg limita
            }
            // 'humChart' i 'soilChart' automatski koriste default (max: 100)

            chart.options = newOptions; // Primijeni ispravno konfigurirane opcije
            chart.update();
        }
    }

    // ------- Theme Switcher Logic -------
    function initThemeSwitcher() {
        const themeSelect = document.getElementById('theme-select');
        const currentTheme = localStorage.getItem('theme') || 'light';

        function applyTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
            themeSelect.value = theme;
            // Daj CSS-u trenutak da primijeni varijable prije iscrtavanja
            setTimeout(redrawAllCharts, 50);
        }

        themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
        applyTheme(currentTheme);
    }

    // ------- Background Image Slideshow Logic -------
    function initBackgroundImageSelector() {
        const bgImageFilesInput = document.getElementById('bgImageFiles');
        const btnPrevBg = document.getElementById('btnPrevBg');
        const btnNextBg = document.getElementById('btnNextBg');
        const btnClearBg = document.getElementById('btnClearBg');
        const btnInfoBg = document.getElementById('btnInfoBg');
        const infoTooltip = new bootstrap.Tooltip(btnInfoBg);

        let currentImages = [];
        let currentFileNames = [];
        let currentIndex = -1;

        function updateTooltip() {
            const title = currentFileNames.length > 0 ? currentFileNames.join(', ') : 'Nema odabranih slika';
            btnInfoBg.setAttribute('data-bs-original-title', title);
            infoTooltip.hide(); // Sakrij pa prikaži da se tooltip ažurira
        }

        function applyAndSaveBackground(index) {
            if (index < 0 || index >= currentImages.length) return;
            const imageDataUrl = currentImages[index];
            document.body.style.backgroundImage = `url('${imageDataUrl}')`;
            currentIndex = index;
            try {
                localStorage.setItem('lastBackgroundImage', imageDataUrl);
                localStorage.setItem('lastBgIndex', currentIndex);
            } catch (e) {
                console.error("Greška pri spremanju pozadine:", e);
            }
        }

        function clearBackground() {
            document.body.style.backgroundImage = 'none';
            localStorage.removeItem('lastBackgroundImage');
            localStorage.removeItem('lastBgIndex');
            bgImageFilesInput.value = '';
            currentImages = [];
            currentFileNames = [];
            currentIndex = -1;
            updateTooltip();
        }

        bgImageFilesInput.addEventListener('change', (event) => {
            const files = event.target.files;
            if (!files.length) return;

            currentImages = [];
            currentFileNames = [];
            let filesLoaded = 0;

            Array.from(files).forEach(file => {
                currentFileNames.push(file.name);
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentImages.push(e.target.result);
                    filesLoaded++;
                    if (filesLoaded === files.length) {
                        applyAndSaveBackground(0);
                        updateTooltip();
                    }
                };
                reader.readAsDataURL(file);
            });
        });

        btnPrevBg.addEventListener('click', () => {
            if (currentImages.length > 0) {
                const newIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
                applyAndSaveBackground(newIndex);
            }
        });

        btnNextBg.addEventListener('click', () => {
            if (currentImages.length > 0) {
                const newIndex = (currentIndex + 1) % currentImages.length;
                applyAndSaveBackground(newIndex);
            }
        });

        btnClearBg.addEventListener('click', clearBackground);

        // Učitavanje zadnje prikazane pozadine prilikom otvaranja stranice
        const savedBg = localStorage.getItem('lastBackgroundImage');
        if (savedBg) {
            document.body.style.backgroundImage = `url('${savedBg}')`;
            // Napomena: Ne možemo ponovno učitati listu slika, samo zadnju prikazanu
        }
    }

    // ------- Glavni Router -------
    function init() {
        initThemeSwitcher();
        initBackgroundImageSelector();
        if (document.getElementById('tempChart')) initIndexPage();
    }

    // ------- Pomoćne (Helper) Funkcije -------
    function formatTime(ts) {
        if (!ts) return "";
        const [date, timeDetails] = ts.split('_');
        if (!date || !timeDetails) return ts;
        const [y, m, d] = date.split('-');
        const [hh, mm] = timeDetails.split('-');
        return `${d}.${m}.${y.slice(-2)} ${hh}:${mm}`;
    }

    async function fetchJSON(url, opts) {
        const r = await fetch(url, opts);
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return await r.json();
    }

    // ------- Logika za Brisanje Redova (zajednička) -------
    async function setupDeleteRowsHandler(callbackOnSuccess) {
        const btn = document.getElementById('btnDeleteRows');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const inputEl = document.getElementById('deleteIdsInput');
            const statusEl = document.getElementById('deleteStatus');
            const input = inputEl.value.trim();
            if (!input) {
                statusEl.innerText = "Unesite ID-eve za brisanje ili 'all'.";
                return;
            }
            const payload = { ids: input.toLowerCase() === "all" ? "all" : input };
            const confirmDelete = confirm(`Jeste li sigurni da želite obrisati ${input === "all" ? "SVE redove" : "ove redove: " + input}?`);
            if (!confirmDelete) return;
            try {
                const data = await fetchJSON('/api/logs/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (data.ok) {
                    statusEl.innerText = `Obrisano: ${data.deleted === "all" ? "svi redovi" : data.deleted + " redova."}`;
                    if (callbackOnSuccess) await callbackOnSuccess();
                } else {
                    statusEl.innerText = `Greška: ${data.msg || data.error}`;
                }
            } catch (e) {
                statusEl.innerText = "Greška pri brisanju: " + e.message;
            }
        });
    }

    // ====================================================================
    // INICIJALIZACIJA ZA INDEX.HTML
    // ====================================================================
    function initIndexPage() {
        async function updateIndexPageData() {
            const rows = await fetchJSON('/api/logs?limit=100');
            const labels = rows.map(r => formatTime(r.timestamp));

            // Ažuriranje tablice
            const tbody = document.getElementById('logsBody');
            tbody.innerHTML = "";
            rows.slice().reverse().forEach(r => {
                const tr = document.createElement('tr');
                if (r.stable === 0) tr.classList.add('unstable');
                tr.innerHTML = `<td>${r.id}</td><td>${formatTime(r.timestamp)}</td><td>${r.air_temp ?? ''}</td><td>${r.air_humidity ?? ''}</td><td>${r.soil_temp ?? ''}</td><td>${r.soil_percent ?? ''}</td><td>${r.lux ?? ''}</td>`;
                tbody.appendChild(tr);
            });

            // Ažuriranje grafikona
            const tempOptions = getDefaultChartOptions();
            tempOptions.scales.y.max = 50;
            createOrUpdateChart('tempChart', 'line', {
                labels,
                datasets: [
                    { label: 'Air Temp °C', data: rows.map(r => r.air_temp), borderColor: 'rgba(0,123,255,1)', tension: 0.2, fill: false },
                    { label: 'Soil Temp °C', data: rows.map(r => r.soil_temp), borderColor: 'rgba(40,167,69,1)', tension: 0.2, fill: false }
                ]
            }, tempOptions);

            createOrUpdateChart('humChart', 'line', {
                labels,
                datasets: [{ label: 'Air Humidity %', data: rows.map(r => r.air_humidity), borderColor: 'rgba(255,165,0,1)', tension: 0.2, fill: false }]
            }, getDefaultChartOptions());

            createOrUpdateChart('soilChart', 'line', {
                labels,
                datasets: [{ label: 'Soil %', data: rows.map(r => r.soil_percent), borderColor: 'rgba(139,69,19,1)', tension: 0.2, fill: false }]
            }, getDefaultChartOptions());

            const luxOptions = getDefaultChartOptions();
            luxOptions.scales.y.max = undefined; // Ukloni max za Lux
            createOrUpdateChart('luxChart', 'line', {
                labels,
                datasets: [{ label: 'Lux (lx)', data: rows.map(r => r.lux), borderColor: 'rgba(128,0,128,1)', tension: 0.2, fill: false }]
            }, luxOptions);
        }

        async function readSensor(type) {
            const r = await fetchJSON(`/api/sensor/read?type=${type}`);
            let output = `Senzor: ${r.type}\n`;
            if (r.temperature) output += `Temperatura: ${r.temperature.toFixed(2)} °C\n`;
            if (r.humidity) output += `Vlažnost: ${r.humidity.toFixed(2)} %\n`;
            if (r.percent) output += `Vlažnost tla: ${r.percent.toFixed(2)} %\n`;
            if (r.lux) output += `Osvjetljenje: ${r.lux.toFixed(2)} lx\n`;
            if (r.raw) output += `Sirova vrijednost: ${r.raw}\n`;
            if (r.voltage) output += `Napon: ${r.voltage.toFixed(4)} V\n`;
            if (r.error) output += `Greška: ${r.error}\n`;
            document.getElementById('sensorOutput').innerText = output;
        }

        async function toggleRelay(relay) {
            const stateEl = document.getElementById(`relay${relay}State`);
            const target = stateEl.innerText !== 'ON';
            await fetchJSON('/api/relay/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relay, state: target }) });
            stateEl.innerText = target ? 'ON' : 'OFF';
            loadRelayLogTable();
        }

        async function loadRelayLogTable() {
            const data = await fetchJSON('/relay_log_data');
            const tbody = document.querySelector('#relayLogTable tbody');
            tbody.innerHTML = '';
            (data || []).forEach(entry => {
                const tr = document.createElement('tr');

                const tdTime = document.createElement('td');
                tdTime.textContent = entry.t;
                tr.appendChild(tdTime);

                const tdRelay = document.createElement('td');
                tdRelay.textContent = entry.relay;
                if (entry.relay === 'RELAY1') {
                    tdRelay.className = 'relay-1';
                } else if (entry.relay === 'RELAY2') {
                    tdRelay.className = 'relay-2';
                }
                tr.appendChild(tdRelay);

                const tdAction = document.createElement('td');
                const spanAction = document.createElement('span');
                spanAction.className = `badge ${entry.v ? 'bg-success' : 'bg-secondary'}`;
                spanAction.textContent = entry.action;
                tdAction.appendChild(spanAction);
                tr.appendChild(tdAction);

                const tdSource = document.createElement('td');
                tdSource.textContent = entry.source || 'button';
                tr.appendChild(tdSource);

                tbody.appendChild(tr);
            });
        }

        async function updateLoggerStatus() {
            const el = document.getElementById('loggerStatus');
            try {
                const data = await fetchJSON('/api/status');
                const statusText = data.status;

                if (statusText && statusText.includes(" u ")) {
                    // Format: "20.10.2025. u 00:20:04 (PID: 29328)"
                    const timeAndPid = statusText;
                    const timePart = timeAndPid.substring(0, timeAndPid.indexOf('(')).trim();
                    let pidPart = timeAndPid.substring(timeAndPid.indexOf('('));
                    pidPart = pidPart.replace("PID: ", ""); // Ukloni "PID: "

                    el.innerHTML = `Status: <span class="active-status">Pokrenut </span> ${timePart} ${pidPart}`;
                } else {
                    el.innerHTML = `Status: <span class="inactive-status">Zaustavljen</span>`;
                }
            } catch (e) {
                el.innerHTML = `Status: <span class="inactive-status">Zaustavljen</span> (greška)`;
            }
        }

        // Event Listeners
        document.getElementById('btnStartFirst').addEventListener('click', async () => {
            await fetchJSON('/api/run/start_first', { method: 'POST' });
            updateLoggerStatus(); // Ponovno dohvati i prikaži status
        });
        document.getElementById('btnStop').addEventListener('click', async () => {
            await fetchJSON('/api/run/stop', { method: 'POST' });
            updateLoggerStatus(); // Ponovno dohvati i prikaži status
        });
        ['ads', 'dht', 'ds18b20', 'bh1750'].forEach(id => document.getElementById(`btn-${id}`).addEventListener('click', () => readSensor(id)));
        [1, 2].forEach(num => document.getElementById(`btn-relay${num}`).addEventListener('click', () => toggleRelay(num)));
        setupDeleteRowsHandler(updateIndexPageData);

        // Inicijalno učitavanje
        updateLoggerStatus();
        updateIndexPageData();
        loadRelayLogTable();
    }

    // Pokreni aplikaciju
    init();
});
