import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

      :root {
        --navy: #003049;
        --navy-light: #1a3160;
        --blue: #003049;
        --blue-dark: #003049;
        --green: #16a34a;
        --amber: #f7c548;
        --red: #dc2626;
        --purple: #7c3aed;
        --slate: #6b7280;
        --light: #fafafa;
        --white: #ffffff;
      }

      html { scroll-behavior: smooth; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #1f2937; line-height: 1.6; -webkit-font-smoothing: antialiased;
      }

      /* ── UTILITY ─────────────────────────────────── */
      .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
      .btn {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 14px 28px; border-radius: 10px; font-weight: 700;
        font-size: 15px; text-decoration: none; border: none;
        cursor: pointer; transition: all .2s; font-family: inherit;
      }
      .btn-primary { background: var(--blue); color: #fff; }
      .btn-primary:hover { background: var(--blue-dark); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(0,48,73,.35); }
      .btn-outline { background: #fff; color: var(--navy); border: 1.5px solid #e5e7eb; }
      .btn-outline:hover { border-color: var(--navy); background: #fff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,48,73,0.08); }
      .btn-green { background: var(--green); color: #fff; }
      .btn-green:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,.35); }
      .btn-amber { background: var(--amber); color: var(--navy); box-shadow: 0 2px 8px rgba(247,197,72,.4); }
      .btn-amber:hover { background: #f0b82a; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(247,197,72,.5); }
      .section-label {
        display: inline-block; font-size: 12px; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        color: var(--blue); background: #f0f5fa; padding: 5px 14px;
        border-radius: 20px; margin-bottom: 16px;
      }
      .section-title {
        font-size: clamp(28px, 4vw, 40px); font-weight: 900;
        letter-spacing: -0.5px; line-height: 1.15; margin-bottom: 16px;
      }
      .section-sub { font-size: 17px; color: var(--slate); max-width: 600px; line-height: 1.7; }

      /* ── NAV ─────────────────────────────────────── */
      .nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        padding: 12px 0; transition: all .3s;
        background: rgba(255,255,255,0.92); backdrop-filter: blur(12px);
        border-bottom: 1px solid rgba(0,48,73,0.06);
      }
      .nav.scrolled { background: rgba(255,255,255,.98); backdrop-filter: blur(14px); box-shadow: 0 2px 16px rgba(0,48,73,.08); padding: 8px 0; }
      .nav .container { display: flex; justify-content: space-between; align-items: center; }
      .nav-logo { text-decoration: none; display: flex; align-items: center; flex-shrink: 0; }
      .nav-links { display: flex; align-items: center; gap: 28px; }
      .nav-links a { color: #374151; text-decoration: none; font-size: 14px; font-weight: 600; transition: color .15s; }
      .nav-links a:hover { color: var(--navy); }
      .nav-signin { color: var(--navy) !important; padding: 9px 18px; border-radius: 10px; border: 1.5px solid #e5e7eb; transition: all .15s; }
      .nav-signin:hover { border-color: var(--navy); }
      .nav-cta { padding: 9px 20px !important; font-size: 13px !important; }
      .nav-hamburger {
        display: none; background: none; border: none; color: var(--navy);
        cursor: pointer; padding: 6px; border-radius: 6px; transition: background .15s;
      }
      .nav-hamburger:hover { background: rgba(0,48,73,.06); }

      /* Mobile menu overlay */
      .mobile-menu {
        display: none; position: fixed; inset: 0; z-index: 99;
        background: rgba(0,48,73,.98); backdrop-filter: blur(16px);
        flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      }
      .mobile-menu.open { display: flex; }
      .mobile-menu a {
        color: rgba(255,255,255,.8); text-decoration: none; font-size: 20px;
        font-weight: 700; padding: 14px 24px; border-radius: 10px; transition: all .15s;
        width: 240px; text-align: center;
      }
      .mobile-menu a:hover { background: rgba(255,255,255,.08); color: #fff; }
      .mobile-menu-close {
        position: absolute; top: 16px; right: 20px;
        background: none; border: none; color: #fff; cursor: pointer; padding: 8px;
      }

      /* ── HERO (Modern Academic) ──────────────────── */
      .hero {
        background: linear-gradient(135deg, #f7f7f7 0%, #e6eff5 100%);
        color: var(--navy); padding: 0; overflow: hidden; position: relative;
      }
      .hero::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(ellipse at 85% 25%, rgba(102,155,188,.18) 0%, transparent 55%),
                    radial-gradient(ellipse at 15% 85%, rgba(247,197,72,.10) 0%, transparent 50%);
      }
      .hero .container {
        position: relative; z-index: 1;
        display: grid; grid-template-columns: 1.1fr 1fr; gap: 48px;
        align-items: center; min-height: 92vh; padding-top: 120px; padding-bottom: 80px;
      }
      .hero-text h1 {
        font-size: clamp(36px, 5vw, 60px); font-weight: 800;
        letter-spacing: -1.5px; line-height: 1.05; margin-bottom: 22px;
        color: var(--navy);
      }
      .hero-text h1 span { color: #669bbc; }
      .hero-text p { font-size: 18px; color: #4b5563; line-height: 1.65; margin-bottom: 32px; max-width: 520px; }
      .hero-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
      .hero-stats {
        margin-top: 36px; padding-top: 24px;
        border-top: 1px solid rgba(0,48,73,0.1);
        display: flex; gap: 36px; flex-wrap: wrap;
      }
      .hero-stat-num { font-size: 28px; font-weight: 800; color: var(--navy); letter-spacing: -0.5px; }
      .hero-stat-label { font-size: 13px; color: #6b7280; margin-top: 2px; }
      .hero-visual { display: flex; justify-content: center; align-items: center; }
      .hero-mockup {
        width: 100%; max-width: 520px;
        background: #fff; border-radius: 18px;
        border: 1px solid #e5e7eb;
        padding: 24px; box-shadow: 0 16px 48px rgba(0,48,73,0.15);
      }
      .mockup-bar { display: flex; gap: 6px; margin-bottom: 14px; }
      .mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
      .mockup-dot:nth-child(1) { background: #ff5f56; }
      .mockup-dot:nth-child(2) { background: #ffbd2e; }
      .mockup-dot:nth-child(3) { background: #27c93f; }
      .mockup-title { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 14px; }
      .mockup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
      .mockup-stat {
        background: #f7f7f7; border-radius: 10px; padding: 12px 14px;
      }
      .mockup-stat.urgent {
        background: #fef4d6;
        border-left: 3px solid #f7c548;
      }
      .mockup-stat-label { font-size: 10px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 4px; }
      .mockup-stat.urgent .mockup-stat-label { color: #b8870a; }
      .mockup-stat-value { font-size: 20px; font-weight: 800; color: var(--navy); }
      .mockup-stat-value.green { color: var(--green); }
      .mockup-stat-value.blue  { color: #669bbc; }
      .mockup-stat-value.amber { color: #b8870a; }
      .mockup-grades { background: #f7f7f7; border-radius: 10px; padding: 12px; }
      .mockup-grade-row { display: flex; align-items: center; gap: 8px; font-size: 11px; margin-bottom: 6px; }
      .mockup-grade-row:last-child { margin-bottom: 0; }
      .mockup-grade-label { width: 50px; color: #374151; font-weight: 600; }
      .mockup-grade-bar { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
      .mockup-grade-fill { height: 100%; border-radius: 3px; }
      .mockup-grade-pct { width: 32px; text-align: right; font-weight: 700; color: var(--navy); font-size: 11px; }

      /* ── SOCIAL PROOF STRIP ──────────────────────── */
      .proof-strip { padding: 48px 0; background: #fff; border-bottom: 1px solid #f7f7f7; }
      .proof-grid {
        display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; align-items: center;
      }
      .proof-item { text-align: center; }
      .proof-number { font-size: 32px; font-weight: 900; color: var(--navy); letter-spacing: -1px; }
      .proof-label { font-size: 13px; font-weight: 600; color: var(--slate); margin-top: 2px; }

      /* ── PAIN POINTS ─────────────────────────────── */
      .pain { padding: 100px 0; background: var(--light); }
      .pain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 48px; }
      .pain-card {
        background: #fff; border-radius: 14px; padding: 28px;
        box-shadow: 0 1px 3px rgba(0,0,0,.05); border: 1.5px solid #e5e7eb;
        transition: all .25s;
      }
      .pain-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,.08); border-color: #d1d5db; }
      .pain-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .pain-icon {
        width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .pain-icon svg { width: 20px; height: 20px; stroke-width: 1.8; }
      .pain-icon.red    { background: #fee2e2; color: #dc2626; }
      .pain-icon.amber  { background: #fef3c7; color: #d97706; }
      .pain-icon.slate  { background: #e5e7eb; color: #4b5563; }
      .pain-title { font-size: 16px; font-weight: 800; color: #1f2937; }
      .pain-desc { font-size: 14px; color: var(--slate); line-height: 1.7; }

      /* ── FEATURES ────────────────────────────────── */
      .features { padding: 100px 0; }
      .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 48px; }
      .feature-card {
        display: flex; gap: 18px; padding: 24px;
        background: var(--light); border-radius: 14px;
        border: 1.5px solid #e5e7eb; transition: all .25s;
      }
      .feature-card:hover { border-color: var(--blue); background: #f0f5fa; }
      .feature-icon {
        width: 48px; height: 48px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
      }
      .feature-icon.blue   { background: #e6eff5; }
      .feature-icon.green  { background: #dcfce7; }
      .feature-icon.purple { background: #ede9fe; }
      .feature-icon.amber  { background: #fef3c7; }
      .feature-icon.rose   { background: #ffe4e6; }
      .feature-icon.cyan   { background: #cffafe; }
      .feature-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
      .feature-desc { font-size: 13px; color: var(--slate); line-height: 1.6; }

      /* ── AUDIENCE ────────────────────────────────── */
      .audience { padding: 100px 0; background: var(--light); }
      .audience-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 48px; }
      .audience-card {
        background: #fff; border-radius: 16px; padding: 36px;
        box-shadow: 0 1px 3px rgba(0,0,0,.05); border: 1.5px solid #e5e7eb;
      }
      .audience-card h3 { font-size: 20px; font-weight: 800; margin-bottom: 16px; }
      .audience-list { list-style: none; }
      .audience-list li {
        padding: 8px 0; font-size: 15px; color: #374151;
        display: flex; align-items: flex-start; gap: 10px;
      }
      .audience-list li::before { content: '\u2713'; color: var(--green); font-weight: 800; flex-shrink: 0; margin-top: 1px; }

      /* ── PRICING ──────────────────────────────── */
      .pricing { padding: 100px 0; text-align: center; }
      .pricing-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 48px; max-width: 1040px; margin-left: auto; margin-right: auto; }
      .pricing-card {
        background: #fff; border-radius: 16px; padding: 32px 24px;
        border: 2px solid #e5e7eb; text-align: center; transition: all .25s;
      }
      .pricing-card:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(0,0,0,.08); }
      .pricing-card.featured { border-color: var(--blue); box-shadow: 0 8px 30px rgba(0,48,73,.12); position: relative; }
      .pricing-badge {
        position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
        background: var(--blue); color: #fff; font-size: 11px; font-weight: 700;
        padding: 4px 14px; border-radius: 20px; letter-spacing: .5px; white-space: nowrap;
      }
      .pricing-name { font-size: 14px; font-weight: 700; color: var(--slate); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
      .pricing-price { font-size: 36px; font-weight: 900; color: #1f2937; margin-bottom: 4px; }
      .pricing-period { font-size: 13px; color: var(--slate); margin-bottom: 20px; }
      .pricing-features { list-style: none; text-align: left; margin-bottom: 24px; }
      .pricing-features li { padding: 6px 0; font-size: 14px; color: #374151; display: flex; gap: 8px; align-items: flex-start; }
      .pricing-features li::before { content: '\u2713'; color: var(--green); font-weight: 700; }

      /* ── DEMO VIDEO ────────────────────────────────── */
      .demo-video { padding: 100px 0; background: #fff; }
      .demo-video .container { text-align: center; }
      .video-wrapper {
        max-width: 800px; margin: 48px auto 0; position: relative;
        border-radius: 16px; overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,.12);
        background: var(--navy); aspect-ratio: 16/9;
      }
      .video-wrapper video {
        position: absolute; top: 0; left: 0;
        width: 100%; height: 100%; object-fit: cover; border-radius: 16px;
      }

      /* ── CHALLENGES ─────────────────────────────── */
      .challenges { padding: 100px 0; background: var(--light); }
      .challenges-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 48px; }
      .challenge-card {
        background: #fff; border-radius: 16px; padding: 32px;
        border: 1.5px solid #e5e7eb; transition: all .25s;
        display: flex; gap: 18px;
      }
      .challenge-card:hover { box-shadow: 0 8px 30px rgba(0,0,0,.06); border-color: #d1d5db; }
      .challenge-stat {
        font-size: 32px; font-weight: 900; letter-spacing: -1px;
        flex-shrink: 0; width: 72px; text-align: center; line-height: 1.1;
      }
      .challenge-title { font-size: 15px; font-weight: 800; color: #1f2937; margin-bottom: 6px; }
      .challenge-desc { font-size: 14px; color: var(--slate); line-height: 1.6; }
      .challenge-fix { font-size: 13px; font-weight: 700; color: var(--blue); margin-top: 10px; display: flex; align-items: center; gap: 4px; }

      /* ── FAQ ──────────────────────────────────────── */
      .faq { padding: 100px 0; }
      .faq-list { max-width: 720px; margin: 48px auto 0; }
      .faq-item { border-bottom: 1px solid #e5e7eb; }
      .faq-q {
        display: flex; justify-content: space-between; align-items: center;
        padding: 20px 0; cursor: pointer; background: none; border: none;
        width: 100%; text-align: left; font-size: 16px; font-weight: 700;
        color: #1f2937; font-family: inherit; transition: color .15s;
      }
      .faq-q:hover { color: var(--blue); }
      .faq-q svg { flex-shrink: 0; transition: transform .2s; color: var(--slate); }
      .faq-q.open svg { transform: rotate(45deg); }
      .faq-a {
        max-height: 0; overflow: hidden; transition: max-height .3s ease, padding .3s ease;
        font-size: 15px; color: var(--slate); line-height: 1.7;
      }
      .faq-a.open { max-height: 200px; padding-bottom: 20px; }

      /* ── CTA ─────────────────────────────────────── */
      .cta {
        padding: 80px 0;
        background: linear-gradient(135deg, var(--navy) 0%, #1a3a6b 100%);
        color: #fff; text-align: center;
      }
      .cta h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 900; margin-bottom: 12px; }
      .cta p { font-size: 17px; color: rgba(255,255,255,.6); margin-bottom: 36px; max-width: 500px; margin-left: auto; margin-right: auto; }
      .cta-buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
      .cta-contact {
        margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,.1);
        display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;
      }
      .cta-contact a { color: rgba(255,255,255,.55); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .15s; }
      .cta-contact a:hover { color: #fff; }

      /* ── FOOTER ──────────────────────────────────── */
      .footer { padding: 40px 0 32px; background: #0a1628; }
      .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
      .footer-brand { display: flex; align-items: center; gap: 10px; }
      .footer p { font-size: 13px; color: rgba(255,255,255,.3); }
      .footer a { color: rgba(255,255,255,.45); text-decoration: none; transition: color .15s; }
      .footer a:hover { color: rgba(255,255,255,.7); }
      .footer-links { display: flex; gap: 24px; }
      .footer-links a { font-size: 13px; }

      /* ── RESPONSIVE ──────────────────────────────── */
      @media (max-width: 900px) {
        .hero .container { grid-template-columns: 1fr; text-align: center; padding-top: 110px; }
        .hero-text p { margin-left: auto; margin-right: auto; }
        .hero-buttons { justify-content: center; }
        .hero-stats { justify-content: center; }
        .hero-visual { display: none; }
        .pain-grid { grid-template-columns: 1fr; }
        .features-grid { grid-template-columns: 1fr; }
        .audience-grid { grid-template-columns: 1fr; }
        .pricing-cards { grid-template-columns: 1fr 1fr; max-width: 520px; }
        .challenges-grid { grid-template-columns: 1fr; }
        .nav-links { display: none !important; }
        .nav-hamburger { display: block !important; }
        .proof-grid { gap: 32px; }
        .footer-inner { flex-direction: column; text-align: center; }
        .footer-links { justify-content: center; }
      }
      @media (max-width: 600px) {
        .hero .container { padding-top: 100px; min-height: 80vh; }
        .section-sub { font-size: 15px; }
        .cta-contact { flex-direction: column; gap: 16px; align-items: center; }
        .pricing-cards { grid-template-columns: 1fr !important; max-width: 360px !important; }
        .proof-grid { gap: 20px; }
        .proof-number { font-size: 26px; }
      }

      /* ── ANIMATIONS ──────────────────────────────── */
      @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
      .animate { opacity: 0; animation: fadeUp .6s cubic-bezier(.16,1,.3,1) forwards; }
      .delay-1 { animation-delay: .1s; }
      .delay-2 { animation-delay: .2s; }
      .delay-3 { animation-delay: .3s; }
      .delay-4 { animation-delay: .4s; }
    `;
    document.head.appendChild(styleTag);

    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.style.animationPlayState = 'running';
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.animate').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });

    return () => { window.removeEventListener('scroll', handleScroll); observer.disconnect(); };
  }, []);

  // Close mobile menu on anchor click
  const navClick = () => setMobileMenu(false);

  const faqs = [
    { q: 'How long does it take to set up Skolo for my school?', a: 'Most schools are up and running within a day. You register, add your grades and classes, import your learner list (CSV or manual entry), and you\u2019re ready. Our team can also help you get set up for free.' },
    { q: 'Does it work on phones and tablets?', a: 'Yes. Skolo is a Progressive Web App (PWA) that works on any device with a browser \u2014 Android, iPhone, tablet, laptop, or desktop. No app store download needed. It even works offline for key features.' },
    { q: 'What if we lose internet during the school day?', a: 'Skolo caches critical data on your device. Attendance and basic lookups continue to work offline. Changes sync automatically once you\u2019re back online.' },
    { q: 'Can parents see their child\u2019s information?', a: 'Yes. The Parent Portal gives guardians secure access to view fees, attendance, grades, and announcements. They can also message teachers directly through the built-in messaging system.' },
    { q: 'Is our school\u2019s data safe?', a: 'Absolutely. All data is encrypted in transit and at rest. Each school\u2019s data is completely isolated \u2014 no school can ever see another\u2019s information. We use Supabase (built on PostgreSQL) with row-level security.' },
    { q: 'Can I try it before committing?', a: 'Yes \u2014 every school gets a 30-day free trial with full access to all features. No credit card required. If you\u2019re not convinced, you can walk away with no obligations.' },
  ];

  return (
    <>
      {/* ═══════ NAV ═══════ */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="/" className="nav-logo">
            <img src="/skolo-logo-navy.svg" alt="Skolo \u2014 One platform. Whole school." style={{ height:88, objectFit:'contain', borderRadius:10 }} />
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contact</a>
            <Link to="/login" className="nav-signin" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>Sign in</Link>
            <Link to="/request-demo" className="btn btn-primary nav-cta">Request a Demo</Link>
          </div>
          <button className="nav-hamburger" onClick={() => setMobileMenu(true)} aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        </div>
      </nav>

      {/* ═══════ MOBILE MENU ═══════ */}
      <div className={`mobile-menu ${mobileMenu ? 'open' : ''}`}>
        <button className="mobile-menu-close" onClick={() => setMobileMenu(false)} aria-label="Close menu">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <a href="#features" onClick={navClick}>Features</a>
        <a href="#pricing" onClick={navClick}>Pricing</a>
        <a href="#faq" onClick={navClick}>FAQ</a>
        <a href="#contact" onClick={navClick}>Contact</a>
        <Link to="/login" onClick={navClick}>Sign in</Link>
        <Link to="/request-demo" onClick={navClick} className="btn btn-primary" style={{ marginTop: 8 }}>Request a Demo</Link>
      </div>

      {/* ═══════ HERO (Modern Academic) ═══════ */}
      <section className="hero">
        <div className="container">
          <div className="hero-text animate">
            <h1>Less admin.<br /><span>More learning.</span></h1>
            <p>The school management platform built for Lesotho and South Africa. Fees, attendance, communication, and academics &mdash; all in one place. Less paperwork for staff, more visibility for parents.</p>
            <div className="hero-buttons">
              <Link to="/request-demo" className="btn btn-amber">
                Request a Demo
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </Link>
              <a href="#demo" className="btn btn-outline">See how it works</a>
            </div>
            <div className="hero-stats">
              <div>
                <div className="hero-stat-num">12</div>
                <div className="hero-stat-label">Schools onboarded</div>
              </div>
              <div>
                <div className="hero-stat-num">3,400+</div>
                <div className="hero-stat-label">Learners managed</div>
              </div>
              <div>
                <div className="hero-stat-num">2</div>
                <div className="hero-stat-label">Countries · Lesotho &amp; SA</div>
              </div>
            </div>
          </div>
          <div className="hero-visual animate delay-2">
            <div className="hero-mockup">
              <div className="mockup-bar">
                <div className="mockup-dot"></div><div className="mockup-dot"></div><div className="mockup-dot"></div>
              </div>
              <div className="mockup-title">Lerato Primary · Dashboard</div>
              <div className="mockup-stats">
                <div className="mockup-stat"><div className="mockup-stat-label">Learners</div><div className="mockup-stat-value">487</div></div>
                <div className="mockup-stat"><div className="mockup-stat-label">Collected</div><div className="mockup-stat-value">M 142,800</div></div>
                <div className="mockup-stat urgent"><div className="mockup-stat-label">Outstanding</div><div className="mockup-stat-value amber">M 28,400</div></div>
                <div className="mockup-stat"><div className="mockup-stat-label">Rate</div><div className="mockup-stat-value">83%</div></div>
              </div>
              <div className="mockup-grades">
                <div style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Collection by grade</div>
                <div className="mockup-grade-row">
                  <div className="mockup-grade-label">Grade 1</div>
                  <div className="mockup-grade-bar"><div className="mockup-grade-fill" style={{ background:'var(--green)', width:'88%' }}></div></div>
                  <div className="mockup-grade-pct">88%</div>
                </div>
                <div className="mockup-grade-row">
                  <div className="mockup-grade-label">Grade 2</div>
                  <div className="mockup-grade-bar"><div className="mockup-grade-fill" style={{ background:'var(--amber)', width:'71%' }}></div></div>
                  <div className="mockup-grade-pct">71%</div>
                </div>
                <div className="mockup-grade-row">
                  <div className="mockup-grade-label">Grade 3</div>
                  <div className="mockup-grade-bar"><div className="mockup-grade-fill" style={{ background:'var(--green)', width:'91%' }}></div></div>
                  <div className="mockup-grade-pct">91%</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PAIN POINTS ═══════ */}
      <section className="pain">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">The problem</span>
            <h2 className="section-title">Running a school shouldn&rsquo;t<br />mean drowning in paperwork.</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>Schools across Southern Africa lose time, money, and learners to manual processes. Sound familiar?</p>
          </div>
          <div className="pain-grid">
            <div className="pain-card animate">
              <div className="pain-header">
                <div className="pain-icon red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
                <div className="pain-title">Fee registers in notebooks</div>
              </div>
              <div className="pain-desc">Parents pay, but the record gets lost. Outstanding fees are a guessing game. Cash sits unreconciled for weeks.</div>
            </div>
            <div className="pain-card animate delay-1">
              <div className="pain-header">
                <div className="pain-icon amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg></div>
                <div className="pain-title">Attendance on loose sheets</div>
              </div>
              <div className="pain-desc">Paper registers get lost, misfiled, or never collected. You only discover a learner&rsquo;s absence problem at year-end.</div>
            </div>
            <div className="pain-card animate delay-2">
              <div className="pain-header">
                <div className="pain-icon slate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
                <div className="pain-title">No real-time picture</div>
              </div>
              <div className="pain-desc">Principals can&rsquo;t see how the school is performing without chasing teachers and bursars for manual reports.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DEMO VIDEO ═══════ */}
      <section className="demo-video" id="demo">
        <div className="container">
          <span className="section-label">See it in action</span>
          <h2 className="section-title">Watch how Skolo works</h2>
          <p className="section-sub" style={{ margin:'0 auto' }}>See how schools in Lesotho and South Africa are using Skolo to manage fees, attendance, grades, and more.</p>
          <div className="video-wrapper">
            <video controls preload="metadata"><source src="/skolo-promo.mp4" type="video/mp4" /></video>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="features" id="features">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">Features</span>
            <h2 className="section-title">Everything you need.<br />Nothing you don&rsquo;t.</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>Skolo replaces the spreadsheets, registers, and WhatsApp groups with one clean system your whole staff can use.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: 'blue', title: 'Fee management', desc: 'Track who owes what, record payments instantly, auto-generate monthly fee entries, and see collection rates by grade \u2014 in real time.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#003049" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
              { icon: 'green', title: 'Daily attendance', desc: 'Teachers mark registers on their phone in under a minute. Principals see school-wide rates and get alerts for learners falling behind.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
              { icon: 'purple', title: 'Exam grades & report cards', desc: 'Enter marks by subject and term. Averages calculate automatically. Download PDF report cards for each learner with one click.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
              { icon: 'amber', title: 'Timetable & calendar', desc: 'Build your school timetable in minutes. Teachers see their daily schedule with live indicators. Never double-book a class.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
              { icon: 'rose', title: 'Messaging & SMS', desc: 'Built-in messaging between staff and parents. Post announcements to specific grades. Optionally blast via SMS \u2014 no more lost circulars.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { icon: 'cyan', title: 'Parent portal', desc: 'Give parents a secure portal to view fees, attendance, grades, and message teachers. No app download needed \u2014 works on any phone.', svg: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            ].map((f, i) => (
              <div key={i} className={`feature-card animate ${i > 0 ? `delay-${Math.min(i, 4)}` : ''}`}>
                <div className={`feature-icon ${f.icon}`}>{f.svg}</div>
                <div><div className="feature-title">{f.title}</div><div className="feature-desc">{f.desc}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ AI ═══════ */}
      <section style={{ padding:'100px 0', background:'linear-gradient(135deg,#003049 0%,#162d5a 100%)', color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 30%,rgba(124,58,237,.15) 0%,transparent 60%),radial-gradient(ellipse at 30% 70%,rgba(0,48,73,.1) 0%,transparent 50%)' }}></div>
        <div className="container" style={{ position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center' }}>
            <span className="section-label" style={{ background:'rgba(124,58,237,.2)', color:'#c4b5fd' }}>AI-powered</span>
            <h2 className="section-title" style={{ color:'#fff' }}>Smart tools that learn<br />with your school.</h2>
            <p className="section-sub" style={{ margin:'0 auto', color:'rgba(255,255,255,.55)' }}>Skolo doesn&rsquo;t just store data &mdash; it works with it. Our AI layer turns your school&rsquo;s information into insights, predictions, and automation.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'20px', marginTop:'48px' }}>
            {[
              { title: 'Early warning alerts', desc: 'AI spots learners at risk of dropping out based on attendance patterns, fee arrears, and grade trends \u2014 before it\u2019s too late.', color: '#c4b5fd', bg: 'rgba(124,58,237,.2)', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg> },
              { title: 'Smart reports', desc: 'Ask questions in plain English: \u201CWhich grade has the lowest attendance this term?\u201D \u2014 no spreadsheets, no formulas.', color: '#c6dae7', bg: 'rgba(0,48,73,.2)', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c6dae7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
              { title: 'Automated parent comms', desc: 'AI drafts personalised fee reminders, absence follow-ups, and term-end summaries \u2014 saving hours each week.', color: '#86efac', bg: 'rgba(22,163,74,.2)', svg: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg> },
            ].map((item, i) => (
              <div key={i} className={`animate delay-${i+1}`} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:'14px', padding:'28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                  <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:item.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>{item.svg}</div>
                  <div style={{ fontSize:'16px', fontWeight:'800' }}>{item.title}</div>
                </div>
                <div style={{ fontSize:'14px', color:'rgba(255,255,255,.5)', lineHeight:'1.7' }}>{item.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', marginTop:'40px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'20px', padding:'8px 18px', fontSize:'13px', color:'rgba(255,255,255,.45)', fontWeight:'600' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
              Available on the Skolo AI plan
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ AUDIENCE ═══════ */}
      <section className="audience">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">Built for</span>
            <h2 className="section-title">Whether you run one school<br />or support hundreds.</h2>
          </div>
          <div className="audience-grid">
            <div className="audience-card animate">
              <h3 style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#003049" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                School leaders
              </h3>
              <p style={{ fontSize:'14px', color:'var(--slate)', marginBottom:'18px' }}>Principals, bursars, and admin staff who want to spend less time on paperwork and more time on teaching.</p>
              <ul className="audience-list">
                <li>See your whole school&rsquo;s performance at a glance</li>
                <li>Know exactly who owes fees and how much</li>
                <li>Track attendance trends before problems become crises</li>
                <li>Generate report cards in seconds, not days</li>
                <li>Works on phones, tablets, and computers</li>
              </ul>
            </div>
            <div className="audience-card animate delay-1">
              <h3 style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Education organisations
              </h3>
              <p style={{ fontSize:'14px', color:'var(--slate)', marginBottom:'18px' }}>Government departments, NGOs, and school groups that need visibility across multiple institutions.</p>
              <ul className="audience-list">
                <li>Monitor attendance and fee collection across schools</li>
                <li>Standardise record-keeping and reporting</li>
                <li>Reduce data gaps with real-time digital records</li>
                <li>Support under-resourced schools with simple tools</li>
                <li>No hardware or IT infrastructure required</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CHALLENGES SKOLO SOLVES ═══════ */}
      <section className="challenges">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">Why it matters</span>
            <h2 className="section-title">The reality in Southern<br />African schools.</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>These aren&rsquo;t hypotheticals &mdash; they&rsquo;re the daily struggles school leaders face. Skolo was built to fix every one of them.</p>
          </div>
          <div className="challenges-grid">
            <div className="challenge-card animate">
              <div className="challenge-stat" style={{ color:'var(--red)' }}>40%</div>
              <div>
                <div className="challenge-title">Fee collection shortfall</div>
                <div className="challenge-desc">Many schools collect less than 60% of fees owed each term. Without real-time tracking, outstanding balances pile up unnoticed until it&rsquo;s too late.</div>
                <div className="challenge-fix">&rarr; Skolo&rsquo;s smart ledger tracks every payment and flags overdue accounts instantly</div>
              </div>
            </div>
            <div className="challenge-card animate delay-1">
              <div className="challenge-stat" style={{ color:'var(--amber)' }}>15+</div>
              <div>
                <div className="challenge-title">Minutes lost per class on attendance</div>
                <div className="challenge-desc">Paper registers eat into teaching time. Sheets go missing. Principals only learn about chronic absenteeism at year-end &mdash; when it&rsquo;s too late to intervene.</div>
                <div className="challenge-fix">&rarr; Teachers mark attendance on their phone in under 30 seconds</div>
              </div>
            </div>
            <div className="challenge-card animate delay-2">
              <div className="challenge-stat" style={{ color:'var(--purple)' }}>0</div>
              <div>
                <div className="challenge-title">Real-time visibility for principals</div>
                <div className="challenge-desc">School leaders rely on end-of-term paper reports. There&rsquo;s no way to see today&rsquo;s attendance, this week&rsquo;s fee collection, or which learners are falling behind &mdash; until someone compiles it manually.</div>
                <div className="challenge-fix">&rarr; Live dashboards with KPIs, trends, and early warning alerts</div>
              </div>
            </div>
            <div className="challenge-card animate delay-3">
              <div className="challenge-stat" style={{ color:'var(--blue)' }}>72%</div>
              <div>
                <div className="challenge-title">Parents left in the dark</div>
                <div className="challenge-desc">Most parents in Lesotho and South Africa have no easy way to check their child&rsquo;s fees, grades, or attendance. Communication relies on handwritten notes and WhatsApp groups.</div>
                <div className="challenge-fix">&rarr; Parent Portal with fees, grades, attendance &amp; direct messaging</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ PRICING ═══════ */}
      <section className="pricing" id="pricing">
        <div className="container">
          <span className="section-label">Pricing</span>
          <h2 className="section-title">Start free. Upgrade when you&rsquo;re ready.</h2>
          <p className="section-sub" style={{ margin:'0 auto' }}>Every school gets a 30-day free trial with full access. No credit card required.</p>
          <div className="pricing-cards">
            <div className="pricing-card animate">
              <div className="pricing-name">Free trial</div>
              <div className="pricing-price">Free</div>
              <div className="pricing-period">30 days &middot; full access</div>
              <ul className="pricing-features">
                <li>Up to 50 learners</li>
                <li>Fee tracking</li>
                <li>Attendance</li>
                <li>Announcements</li>
                <li>No credit card needed</li>
              </ul>
              <Link to="/request-demo" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Get Started</Link>
            </div>
            <div className="pricing-card featured animate delay-1">
              <div className="pricing-badge">MOST POPULAR</div>
              <div className="pricing-name">Standard</div>
              <div className="pricing-price">M800<span style={{ fontSize:'16px', fontWeight:'600', color:'var(--slate)' }}>/mo</span></div>
              <div className="pricing-period">billed monthly</div>
              <ul className="pricing-features">
                <li>Unlimited learners</li>
                <li>Everything in Free</li>
                <li>Exam grades &amp; report cards</li>
                <li>Timetable system</li>
                <li>Parent portal</li>
              </ul>
              <Link to="/request-demo" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Request a Demo</Link>
            </div>
            <div className="pricing-card animate delay-2">
              <div className="pricing-name">Pro</div>
              <div className="pricing-price">M1,150<span style={{ fontSize:'16px', fontWeight:'600', color:'var(--slate)' }}>/mo</span></div>
              <div className="pricing-period">billed monthly</div>
              <ul className="pricing-features">
                <li>Everything in Standard</li>
                <li>SMS announcements</li>
                <li>Waiver workflow</li>
                <li>Awards &amp; staff notes</li>
                <li>Priority support</li>
              </ul>
              <Link to="/request-demo" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Request a Demo</Link>
            </div>
            <div className="pricing-card animate delay-3" style={{ borderColor:'#7c3aed', background:'linear-gradient(180deg,#faf5ff 0%,#fff 100%)' }}>
              <div className="pricing-badge" style={{ background:'#7c3aed' }}>AI-POWERED</div>
              <div className="pricing-name" style={{ color:'#7c3aed' }}>Skolo AI</div>
              <div className="pricing-price">M1,450<span style={{ fontSize:'16px', fontWeight:'600', color:'var(--slate)' }}>/mo</span></div>
              <div className="pricing-period">billed monthly</div>
              <ul className="pricing-features">
                <li>Everything in Pro</li>
                <li>AI early warning alerts</li>
                <li>Smart reports &amp; insights</li>
                <li>Automated parent comms</li>
                <li>Natural language queries</li>
              </ul>
              <Link to="/request-demo" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', background:'#7c3aed' }}>Request a Demo</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FAQ ═══════ */}
      <section className="faq" id="faq">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">FAQ</span>
            <h2 className="section-title">Common questions.</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div key={i} className="faq-item">
                <button className={`faq-q ${openFaq === i ? 'open' : ''}`} onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <div className={`faq-a ${openFaq === i ? 'open' : ''}`}>{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="cta" id="contact">
        <div className="container">
          <h2 className="animate">Ready to simplify your school?</h2>
          <p className="animate delay-1">Join schools across Lesotho and South Africa already using Skolo to save time, collect fees faster, and give parents peace of mind.</p>
          <div className="cta-buttons animate delay-2">
            <Link to="/request-demo" className="btn btn-green">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Request a Demo
            </Link>
            <a href="https://wa.me/27761080024?text=Hi%2C%20I'm%20interested%20in%20Skolo%20for%20my%20school." className="btn btn-outline">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              Chat on WhatsApp
            </a>
          </div>
          <div className="cta-contact animate delay-3">
            <a href="mailto:info@4dcs.co.za">info@4dcs.co.za</a>
            <a href="tel:+26656300091">+266 5630 0091</a>
            <a href="tel:+27761080024">+27 (0) 76 108 0024</a>
            <a href="https://myskolo.co.za">myskolo.co.za</a>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="footer">
        <div className="container">
          <div className="footer-inner">
            <div className="footer-brand">
              <img src="/skolo-icon-white.svg" alt="Skolo" style={{ height:28, width:28, borderRadius:6 }} />
              <p>&copy; 2026 Skolo &middot; Developed by <a href="https://innovaearth.com" target="_blank" rel="noopener noreferrer">InnovaEarth</a> in collaboration with <a href="https://4dcs.co.za" target="_blank" rel="noopener noreferrer">4D Climate Solutions</a> &middot; Built in Lesotho, for Southern Africa.</p>
            </div>
            <div className="footer-links">
              <Link to="/login">Sign in</Link>
              <Link to="/request-demo">Request a Demo</Link>
              <a href="mailto:info@4dcs.co.za">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
