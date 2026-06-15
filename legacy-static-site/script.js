/**
 * ArcSign Landing Page Scripts
 */

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Navigation Toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            // Close other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const navHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    hamburger.classList.remove('active');
                }
            }
        });
    });

    // Navbar scroll class
    const navbar = document.querySelector('.navbar');

    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 60) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }, { passive: true });

    // Intersection Observer for reveal animations
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '0px 0px -60px 0px', threshold: 0.12 });

    // Apply reveal class with staggered delays to grid children
    document.querySelectorAll(
        '.problem-card, .feature-card, .pricing-card, .everyone-card, .defense-layer, .hero-feature-card, .proof-item'
    ).forEach((el, i) => {
        el.classList.add('reveal');
        const delay = (i % 4) * 0.08;
        el.style.transitionDelay = `${delay}s`;
        revealObserver.observe(el);
    });

    // Section headers reveal
    document.querySelectorAll('.section-header, .hero-badges, .hero-cta, .hero-subtitle, .hero-note').forEach(el => {
        el.classList.add('reveal');
        revealObserver.observe(el);
    });

    // Counter animation for stats
    const animateCounter = (element, target, duration = 2000) => {
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;

        const updateCounter = () => {
            current += increment;
            if (current < target) {
                element.textContent = Math.floor(current);
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target;
            }
        };

        updateCounter();
    };

    // Observe stats for counter animation
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statValue = entry.target.querySelector('.stat-value');
                if (statValue) {
                    const value = statValue.textContent;
                    if (value.match(/^\d+$/)) {
                        animateCounter(statValue, parseInt(value));
                    }
                }
                statsObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat').forEach(stat => {
        statsObserver.observe(stat);
    });

    // GA4 download event tracking
    document.querySelectorAll('a[href*="dl.arcsign.io"]').forEach(link => {
        link.addEventListener('click', () => {
            try {
                const url = new URL(link.href);
                const filename = url.pathname.split('/').pop() || '';
                const os = filename.includes('dmg') ? 'macos'
                         : (filename.includes('msi') || filename.includes('exe')) ? 'windows'
                         : 'linux';
                if (typeof gtag === 'function') {
                    gtag('event', 'download', {
                        event_category: 'installer',
                        event_label: filename,
                        os_platform: os,
                    });
                }
            } catch { /* ignore */ }
        });
    });

    // Download button click tracking
    document.querySelectorAll('.download-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!btn.href || btn.href === '#') {
                e.preventDefault();
            }
        });
    });

    // Early bird countdown (optional - uncomment to enable)
    /*
    const countdownDate = new Date('2025-03-01').getTime();

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

        const countdownEl = document.querySelector('.early-countdown');
        if (countdownEl) {
            countdownEl.textContent = `${days} 天 ${hours} 小時 ${minutes} 分鐘`;
        }

        if (distance < 0) {
            clearInterval(countdownInterval);
            if (countdownEl) {
                countdownEl.textContent = '活動已結束';
            }
        }
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown();
    */

    // Typing effect for hero (optional)
    const heroTitle = document.querySelector('.hero h1');
    if (heroTitle) {
        // Add subtle glow effect on scroll
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const opacity = Math.max(0, 1 - scrolled / 500);
            heroTitle.style.textShadow = `0 0 ${30 * opacity}px rgba(45, 212, 191, ${0.3 * opacity})`;
        });
    }

    // Newsletter Form
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const emailInput = document.getElementById('newsletter-email');
            const status = document.getElementById('newsletter-status');
            const btn = newsletterForm.querySelector('button');
            const email = emailInput.value.trim();

            if (!email) return;

            btn.disabled = true;
            btn.textContent = '...';
            status.textContent = '';
            status.className = 'newsletter-status';

            try {
                const source = new URLSearchParams(window.location.search).get('utm_campaign') || 'homepage';
                const res = await fetch('/api/subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, source }),
                });
                const data = await res.json();

                if (data.ok) {
                    status.textContent = data.already
                        ? (window.__lang === 'en' ? 'You are already subscribed!' : '你已經訂閱過了！')
                        : (window.__lang === 'en' ? 'Subscribed! Welcome aboard.' : '訂閱成功！歡迎加入。');
                    status.className = 'newsletter-status success';
                    if (!data.already) emailInput.value = '';
                } else if (data.error === 'rate_limited') {
                    status.textContent = window.__lang === 'en' ? 'Too many attempts. Please try again tomorrow.' : '操作過於頻繁，請明天再試。';
                    status.className = 'newsletter-status error';
                } else {
                    status.textContent = window.__lang === 'en' ? 'Invalid email address.' : '請輸入有效的 Email 地址。';
                    status.className = 'newsletter-status error';
                }
            } catch {
                status.textContent = window.__lang === 'en' ? 'Network error. Please try again.' : '網路錯誤，請稍後再試。';
                status.className = 'newsletter-status error';
            }

            btn.disabled = false;
            btn.textContent = window.__lang === 'en' ? 'Subscribe Free' : '免費訂閱';
        });
    }

    console.log('ArcSign Landing Page initialized');
});

// Mobile menu styles (added dynamically)
const mobileStyles = `
    @media (max-width: 768px) {
        .nav-links.active {
            display: flex;
            flex-direction: column;
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: rgba(15, 23, 42, 0.98);
            padding: 20px;
            gap: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .hamburger.active span:nth-child(1) {
            transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.active span:nth-child(2) {
            opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
            transform: rotate(-45deg) translate(7px, -6px);
        }
    }
`;

const mobileStyleSheet = document.createElement('style');
mobileStyleSheet.textContent = mobileStyles;
document.head.appendChild(mobileStyleSheet);
