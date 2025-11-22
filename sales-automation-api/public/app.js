// RTGS.agentic Dashboard JavaScript

// Check system health
async function checkHealth() {
    try {
        const response = await fetch('/health');
        const data = await response.json();

        if (data.status === 'ok') {
            alert('✅ System Status: Healthy\n\n' +
                  'Database: ' + (data.database || 'Connected') + '\n' +
                  'Timestamp: ' + new Date().toLocaleString());
        } else {
            alert('⚠️ System Status: Issues Detected\n\nPlease check server logs.');
        }
    } catch (error) {
        alert('❌ Cannot connect to API server\n\nError: ' + error.message);
    }
}

// Load system statistics
async function loadStats() {
    try {
        // Update system status
        const healthResponse = await fetch('/health');
        const healthData = await healthResponse.json();

        document.getElementById('system-status').textContent =
            healthData.status === 'ok' ? '✅ Healthy' : '⚠️ Issues';
        document.getElementById('system-status').style.color =
            healthData.status === 'ok' ? '#48bb78' : '#f56565';

        // Try to load stats
        try {
            const statsResponse = await fetch('/stats');
            const stats = await statsResponse.json();

            if (stats.campaigns) {
                document.getElementById('active-campaigns').textContent =
                    stats.campaigns.active || '0';
            }

            if (stats.jobs) {
                document.getElementById('jobs-queued').textContent =
                    stats.jobs.pending || '0';
            }

            if (stats.yolo) {
                document.getElementById('yolo-status').textContent =
                    stats.yolo.enabled ? '✅ Active' : '⏸️ Inactive';
                document.getElementById('yolo-status').style.color =
                    stats.yolo.enabled ? '#48bb78' : '#a0aec0';
            }
        } catch (err) {
            // Stats endpoint may not be available
            console.log('Stats endpoint not available:', err.message);
            document.getElementById('active-campaigns').textContent = 'N/A';
            document.getElementById('jobs-queued').textContent = 'N/A';
            document.getElementById('yolo-status').textContent = 'N/A';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        document.getElementById('system-status').textContent = '❌ Offline';
        document.getElementById('system-status').style.color = '#f56565';
    }
}

// Smooth scroll for navigation links
document.addEventListener('DOMContentLoaded', () => {
    // Load stats on page load
    loadStats();

    // Refresh stats every 10 seconds
    setInterval(loadStats, 10000);

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all cards for animation
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.feature-card, .integration-card, .stat-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(card);
    });
});

// Make checkHealth available globally
window.checkHealth = checkHealth;
