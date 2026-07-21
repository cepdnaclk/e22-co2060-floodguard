// FloodGuard Dashboard - Updated App Logic and Data Visualization

document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        liveUpdateMs: 5000,
        defaultRange: '24h',
        watchLevel: 60,
        warningLevel: 70,
        criticalLevel: 80
    };

    const colors = {
        primary: '#2563eb',
        primaryLight: 'rgba(37, 99, 235, 0.2)',
        danger: '#ef4444',
        warning: '#f97316',
        watch: '#eab308',
        safe: '#10b981',
        sky: '#0ea5e9',
        muted: '#64748b'
    };

    let currentRange = CONFIG.defaultRange;
    let chartInstances = {};
    let liveInterval = null;

    const getEl = (id) => document.getElementById(id);

    const clamp = (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    };

    const toNumber = (value, fallback = 0) => {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    };

    function setText(id, value) {
        const element = getEl(id);

        if (element) {
            element.textContent = value;
        }
    }

    function updateLastUpdatedTime() {
        const timeEl = getEl('last-updated-time');

        if (!timeEl) {
            return;
        }

        const now = new Date();

        const formattedTime = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        timeEl.textContent = `Last updated: ${formattedTime}`;
    }

    async function fetchJson(url, fallbackFactory) {
        try {
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json'
                },
                cache: 'no-store'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.warn(
                `Could not fetch ${url}. Using fallback data.`,
                error
            );

            return typeof fallbackFactory === 'function'
                ? fallbackFactory()
                : fallbackFactory;
        }
    }

    // =========================================================
    // Tab navigation
    // =========================================================

    window.switchTab = function switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach((button) => {
            button.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach((content) => {
            content.classList.remove('active');
        });

        const targetButton = document.querySelector(
            `.tab-btn[data-target="${tabId}"]`
        );

        const targetContent = getEl(tabId);

        if (!targetButton || !targetContent) {
            console.error(`Tab "${tabId}" was not found.`);
            return;
        }

        targetButton.classList.add('active');
        targetContent.classList.add('active');

        if (tabId === 'tab-live') {
            destroyCharts();
            startLiveMonitoring();
        } else if (tabId === 'tab-trends') {
            stopLiveMonitoring();
            window.setRange(currentRange);
        } else if (tabId === 'tab-history') {
            stopLiveMonitoring();
            destroyCharts();
            loadHistoryData();
        }
    };

    // =========================================================
    // Chart configuration
    // =========================================================

    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.scale.grid.color = '#e2e8f0';
    } else {
        console.error(
            'Chart.js is not loaded. Charts cannot be displayed.'
        );
    }

    function destroyCharts() {
        Object.values(chartInstances).forEach((chart) => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });

        chartInstances = {};
    }

    function getPointCount(range) {
        const pointCounts = {
            '1h': 12,
            '6h': 12,
            '24h': 24,
            '7d': 14
        };

        return pointCounts[range] || 24;
    }

    function buildLabels(range, count) {
        if (range === '1h') {
            return Array.from({ length: count }, (_, index) => {
                const minutes = Math.max(
                    0,
                    60 - index * (60 / count)
                );

                return `-${minutes.toFixed(0)}m`;
            });
        }

        if (range === '6h') {
            return Array.from({ length: count }, (_, index) => {
                const hours = Math.max(
                    0,
                    6 - index * (6 / count)
                );

                return `-${hours.toFixed(1)}h`;
            });
        }

        if (range === '7d') {
            return Array.from({ length: count }, (_, index) => {
                const days = Math.max(
                    0,
                    7 - index * (7 / count)
                );

                return `-${days.toFixed(1)}d`;
            });
        }

        return Array.from({ length: count }, (_, index) => {
            const hours = Math.max(
                0,
                24 - index * (24 / count)
            );

            return `-${hours.toFixed(0)}h`;
        });
    }

    // =========================================================
    // Mock trend data
    // =========================================================

    function generateMockTrendData(range) {
        const count = getPointCount(range);

        const waterLevel = [];
        const rainfall = [];
        const riseRate = [];

        let currentWater = 55 + Math.random() * 10;

        for (let index = 0; index < count; index += 1) {
            const rain = Math.max(
                0,
                Math.random() * 8
            );

            const rate = Math.max(
                -0.25,
                rain / 12 + (Math.random() * 0.3 - 0.15)
            );

            currentWater = clamp(
                currentWater +
                    rate +
                    (Math.random() * 0.7 - 0.3),
                40,
                96
            );

            rainfall.push(
                Number(rain.toFixed(1))
            );

            riseRate.push(
                Number(rate.toFixed(2))
            );

            waterLevel.push(
                Number(currentWater.toFixed(1))
            );
        }

        const lastLevel =
            waterLevel[waterLevel.length - 1] || 60;

        const lastRate =
            riseRate[riseRate.length - 1] || 0;

        const prediction = [1, 2, 3].map((step) => {
            return Number(
                clamp(
                    lastLevel + lastRate * step * 2,
                    0,
                    100
                ).toFixed(1)
            );
        });

        return {
            water_level: waterLevel,
            rainfall,
            rise_rate: riseRate,
            prediction
        };
    }

    function normalizeArray(
        values,
        length,
        fallbackValue = 0
    ) {
        const result = Array.isArray(values)
            ? values.map((value) =>
                toNumber(value, fallbackValue)
            )
            : [];

        while (result.length < length) {
            result.push(
                result.length
                    ? result[result.length - 1]
                    : fallbackValue
            );
        }

        return result.slice(0, length);
    }

    function normalizeTrendData(data, range) {
        const fallback =
            generateMockTrendData(range);

        const length = Math.max(
            getPointCount(range),

            Array.isArray(data?.water_level)
                ? data.water_level.length
                : 0,

            Array.isArray(data?.rainfall)
                ? data.rainfall.length
                : 0,

            Array.isArray(data?.rise_rate)
                ? data.rise_rate.length
                : 0
        );

        const waterLevel = normalizeArray(
            data?.water_level || fallback.water_level,
            length,
            60
        ).map((value) => clamp(value, 0, 100));

        const rainfall = normalizeArray(
            data?.rainfall || fallback.rainfall,
            length,
            0
        ).map((value) => Math.max(0, value));

        const riseRate = normalizeArray(
            data?.rise_rate || fallback.rise_rate,
            length,
            0
        );

        const prediction = normalizeArray(
            data?.prediction || fallback.prediction,
            3,
            waterLevel[waterLevel.length - 1]
        ).map((value) => clamp(value, 0, 100));

        return {
            water_level: waterLevel,
            rainfall,
            rise_rate: riseRate,
            prediction
        };
    }

    // =========================================================
    // Trends range filter
    // =========================================================

    window.setRange = async function setRange(range) {
        const allowedRanges = [
            '1h',
            '6h',
            '24h',
            '7d'
        ];

        currentRange = allowedRanges.includes(range)
            ? range
            : CONFIG.defaultRange;

        document
            .querySelectorAll(
                '.time-filters .filter-btn'
            )
            .forEach((button) => {
                const onclickValue =
                    button.getAttribute('onclick') || '';

                button.classList.toggle(
                    'active',
                    onclickValue.includes(currentRange)
                );
            });

        const rawData = await fetchJson(
            `/api/trends?range=${encodeURIComponent(
                currentRange
            )}`,
            () => generateMockTrendData(currentRange)
        );

        const normalizedData =
            normalizeTrendData(
                rawData,
                currentRange
            );

        destroyCharts();

        renderMainCharts(
            normalizedData,
            currentRange
        );

        updateLastUpdatedTime();
    };

    // =========================================================
    // Live monitoring
    // =========================================================

    function getRisk(waterLevel) {
        if (waterLevel >= CONFIG.criticalLevel) {
            return {
                level: 'EMERGENCY',
                icon: 'warning',
                action: 'Immediate action required',
                color: colors.danger
            };
        }

        if (waterLevel >= CONFIG.warningLevel) {
            return {
                level: 'WARNING',
                icon: 'warning_amber',
                action: 'Prepare mitigation measures',
                color: colors.warning
            };
        }

        if (waterLevel >= CONFIG.watchLevel) {
            return {
                level: 'WATCH',
                icon: 'visibility',
                action: 'Stay alert and monitor conditions',
                color: colors.watch
            };
        }

        return {
            level: 'SAFE',
            icon: 'check_circle',
            action: 'Conditions are currently normal',
            color: colors.safe
        };
    }

    function calculateTimeToCritical(
        waterLevel,
        riseRate
    ) {
        if (waterLevel >= CONFIG.criticalLevel) {
            return 'Critical threshold reached';
        }

        if (riseRate <= 0) {
            return 'Not currently rising';
        }

        const hours =
            (
                CONFIG.criticalLevel -
                waterLevel
            ) / riseRate;

        if (!Number.isFinite(hours)) {
            return '--';
        }

        if (hours < 1) {
            const minutes = Math.max(
                1,
                Math.round(hours * 60)
            );

            return `${minutes} minutes`;
        }

        return `${hours.toFixed(1)} hours`;
    }

    function updateLiveDashboard() {
        const waterLevel =
            Math.floor(Math.random() * 51) + 40;

        const rainfall = Number(
            (Math.random() * 8).toFixed(1)
        );

        const riseRate = Number(
            (Math.random() * 1.5).toFixed(2)
        );

        const predictedLevel = clamp(
            waterLevel + riseRate * 2,
            0,
            100
        );

        const risk = getRisk(waterLevel);

        const timeToCritical =
            calculateTimeToCritical(
                waterLevel,
                riseRate
            );

        const riskCard = getEl('card-risk');
        const iconEl = getEl('risk-icon');
        const levelText =
            getEl('risk-level-text');
        const actionText =
            getEl('suggested-action-text');

        if (riskCard) {
            riskCard.style.borderTop =
                `4px solid ${risk.color}`;
        }

        if (iconEl) {
            iconEl.textContent = risk.icon;
            iconEl.style.color = risk.color;
        }

        if (levelText) {
            levelText.textContent = risk.level;
            levelText.style.color = risk.color;
        }

        if (actionText) {
            actionText.textContent = risk.action;
        }

        const waterText =
            getEl('water-level-text');

        const waterBar =
            getEl('water-level-bar');

        if (waterText) {
            waterText.textContent =
                `${waterLevel}%`;

            waterText.style.color =
                risk.color;
        }

        if (waterBar) {
            waterBar.style.width =
                `${waterLevel}%`;

            waterBar.style.backgroundColor =
                risk.color;

            waterBar.setAttribute(
                'aria-valuenow',
                String(waterLevel)
            );
        }

        const rainfallText =
            getEl('rainfall-text');

        if (rainfallText) {
            rainfallText.innerHTML =
                `${rainfall.toFixed(1)} ` +
                `<span class="unit">mm/hr</span>`;
        }

        const riseRateText =
            getEl('rise-rate-text');

        if (riseRateText) {
            riseRateText.innerHTML =
                `${riseRate.toFixed(2)} ` +
                `<span class="unit">%/hr</span>`;

            riseRateText.style.color =
                riseRate > 0.5
                    ? colors.danger
                    : '';
        }

        setText(
            'predicted-level-text',
            `${predictedLevel.toFixed(1)}%`
        );

        const criticalText =
            getEl('time-critical-text');

        if (criticalText) {
            criticalText.textContent =
                timeToCritical;

            const hoursRemaining =
                riseRate > 0
                    ? (
                        CONFIG.criticalLevel -
                        waterLevel
                    ) / riseRate
                    : Infinity;

            const isNearCritical =
                waterLevel >= CONFIG.criticalLevel ||
                hoursRemaining < 5;

            criticalText.style.color =
                isNearCritical
                    ? colors.danger
                    : '';
        }

        updateLastUpdatedTime();
    }

    function startLiveMonitoring() {
        stopLiveMonitoring();

        updateLiveDashboard();

        liveInterval = window.setInterval(
            updateLiveDashboard,
            CONFIG.liveUpdateMs
        );
    }

    function stopLiveMonitoring() {
        if (liveInterval !== null) {
            window.clearInterval(liveInterval);
            liveInterval = null;
        }
    }

    // =========================================================
    // Main trend charts
    // =========================================================

    function renderMainCharts(data, range) {
        if (typeof Chart === 'undefined') {
            return;
        }

        const histWater =
            data.water_level;

        const histRain =
            data.rainfall;

        const histRise =
            data.rise_rate;

        const labels = buildLabels(
            range,
            histWater.length
        );

        // Rainfall chart
        const rainCanvas =
            getEl('trendRainfallChart');

        if (rainCanvas) {
            chartInstances.rain =
                new Chart(rainCanvas, {
                    type: 'line',

                    data: {
                        labels,

                        datasets: [
                            {
                                label:
                                    'Rainfall (mm/hr)',

                                data: histRain,

                                borderColor:
                                    colors.sky,

                                backgroundColor:
                                    'rgba(14, 165, 233, 0.2)',

                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                                pointRadius: 2
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        interaction: {
                            mode: 'index',
                            intersect: false
                        },

                        plugins: {
                            legend: {
                                display: false
                            }
                        },

                        scales: {
                            y: {
                                beginAtZero: true,

                                title: {
                                    display: true,
                                    text:
                                        'Rainfall (mm/hr)'
                                }
                            },

                            x: {
                                title: {
                                    display: true,
                                    text: 'Time'
                                }
                            }
                        }
                    }
                });
        }

        // Water-level chart
        const waterCanvas =
            getEl('trendWaterLevelChart');

        if (waterCanvas) {
            chartInstances.water =
                new Chart(waterCanvas, {
                    type: 'line',

                    data: {
                        labels,

                        datasets: [
                            {
                                label:
                                    'Water Level (%)',

                                data: histWater,

                                borderColor:
                                    colors.primary,

                                backgroundColor:
                                    colors.primaryLight,

                                borderWidth: 3,
                                fill: true,
                                tension: 0.3,
                                pointRadius: 2
                            },

                            {
                                label:
                                    'Critical Threshold (80%)',

                                data: Array(
                                    labels.length
                                ).fill(
                                    CONFIG.criticalLevel
                                ),

                                borderColor:
                                    colors.danger,

                                borderWidth: 2,
                                borderDash: [5, 5],
                                fill: false,
                                pointRadius: 0
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        interaction: {
                            mode: 'index',
                            intersect: false
                        },

                        plugins: {
                            legend: {
                                display: false
                            }
                        },

                        scales: {
                            y: {
                                min: 0,
                                max: 100,

                                title: {
                                    display: true,
                                    text: 'Level (%)'
                                }
                            },

                            x: {
                                title: {
                                    display: true,
                                    text: 'Time'
                                }
                            }
                        }
                    }
                });
        }

        // Rise-rate chart
        const riseCanvas =
            getEl('trendRiseRateChart');

        if (riseCanvas) {
            const pointColors =
                histRise.map((value) => {
                    return value > 0.25
                        ? colors.danger
                        : colors.muted;
                });

            const pointRadii =
                histRise.map((value) => {
                    return value > 0.25
                        ? 5
                        : 2;
                });

            chartInstances.rise =
                new Chart(riseCanvas, {
                    type: 'line',

                    data: {
                        labels,

                        datasets: [
                            {
                                label:
                                    'Rise Rate (%/hr)',

                                data: histRise,

                                borderColor:
                                    colors.watch,

                                backgroundColor:
                                    'rgba(234, 179, 8, 0.1)',

                                borderWidth: 2,
                                fill: true,
                                tension: 0.2,

                                pointBackgroundColor:
                                    pointColors,

                                pointRadius:
                                    pointRadii
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        interaction: {
                            mode: 'index',
                            intersect: false
                        },

                        plugins: {
                            legend: {
                                display: false
                            }
                        },

                        scales: {
                            y: {
                                title: {
                                    display: true,
                                    text:
                                        'Rate (%/hr)'
                                }
                            },

                            x: {
                                title: {
                                    display: true,
                                    text: 'Time'
                                }
                            }
                        }
                    }
                });
        }

        // Prediction chart
        const predictionCanvas =
            getEl('trendPredictionChart');

        if (predictionCanvas) {
            const extendedLabels = [
                ...labels,
                '+1 Unit',
                '+2 Units',
                '+3 Units'
            ];

            const predictedSeries =
                Array(labels.length).fill(null);

            predictedSeries[
                predictedSeries.length - 1
            ] = histWater[
                histWater.length - 1
            ];

            predictedSeries.push(
                ...data.prediction
            );

            chartInstances.prediction =
                new Chart(predictionCanvas, {
                    type: 'line',

                    data: {
                        labels: extendedLabels,

                        datasets: [
                            {
                                label:
                                    'Recorded Level (%)',

                                data: [
                                    ...histWater,
                                    null,
                                    null,
                                    null
                                ],

                                borderColor:
                                    colors.primary,

                                borderWidth: 3,
                                fill: false,
                                tension: 0.3
                            },

                            {
                                label:
                                    'Predicted Level (%)',

                                data:
                                    predictedSeries,

                                borderColor:
                                    colors.danger,

                                borderWidth: 3,
                                borderDash: [5, 5],
                                fill: false,
                                tension: 0.3,

                                pointBackgroundColor:
                                    colors.danger
                            }
                        ]
                    },

                    options: {
                        responsive: true,
                        maintainAspectRatio: false,

                        interaction: {
                            mode: 'index',
                            intersect: false
                        },

                        scales: {
                            y: {
                                min: 0,
                                max: 100,

                                title: {
                                    display: true,
                                    text: 'Level (%)'
                                }
                            },

                            x: {
                                title: {
                                    display: true,
                                    text: 'Time'
                                }
                            }
                        }
                    }
                });
        }
    }

    // =========================================================
    // History tab
    // =========================================================

    function generateMockHistoryData() {
        return {
            summary: {
                total_incidents: 8,
                total_emergencies: 2,
                highest_water_level: 91,
                longest_incident:
                    '3 hrs 20 mins'
            },

            incidents: [
                {
                    id: 'FG-001',
                    start_time:
                        '2026-07-18 14:20',
                    duration:
                        '1 hr 10 mins',
                    risk_level: 'WATCH',
                    peak_level: 68
                },

                {
                    id: 'FG-002',
                    start_time:
                        '2026-07-19 03:45',
                    duration:
                        '2 hrs 05 mins',
                    risk_level: 'WARNING',
                    peak_level: 77
                },

                {
                    id: 'FG-003',
                    start_time:
                        '2026-07-20 16:10',
                    duration:
                        '3 hrs 20 mins',
                    risk_level: 'EMERGENCY',
                    peak_level: 91
                }
            ],

            preparedness: {
                early_warning_success: 87,
                avg_time_before_emergency: 42,
                percent_stabilized: 75
            }
        };
    }

    function getBadgeClass(riskLevel) {
        switch (
            String(riskLevel).toUpperCase()
        ) {
            case 'EMERGENCY':
                return 'badge-danger';

            case 'WARNING':
                return 'badge-warning';

            case 'SAFE':
                return 'badge-safe';

            default:
                return 'badge-watch';
        }
    }

    function addTableCell(row, value) {
        const cell =
            document.createElement('td');

        cell.textContent =
            String(value ?? '--');

        row.appendChild(cell);
    }

    function renderHistoryTable(incidents) {
        const tbody =
            getEl('history-table-body');

        if (!tbody) {
            return;
        }

        tbody.replaceChildren();

        if (
            !Array.isArray(incidents) ||
            incidents.length === 0
        ) {
            const row =
                document.createElement('tr');

            const cell =
                document.createElement('td');

            cell.colSpan = 5;

            cell.textContent =
                'No historical incidents are available.';

            row.appendChild(cell);
            tbody.appendChild(row);

            return;
        }

        incidents.forEach((incident) => {
            const row =
                document.createElement('tr');

            addTableCell(
                row,
                incident.id
            );

            addTableCell(
                row,
                incident.start_time
            );

            addTableCell(
                row,
                incident.duration
            );

            const riskCell =
                document.createElement('td');

            const badge =
                document.createElement('span');

            const riskLevel =
                String(
                    incident.risk_level ||
                    'WATCH'
                ).toUpperCase();

            badge.className =
                `badge ${getBadgeClass(
                    riskLevel
                )}`;

            badge.textContent =
                riskLevel;

            riskCell.appendChild(badge);
            row.appendChild(riskCell);

            addTableCell(
                row,
                `${clamp(
                    toNumber(
                        incident.peak_level
                    ),
                    0,
                    100
                )}%`
            );

            tbody.appendChild(row);
        });
    }

    async function loadHistoryData() {
        const data = await fetchJson(
            '/api/history',
            generateMockHistoryData
        );

        const fallback =
            generateMockHistoryData();

        const summary =
            data?.summary ||
            fallback.summary;

        const preparedness =
            data?.preparedness ||
            fallback.preparedness;

        const incidents =
            Array.isArray(data?.incidents)
                ? data.incidents
                : fallback.incidents;

        setText(
            'history-total-incidents',
            toNumber(
                summary.total_incidents
            )
        );

        setText(
            'history-total-emergencies',
            toNumber(
                summary.total_emergencies
            )
        );

        setText(
            'history-highest-level',
            `${clamp(
                toNumber(
                    summary.highest_water_level
                ),
                0,
                100
            )}%`
        );

        setText(
            'history-longest-incident',
            summary.longest_incident || '--'
        );

        renderHistoryTable(incidents);

        setText(
            'eval-success-rate',
            `${clamp(
                toNumber(
                    preparedness
                        .early_warning_success
                ),
                0,
                100
            )}%`
        );

        setText(
            'eval-avg-time',
            `${Math.max(
                0,
                toNumber(
                    preparedness
                        .avg_time_before_emergency
                )
            )} mins`
        );

        setText(
            'eval-stabilized',
            `${clamp(
                toNumber(
                    preparedness
                        .percent_stabilized
                ),
                0,
                100
            )}%`
        );

        updateLastUpdatedTime();
    }

    // =========================================================
    // Browser events
    // =========================================================

    document.addEventListener(
        'visibilitychange',
        () => {
            const liveTabActive =
                getEl('tab-live')
                    ?.classList
                    .contains('active');

            if (document.hidden) {
                stopLiveMonitoring();
            } else if (liveTabActive) {
                startLiveMonitoring();
            }
        }
    );

    window.addEventListener(
        'online',
        () => {
            const trendsTabActive =
                getEl('tab-trends')
                    ?.classList
                    .contains('active');

            const historyTabActive =
                getEl('tab-history')
                    ?.classList
                    .contains('active');

            if (trendsTabActive) {
                window.setRange(
                    currentRange
                );
            }

            if (historyTabActive) {
                loadHistoryData();
            }
        }
    );

    window.addEventListener(
        'beforeunload',
        () => {
            stopLiveMonitoring();
            destroyCharts();
        }
    );

    // =========================================================
    // Initial dashboard load
    // =========================================================

    updateLastUpdatedTime();
    startLiveMonitoring();
    window.setRange(CONFIG.defaultRange);
    loadHistoryData();
});