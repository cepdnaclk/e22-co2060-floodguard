/**
 * FloodGuard Frontend Application
 * Real-time flood risk monitoring and early warning system
 * Displays live data, trends, predictions, and public advisories
 * Uses Chart.js for data visualization
 */

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    // ==================== TIME & STATUS UPDATES ====================
    // 1. Display Current Time
    const timeEl = document.getElementById('last-updated-time');
    const now = new Date();
    timeEl.innerHTML = `Last updated: ${now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;

    // ==================== TAB NAVIGATION ====================
    // 2. Tab Navigation
    window.switchTab = function(tabId) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to target
        document.querySelector(`.tab-btn[data-target="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');

        // Re-render charts if switching to Trends tab to ensure proper sizing
        if(tabId === 'tab-trends') {
            destroyCharts();
            renderMainCharts();
        } else if (tabId === 'tab-live') {
            destroyCharts();
            renderMiniCharts();
        }
    }

    // ==================== FILTER CONTROLS ====================
    // 3. Time Filter Toggle (Trends Tab)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            // In a real app, fetch new data here. We just trigger a re-render
            destroyCharts();
            renderMainCharts();
        });
    });

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
    const labels6h = Array.from({length: 12}, (_, i) => `-${6 - i/2}h`);

    // Live Monitoring Mini Charts
    function renderMiniCharts() {
        // Mini Water Chart (Last 1 hour)
        const ctxWaterMini = document.getElementById('miniWaterChart');
        if(ctxWaterMini) {
            chartInstances.waterMini = new Chart(ctxWaterMini, {
                type: 'line',
                data: {
                    labels: labels1h,
                    datasets: [{
                        label: 'Level (%)',
                        data: [72, 73, 73.5, 74, 75, 75.8, 76.5, 77.2, 78.1, 79, 80, 81],
                        borderColor: colors.primary,
                        backgroundColor: colors.primaryLight,
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    },
                    {
                        label: 'Critical Threshold',
                        data: Array(12).fill(85),
                        borderColor: colors.danger,
                        borderWidth: 1,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                    scales: {
                        y: { min: 60, max: 100, display: false },
                        x: { display: false }
                    },
                    interaction: { mode: 'nearest', axis: 'x', intersect: false }
                }
            });
        }

        // Mini Rain Chart
        const ctxRainMini = document.getElementById('miniRainChart');
        if(ctxRainMini) {
            chartInstances.rainMini = new Chart(ctxRainMini, {
                type: 'bar',
                data: {
                    labels: labels1h,
                    datasets: [{
                        label: 'Rainfall (mm/min)',
                        data: [1.2, 1.5, 2.1, 2.8, 3.2, 3.5, 4.0, 4.2, 4.5, 4.3, 4.2, 4.1],
                        backgroundColor: colors.primary,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { display: false },
                        x: { display: false }
                    }
                }
            });
        }
    }

    // Trends & Prediction Main Charts
    function renderMainCharts() {
        // Main Water Level + Prediction
        const ctxWaterMain = document.getElementById('mainWaterChart');
        if(ctxWaterMain) {
            // Generate historical data array and prediction array
            const histData = [65, 66, 67, 68.5, 70, 72, 74.5, 76, 78, 79.5, 80.2, 81];
            // Prediction starts at current value (index 11) and projects forward 2 hours
            const predData = Array(12).fill(null);
            predData[11] = 81;
            predData.push(84); // +30m
            predData.push(87); // +60m
            predData.push(90); // +90m
            
            const labels = [...labels6h, '+30m', '+1h', '+1.5h'];

            chartInstances.waterMain = new Chart(ctxWaterMain, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Recorded Level (%)',
                            data: [...histData, null, null, null],
                            borderColor: colors.primary,
                            backgroundColor: colors.primaryLight,
                            borderWidth: 3,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 3
                        },
                        {
                            label: 'Predicted Level (%)',
                            data: predData,
                            borderColor: colors.warningLine,
                            borderWidth: 3,
                            borderDash: [5, 5],
                            fill: false,
                            tension: 0.3,
                            pointRadius: 3,
                            pointBackgroundColor: colors.warningLine
                        },
                        {
                            label: 'Critical Threshold (85%)',
                            data: Array(15).fill(85),
                            borderColor: colors.danger,
                            borderWidth: 2,
                            borderDash: [4, 4],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } },
                        tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': ' + context.parsed.y + '%'; } } }
                    },
                    scales: {
                        y: { min: 50, max: 100, title: { display: true, text: 'Reservoir Level (%)' } },
                        x: { title: { display: true, text: 'Time' } }
                    }
                }
            });
        }

        // Main Rain Chart
        const ctxRainMain = document.getElementById('mainRainChart');
        if(ctxRainMain) {
            chartInstances.rainMain = new Chart(ctxRainMain, {
                type: 'bar',
                data: {
                    labels: labels6h,
                    datasets: [
                        {
                            type: 'bar',
                            label: 'Rainfall Intensity (mm/min)',
                            data: [0, 0.5, 0.8, 1.2, 2.5, 3.0, 3.8, 4.5, 4.3, 4.2, 4.2, 4.1],
                            backgroundColor: 'rgba(56, 189, 248, 0.7)',
                            borderRadius: 4,
                            yAxisID: 'y'
                        },
                        {
                            type: 'line',
                            label: 'Rise Rate (%/min)',
                            data: [0, 0.02, 0.05, 0.08, 0.15, 0.18, 0.22, 0.28, 0.27, 0.28, 0.29, 0.3],
                            borderColor: colors.danger,
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 2,
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                    },
                    scales: {
                        x: { title: { display: true, text: 'Time (Last 6 Hours)' } },
                        y: { 
                            type: 'linear', 
                            display: true, 
                            position: 'left',
                            title: { display: true, text: 'Rainfall (mm/min)' }
                        },
                        y1: { 
                            type: 'linear', 
                            display: true, 
                            position: 'right',
                            title: { display: true, text: 'Rise Rate (%/min)' },
                            grid: { drawOnChartArea: false } // only draw grid lines for one axis
                        }
                    }
                }
            });
        }
    }

    // Initial render
    renderMiniCharts();
});
