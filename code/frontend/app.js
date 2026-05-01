// App Logic and Data Visualization

document.addEventListener('DOMContentLoaded', () => {
    // 1. Display Current Time
    const timeEl = document.getElementById('last-updated-time');
    const now = new Date();
    timeEl.innerHTML = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    // 2. Tab Navigation
    window.switchTab = function(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to target
        document.querySelector(`.tab-btn[data-target="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        if(tabId === 'tab-trends') {
            destroyCharts();
            setRange(currentRange);
        } else if (tabId === 'tab-live') {
            destroyCharts();
        } else if (tabId === 'tab-history') {
            loadHistoryData();
        }
    }

    // 3. Time Filter Toggle (Trends Tab)
    let currentRange = '24h';
    window.setRange = function(range) {
        currentRange = range;
        
        // Update active UI classes iteratively
        document.querySelectorAll('.time-filters .filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(range)) {
                btn.classList.add('active');
            }
        });

        // Backend API Requirement Hook
        fetch(`/api/trends?range=${range}`)
            .then(res => res.json())
            .then(data => {
                destroyCharts(); // Smooth transition wipe
                renderMainCharts(data, range);
            })
            .catch(err => console.error("Could not fetch trends API data:", err));
    };

    // --- Chart.js Configuration ---
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.scale.grid.color = '#e2e8f0';
    
    // Theme colors matching CSS
    const colors = {
        primary: '#2563eb',
        primaryLight: 'rgba(37, 99, 235, 0.2)',
        danger: '#ef4444',
        dangerLight: 'rgba(239, 68, 68, 0.2)',
        warning: '#f97316',
        warningLine: '#f59e0b',
        safe: '#10b981'
    };

    let chartInstances = {};

    function destroyCharts() {
        Object.values(chartInstances).forEach(chart => chart.destroy());
        chartInstances = {};
    }

    // Mock Data Generation
    const labels1h = Array.from({length: 12}, (_, i) => `-${60 - i*5}m`);
    const labels6h = Array.from({length: 12}, (_, i) => `-${(6 - i/2).toFixed(1)}h`);
    const labels24h = Array.from({length: 24}, (_, i) => `-${24 - i}h`);
    const labels7d = Array.from({length: 14}, (_, i) => `-${(7 - i/2).toFixed(1)}d`);

    // Live Monitoring Mini Charts
    // Live Monitoring Data Update Loop
    function startLiveMonitoring() {
        function updateDashboard() {
            // Simulate reading from state/API
            const waterLevel = Math.floor(Math.random() * 50) + 40; // 40% to 90%
            const rainfall = (Math.random() * 8).toFixed(1);
            const riseRate = (Math.random() * 1.5).toFixed(2);
            let predictedLevel = waterLevel + parseFloat(riseRate) * 2;
            if (predictedLevel > 100) predictedLevel = 100;

            // Risk calculation based on Water Level rule: <60 Normal, 60-80 Watch, >80 Critical
            let risk = { level: 'SAFE', icon: 'check_circle', text: 'Monitor conditions' };
            
            if (waterLevel > 80) {
                // > 80% -> EMERGENCY / Critical (Red)
                risk = { level: 'EMERGENCY', icon: 'warning', text: 'Immediate action required' };
            } else if (waterLevel > 70) {
                // We'll add WARNING for the upper band of the watch range
                risk = { level: 'WARNING', icon: 'warning_amber', text: 'Prepare mitigation' };
            } else if (waterLevel >= 60) {
                // 60-80% -> WATCH (Yellow)
                risk = { level: 'WATCH', icon: 'visibility', text: 'Stay alert' };
            }

            // Time to Critical Level (80%)
            let timeToCritical = '--';
            if (waterLevel >= 80) {
                timeToCritical = 'Critical Threshold Reached';
            } else if (riseRate > 0) {
                const hours = ((80 - waterLevel) / riseRate).toFixed(1);
                timeToCritical = `${hours} hours`;
            }

            // Update Risk Elements
            const riskCard = document.getElementById('card-risk');
            const iconEl = document.getElementById('risk-icon');
            const levelText = document.getElementById('risk-level-text');
            const textEl = document.getElementById('suggested-action-text');

            if (riskCard && iconEl && levelText && textEl) {
                let badgeColor = '';
                if(risk.level === 'SAFE') badgeColor = '#10b981'; // Green
                else if(risk.level === 'WATCH') badgeColor = '#eab308'; // Yellow
                else if(risk.level === 'WARNING') badgeColor = '#f97316'; // Orange
                else badgeColor = '#ef4444'; // Red

                // Assign raw colors seamlessly avoiding missing class issues
                riskCard.style.borderTop = `4px solid ${badgeColor}`;
                iconEl.textContent = risk.icon;
                iconEl.style.color = badgeColor;
                levelText.textContent = risk.level;
                levelText.style.color = badgeColor;
                textEl.textContent = risk.text;
            }

            // Update KPIS
            const wlText = document.getElementById('water-level-text');
            const wlBar = document.getElementById('water-level-bar');
            if (wlText && wlBar) {
                // <60% Green, 60-80% Yellow, >80% Red
                let waterColor = waterLevel > 80 ? '#ef4444' : (waterLevel >= 60 ? '#eab308' : '#10b981');
                wlText.innerHTML = `${waterLevel}%`;
                wlText.style.color = waterColor;
                wlBar.style.width = `${waterLevel}%`;
                wlBar.style.backgroundColor = waterColor;
            }

            if (document.getElementById('rainfall-text')) {
                document.getElementById('rainfall-text').innerHTML = `${rainfall} <span class="unit">mm/hr</span>`;
            }

            if (document.getElementById('rise-rate-text')) {
                const riseColor = riseRate > 0.5 ? '#ef4444' : ''; // Red highlight if rising rapidly 
                const el = document.getElementById('rise-rate-text');
                el.innerHTML = `${riseRate} <span class="unit">%/hr</span>`;
                if(riseColor) { el.style.color = riseColor; } else { el.style.color = ''; }
            }

            // Predictive Updates
            if (document.getElementById('predicted-level-text')) {
                document.getElementById('predicted-level-text').textContent = `${predictedLevel.toFixed(1)}%`;
                
                const timeCritEl = document.getElementById('time-critical-text');
                if (timeCritEl) {
                    timeCritEl.textContent = timeToCritical;
                    if (waterLevel >= 80 || (riseRate > 0.5 && ((80 - waterLevel) / riseRate) < 5)) {
                        timeCritEl.style.color = '#ef4444'; // Red highlighting threshold
                    } else {
                        timeCritEl.style.color = '';
                    }
                }
            }
        }
        
        updateDashboard();
        setInterval(updateDashboard, 5000);
    }

    // Trends & Prediction Main Charts
    function renderMainCharts(data, range) {
        // Dynamic binding from API explicitly
        const histWater = data.water_level || [];
        const histRain = data.rainfall || [];
        const histRise = data.rise_rate || [];

        // Match requested label spans
        let activeLabels = labels24h;
        if(range === '1h') activeLabels = labels1h;
        else if (range === '6h') activeLabels = labels6h;
        else if (range === '7d') activeLabels = labels7d;

        // 1. Rainfall Trend Chart
        const ctxRain = document.getElementById('trendRainfallChart');
        if (ctxRain) {
            chartInstances.trendRain = new Chart(ctxRain, {
                type: 'line',
                data: {
                    labels: activeLabels,
                    datasets: [{
                        label: 'Rainfall (mm/hr)',
                        data: histRain,
                        borderColor: '#0ea5e9', // Sky blue
                        backgroundColor: 'rgba(14, 165, 233, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 2
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { title: { display: true, text: 'Rainfall (mm/hr)' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }

        // 2. Water Level Trend Graph
        const ctxWater = document.getElementById('trendWaterLevelChart');
        if (ctxWater) {
            chartInstances.trendWater = new Chart(ctxWater, {
                type: 'line',
                data: {
                    labels: activeLabels,
                    datasets: [{
                        label: 'Water Level (%)',
                        data: histWater,
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 2
                    },
                    {
                        label: 'Critical Threshold (80%)',
                        data: Array(activeLabels.length).fill(80),
                        borderColor: colors.danger,
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { min: 50, max: 100, title: { display: true, text: 'Level (%)' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }

        // 3. Rise Rate Trend
        const ctxRise = document.getElementById('trendRiseRateChart');
        if (ctxRise) {
            // Emphasize spike calculation dynamically
            const pointColors = histRise.map(r => r > 0.25 ? colors.danger : '#64748b');
            const pointRadii = histRise.map(r => r > 0.25 ? 5 : 2);
            chartInstances.trendRise = new Chart(ctxRise, {
                type: 'line',
                data: {
                    labels: activeLabels,
                    datasets: [{
                        label: 'Rise Rate (%/hr)',
                        data: histRise,
                        borderColor: '#eab308',
                        backgroundColor: 'rgba(234, 179, 8, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.2,
                        pointBackgroundColor: pointColors, 
                        pointRadius: pointRadii
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { title: { display: true, text: 'Rate (%/hr)' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }

        // 4. Prediction Curve Graph
        const ctxPred = document.getElementById('trendPredictionChart');
        if (ctxPred) {
            const predDataResponse = data.prediction || [];
            // Extend labels explicitly for prediction elements
            const extendedLabels = [...activeLabels, '+1 Unit', '+2 Units', '+3 Units'];
            
            // Build explicit past recording gap structure
            const predDataSeries = Array(activeLabels.length).fill(null);
            predDataSeries[activeLabels.length - 1] = histWater[histWater.length - 1]; // Connect from current
            predDataSeries.push(...predDataResponse);

            chartInstances.trendPred = new Chart(ctxPred, {
                type: 'line',
                data: {
                    labels: extendedLabels,
                    datasets: [
                        {
                            label: 'Recorded Level (%)',
                            data: [...histWater, null, null, null],
                            borderColor: colors.primary,
                            borderWidth: 3,
                            fill: false,
                            tension: 0.3
                        },
                        {
                            label: 'Predicted Next Stage (%)',
                            data: predDataSeries,
                            borderColor: colors.danger,
                            borderWidth: 3,
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3,
                            pointBackgroundColor: colors.danger
                        }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { min: 50, max: 100, title: { display: true, text: 'Level (%)' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }
    }

    // History Tab Logic
    function loadHistoryData() {
        fetch('/api/history')
            .then(res => res.json())
            .then(data => {
                // Set Section 1: Summary Cards
                if(document.getElementById('history-total-incidents')) {
                    document.getElementById('history-total-incidents').textContent = data.summary.total_incidents;
                    document.getElementById('history-total-emergencies').textContent = data.summary.total_emergencies;
                    document.getElementById('history-highest-level').textContent = data.summary.highest_water_level + '%';
                    document.getElementById('history-longest-incident').textContent = data.summary.longest_incident;
                }

                // Set Section 2: Table
                const tbody = document.getElementById('history-table-body');
                if(tbody) {
                    tbody.innerHTML = '';
                    data.incidents.forEach(incident => {
                        let riskBadge = 'badge-watch';
                        if (incident.risk_level === 'WARNING') riskBadge = 'badge-warning';
                        if (incident.risk_level === 'EMERGENCY') riskBadge = 'badge-danger';
                        
                        const row = `
                            <tr>
                                <td>${incident.id}</td>
                                <td>${incident.start_time}</td>
                                <td>${incident.duration}</td>
                                <td><span class="badge ${riskBadge}">${incident.risk_level}</span></td>
                                <td>${incident.peak_level}%</td>
                            </tr>
                        `;
                        tbody.innerHTML += row;
                    });
                }

                // Set Section 4: Preparedness
                if(document.getElementById('eval-success-rate')) {
                    document.getElementById('eval-success-rate').textContent = data.preparedness.early_warning_success + '%';
                    document.getElementById('eval-avg-time').textContent = data.preparedness.avg_time_before_emergency + ' mins';
                    document.getElementById('eval-stabilized').textContent = data.preparedness.percent_stabilized + '%';
                }
            })
            .catch(err => console.error("Could not fetch history data:", err));
    }

    // Initial render
    startLiveMonitoring();
    setRange('24h');
    loadHistoryData();
});
