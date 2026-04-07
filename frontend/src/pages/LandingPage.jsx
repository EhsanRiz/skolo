import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [animatedElements, setAnimatedElements] = useState(new Set());

  useEffect(() => {
    // Inject CSS styles
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

      :root {
        --navy: #0f2044;
        --navy-light: #1a3160;
        --blue: #2563eb;
        --green: #16a34a;
        --amber: #f59e0b;
        --red: #dc2626;
        --slate: #64748b;
        --light: #f8fafc;
        --white: #ffffff;
      }

      html { scroll-behavior: smooth; }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #0f172a;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
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
      .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,.35); }
      .btn-outline { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,.35); }
      .btn-outline:hover { border-color: #fff; background: rgba(255,255,255,.1); }
      .btn-green { background: var(--green); color: #fff; }
      .btn-green:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(22,163,74,.35); }
      .section-label {
        display: inline-block; font-size: 12px; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        color: var(--blue); background: #eff6ff; padding: 5px 14px;
        border-radius: 20px; margin-bottom: 16px;
      }
      .section-title {
        font-size: clamp(28px, 4vw, 38px); font-weight: 900;
        letter-spacing: -0.5px; line-height: 1.2; margin-bottom: 16px;
      }
      .section-sub { font-size: 17px; color: var(--slate); max-width: 600px; line-height: 1.7; }

      /* ── HERO ────────────────────────────────────── */
      .hero {
        background: linear-gradient(135deg, var(--navy) 0%, #162d5a 50%, #1a3a6b 100%);
        color: #fff; padding: 0; overflow: hidden; position: relative;
      }
      .hero::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(ellipse at 80% 20%, rgba(37,99,235,.15) 0%, transparent 60%),
                    radial-gradient(ellipse at 20% 80%, rgba(22,163,74,.1) 0%, transparent 50%);
      }
      .hero .container {
        position: relative; z-index: 1;
        display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
        align-items: center; min-height: 92vh; padding-top: 80px; padding-bottom: 60px;
      }
      .hero-text h1 {
        font-size: clamp(36px, 5vw, 56px); font-weight: 900;
        letter-spacing: -1px; line-height: 1.1; margin-bottom: 20px;
      }
      .hero-text h1 span { color: var(--blue); }
      .hero-text p { font-size: 18px; color: rgba(255,255,255,.7); line-height: 1.7; margin-bottom: 32px; max-width: 480px; }
      .hero-buttons { display: flex; gap: 12px; flex-wrap: wrap; }
      .hero-visual {
        display: flex; justify-content: center; align-items: center;
      }
      .hero-mockup {
        width: 100%; max-width: 520px;
        background: rgba(255,255,255,.07); border-radius: 16px;
        border: 1px solid rgba(255,255,255,.1);
        padding: 24px; backdrop-filter: blur(8px);
      }
      .mockup-bar {
        display: flex; gap: 6px; margin-bottom: 18px;
      }
      .mockup-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,.2); }
      .mockup-dot:first-child { background: #ef4444; }
      .mockup-dot:nth-child(2) { background: #f59e0b; }
      .mockup-dot:nth-child(3) { background: #22c55e; }
      .mockup-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
      .mockup-stat {
        background: rgba(255,255,255,.06); border-radius: 10px; padding: 14px 16px;
        border: 1px solid rgba(255,255,255,.08);
      }
      .mockup-stat-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
      .mockup-stat-value { font-size: 24px; font-weight: 900; color: #fff; }
      .mockup-stat-value.green { color: #4ade80; }
      .mockup-stat-value.blue  { color: #60a5fa; }
      .mockup-stat-value.amber { color: #fbbf24; }
      .mockup-chart { display: flex; align-items: flex-end; gap: 8px; height: 80px; padding-top: 8px; }
      .mockup-bar-item {
        flex: 1; border-radius: 5px 5px 0 0; min-height: 12px;
        transition: height .5s ease;
      }

      /* ── NAV ─────────────────────────────────────── */
      .nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        padding: 16px 0; transition: all .3s;
      }
      .nav.scrolled { background: rgba(15,32,68,.97); backdrop-filter: blur(12px); box-shadow: 0 2px 20px rgba(0,0,0,.15); padding: 10px 0; }
      .nav .container { display: flex; justify-content: space-between; align-items: center; }
      .nav-logo { font-size: 22px; font-weight: 900; color: #fff; text-decoration: none; letter-spacing: -0.5px; }
      .nav-logo span { color: var(--blue); }
      .nav-links { display: flex; align-items: center; gap: 32px; }
      .nav-links a { color: rgba(255,255,255,.7); text-decoration: none; font-size: 14px; font-weight: 600; transition: color .15s; }
      .nav-links a:hover { color: #fff; }
      .nav-cta { padding: 9px 20px !important; font-size: 13px !important; }

      /* ── PAIN POINTS ─────────────────────────────── */
      .pain { padding: 100px 0; background: var(--light); }
      .pain-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 48px; }
      .pain-card {
        background: #fff; border-radius: 14px; padding: 28px;
        box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1.5px solid #e2e8f0;
        transition: all .2s;
      }
      .pain-card:hover { transform: translateY(-3px); box-shadow: 0 8px 30px rgba(0,0,0,.08); border-color: #cbd5e1; }
      .pain-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
      .pain-icon {
        width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
        display: flex; align-items: center; justify-content: center;
      }
      .pain-icon svg { width: 20px; height: 20px; stroke-width: 1.8; }
      .pain-icon.red    { background: #fee2e2; color: #dc2626; }
      .pain-icon.amber  { background: #fef3c7; color: #d97706; }
      .pain-icon.slate  { background: #e2e8f0; color: #475569; }
      .pain-title { font-size: 16px; font-weight: 800; color: #0f172a; }
      .pain-desc { font-size: 14px; color: var(--slate); line-height: 1.7; }

      /* ── FEATURES ────────────────────────────────── */
      .features { padding: 100px 0; }
      .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 48px; }
      .feature-card {
        display: flex; gap: 18px; padding: 24px;
        background: var(--light); border-radius: 14px;
        border: 1.5px solid #e2e8f0; transition: all .2s;
      }
      .feature-card:hover { border-color: var(--blue); background: #eff6ff; }
      .feature-icon {
        width: 48px; height: 48px; border-radius: 12px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; flex-shrink: 0;
      }
      .feature-icon.blue   { background: #dbeafe; }
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
        box-shadow: 0 1px 3px rgba(0,0,0,.06); border: 1.5px solid #e2e8f0;
      }
      .audience-card h3 { font-size: 20px; font-weight: 800; margin-bottom: 16px; }
      .audience-list { list-style: none; }
      .audience-list li {
        padding: 8px 0; font-size: 15px; color: #374151;
        display: flex; align-items: flex-start; gap: 10px;
      }
      .audience-list li::before { content: '✓'; color: var(--green); font-weight: 800; flex-shrink: 0; margin-top: 1px; }

      /* ── PRICING TEASER ──────────────────────────── */
      .pricing { padding: 100px 0; text-align: center; }
      .pricing-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 48px; max-width: 1040px; margin-left: auto; margin-right: auto; }
      .pricing-card {
        background: #fff; border-radius: 16px; padding: 32px 28px;
        border: 2px solid #e2e8f0; text-align: center; transition: all .2s;
      }
      .pricing-card.featured { border-color: var(--blue); box-shadow: 0 8px 30px rgba(37,99,235,.12); position: relative; }
      .pricing-badge {
        position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
        background: var(--blue); color: #fff; font-size: 11px; font-weight: 700;
        padding: 4px 14px; border-radius: 20px; letter-spacing: .5px;
      }
      .pricing-name { font-size: 14px; font-weight: 700; color: var(--slate); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
      .pricing-price { font-size: 36px; font-weight: 900; color: #0f172a; margin-bottom: 4px; }
      .pricing-period { font-size: 13px; color: var(--slate); margin-bottom: 20px; }
      .pricing-features { list-style: none; text-align: left; margin-bottom: 24px; }
      .pricing-features li { padding: 6px 0; font-size: 14px; color: #374151; display: flex; gap: 8px; align-items: flex-start; }
      .pricing-features li::before { content: '✓'; color: var(--green); font-weight: 700; }

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
        width: 100%; height: 100%; object-fit: cover;
        border-radius: 16px;
      }
      .video-wrapper iframe {
        position: absolute; top: 0; left: 0;
        width: 100%; height: 100%; border: none;
      }

      /* ── CTA ─────────────────────────────────────── */
      .cta {
        padding: 80px 0;
        background: linear-gradient(135deg, var(--navy) 0%, #1a3a6b 100%);
        color: #fff; text-align: center;
      }
      .cta h2 { font-size: clamp(28px, 4vw, 40px); font-weight: 900; margin-bottom: 12px; }
      .cta p { font-size: 17px; color: rgba(255,255,255,.65); margin-bottom: 36px; max-width: 500px; margin-left: auto; margin-right: auto; }
      .cta-buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
      .cta-contact {
        margin-top: 40px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,.12);
        display: flex; justify-content: center; gap: 40px; flex-wrap: wrap;
      }
      .cta-contact a { color: rgba(255,255,255,.6); text-decoration: none; font-size: 14px; font-weight: 500; transition: color .15s; }
      .cta-contact a:hover { color: #fff; }

      /* ── FOOTER ──────────────────────────────────── */
      .footer { padding: 32px 0; background: #0a1628; text-align: center; }
      .footer p { font-size: 13px; color: rgba(255,255,255,.35); }
      .footer a { color: rgba(255,255,255,.5); text-decoration: none; }

      /* ── RESPONSIVE ──────────────────────────────── */
      @media (max-width: 900px) {
        .hero .container { grid-template-columns: 1fr; text-align: center; padding-top: 100px; }
        .hero-text p { margin-left: auto; margin-right: auto; }
        .hero-buttons { justify-content: center; }
        .hero-visual { display: none; }
        .pain-grid { grid-template-columns: 1fr; }
        .features-grid { grid-template-columns: 1fr; }
        .audience-grid { grid-template-columns: 1fr; }
        .pricing-cards { grid-template-columns: 1fr 1fr; max-width: 520px; }
        .nav-links a:not(.btn) { display: none; }
      }
      @media (max-width: 600px) {
        .hero .container { padding-top: 90px; min-height: 80vh; }
        .section-sub { font-size: 15px; }
        .cta-contact { flex-direction: column; gap: 16px; align-items: center; }
        .pricing-cards { grid-template-columns: 1fr !important; max-width: 340px !important; }
      }
      @media (max-width: 900px) {
        .ai-section .container > div:nth-child(2) { grid-template-columns: 1fr !important; }
      }

      /* ── ANIMATIONS ──────────────────────────────── */
      @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      .animate { opacity: 0; animation: fadeUp .6s ease forwards; }
      .delay-1 { animation-delay: .1s; }
      .delay-2 { animation-delay: .2s; }
      .delay-3 { animation-delay: .3s; }
      .delay-4 { animation-delay: .4s; }
    `;
    document.head.appendChild(styleTag);

    // Scroll nav background
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };

    window.addEventListener('scroll', handleScroll);

    // Animate on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.animationPlayState = 'running';
          setAnimatedElements(prev => new Set(prev).add(e.target));
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.animate').forEach(el => {
      el.style.animationPlayState = 'paused';
      observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* ═══════ NAV ═══════ */}
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <a href="/" className="nav-logo" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <img src="/skolo-icon-white.svg" alt="" style={{ height:32, width:32, borderRadius:7 }} />
            skolo<span>.</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
            <Link to="/login" style={{ color: 'rgba(255,255,255,.7)', textDecoration: 'none', fontSize: '14px', fontWeight: '600', transition: 'color .15s' }}>Already a user? Sign in</Link>
            <Link to="/request-demo" className="btn btn-primary nav-cta">Request a Demo</Link>
          </div>
        </div>
      </nav>

      {/* ═══════ HERO ═══════ */}
      <section className="hero">
        <div className="container">
          <div className="hero-text animate">
            <h1>Run your school<br /><span>without the chaos.</span></h1>
            <img src="/skolo-logo-navy.svg" alt="Skolo — One platform. Whole school." style={{ height:56, objectFit:'contain', borderRadius:10, marginBottom:20 }} />
            <p>Skolo is an AI-powered school management platform built for schools in Lesotho and South Africa. Track fees, attendance, grades, and timetables — with smart insights that help you act before problems grow.</p>
            <div className="hero-buttons">
              <Link to="/request-demo" className="btn btn-primary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Request a Demo
              </Link>
              <a href="#demo" className="btn btn-outline">See how it works</a>
            </div>
          </div>
          <div className="hero-visual animate delay-2">
            <div className="hero-mockup">
              <div className="mockup-bar">
                <div className="mockup-dot"></div><div className="mockup-dot"></div><div className="mockup-dot"></div>
              </div>
              <div className="mockup-stats">
                <div className="mockup-stat">
                  <div className="mockup-stat-label">Learners</div>
                  <div className="mockup-stat-value">247</div>
                </div>
                <div className="mockup-stat">
                  <div className="mockup-stat-label">Collection rate</div>
                  <div className="mockup-stat-value green">89%</div>
                </div>
                <div className="mockup-stat">
                  <div className="mockup-stat-label">Attendance</div>
                  <div className="mockup-stat-value blue">94%</div>
                </div>
                <div className="mockup-stat">
                  <div className="mockup-stat-label">Outstanding</div>
                  <div className="mockup-stat-value amber">R12,400</div>
                </div>
              </div>
              <div style={{ fontSize:'10px', fontWeight:'700', color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'10px' }}>Monthly collection</div>
              <div className="mockup-chart">
                <div className="mockup-bar-item" style={{ height:'45%', background:'rgba(37,99,235,.3)' }}></div>
                <div className="mockup-bar-item" style={{ height:'55%', background:'rgba(37,99,235,.4)' }}></div>
                <div className="mockup-bar-item" style={{ height:'65%', background:'rgba(37,99,235,.5)' }}></div>
                <div className="mockup-bar-item" style={{ height:'50%', background:'rgba(37,99,235,.4)' }}></div>
                <div className="mockup-bar-item" style={{ height:'75%', background:'rgba(37,99,235,.6)' }}></div>
                <div className="mockup-bar-item" style={{ height:'90%', background:'rgba(37,99,235,.8)' }}></div>
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
            <h2 className="section-title">Running a school shouldn't<br />mean drowning in paperwork.</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>Schools across Southern Africa lose time, money, and learners to manual processes. Sound familiar?</p>
          </div>
          <div className="pain-grid">
            <div className="pain-card animate">
              <div className="pain-header">
                <div className="pain-icon red">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="6" x2="12" y2="6.01"/></svg>
                </div>
                <div className="pain-title">Fee registers in notebooks</div>
              </div>
              <div className="pain-desc">Parents pay, but the record gets lost. Outstanding fees are a guessing game. Cash sits unreconciled for weeks.</div>
            </div>
            <div className="pain-card animate delay-1">
              <div className="pain-header">
                <div className="pain-icon amber">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
                </div>
                <div className="pain-title">Attendance on loose sheets</div>
              </div>
              <div className="pain-desc">Paper registers get lost, misfiled, or never collected. You only discover a learner's absence problem at year-end.</div>
            </div>
            <div className="pain-card animate delay-2">
              <div className="pain-header">
                <div className="pain-icon slate">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div className="pain-title">No real-time picture</div>
              </div>
              <div className="pain-desc">Principals can't see how the school is performing without chasing teachers and bursars for manual reports.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ DEMO VIDEO ═══════ */}
      <section className="demo-video" id="demo">
        <div className="container">
          <span className="section-label">See it in action</span>
          <h2 className="section-title">Watch how Skolo works</h2>
          <p className="section-sub" style={{ margin:'0 auto' }}>See how schools in Lesotho and South Africa are using Skolo to manage fees, attendance, grades, and more — all from one platform.</p>
          <div className="video-wrapper">
            <video controls preload="metadata" poster="">
              <source src="/skolo-promo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </section>

      {/* ═══════ FEATURES ═══════ */}
      <section className="features" id="features">
        <div className="container">
          <div style={{ textAlign:'center' }}>
            <span className="section-label">Features</span>
            <h2 className="section-title">Everything you need.<br />Nothing you don't.</h2>
            <p className="section-sub" style={{ margin:'0 auto' }}>Skolo replaces the spreadsheets, registers, and WhatsApp groups with one clean system your whole staff can use.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card animate">
              <div className="feature-icon blue">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </div>
              <div>
                <div className="feature-title">Fee management</div>
                <div className="feature-desc">Track who owes what, record payments instantly, auto-generate monthly fee entries, and see collection rates by grade — in real time.</div>
              </div>
            </div>
            <div className="feature-card animate delay-1">
              <div className="feature-icon green">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              </div>
              <div>
                <div className="feature-title">Daily attendance</div>
                <div className="feature-desc">Teachers mark registers on their phone in under a minute. Principals see school-wide rates and get alerts for learners falling behind.</div>
              </div>
            </div>
            <div className="feature-card animate delay-1">
              <div className="feature-icon purple">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </div>
              <div>
                <div className="feature-title">Exam grades &amp; report cards</div>
                <div className="feature-desc">Enter marks by subject and term. Averages calculate automatically. Download PDF report cards for each learner with one click.</div>
              </div>
            </div>
            <div className="feature-card animate delay-2">
              <div className="feature-icon amber">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div>
                <div className="feature-title">Timetable &amp; calendar</div>
                <div className="feature-desc">Build your school timetable in minutes. Teachers see their daily schedule with live "now" indicators. Never double-book a class.</div>
              </div>
            </div>
            <div className="feature-card animate delay-2">
              <div className="feature-icon rose">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <div className="feature-title">Announcements &amp; SMS</div>
                <div className="feature-desc">Post announcements to all staff or specific grades. Optionally blast parents via SMS — no more lost circulars.</div>
              </div>
            </div>
            <div className="feature-card animate delay-3">
              <div className="feature-icon cyan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div>
                <div className="feature-title">Parent portal</div>
                <div className="feature-desc">Give parents a secure link to view their child's fees, attendance, and report cards. No app download needed — works on any phone browser.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ AI ═══════ */}
      <section className="ai-section" style={{ padding:'100px 0', background:'linear-gradient(135deg,#0f2044 0%,#162d5a 100%)', color:'#fff', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 30%,rgba(124,58,237,.15) 0%,transparent 60%),radial-gradient(ellipse at 30% 70%,rgba(37,99,235,.1) 0%,transparent 50%)' }}></div>
        <div className="container" style={{ position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center' }}>
            <span className="section-label" style={{ background:'rgba(124,58,237,.2)', color:'#c4b5fd' }}>AI-powered</span>
            <h2 className="section-title" style={{ color:'#fff' }}>Smart tools that learn<br />with your school.</h2>
            <p className="section-sub" style={{ margin:'0 auto', color:'rgba(255,255,255,.6)' }}>Skolo doesn't just store data — it works with it. Our AI layer turns your school's information into insights, predictions, and time-saving automation.</p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px', marginTop:'48px' }}>
            <div className="animate" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', padding:'28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(124,58,237,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>
                </div>
                <div style={{ fontSize:'16px', fontWeight:'800' }}>Early warning alerts</div>
              </div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,.55)', lineHeight:'1.7' }}>AI spots learners at risk of dropping out based on attendance patterns, fee arrears, and grade trends — before it's too late to act.</div>
            </div>
            <div className="animate delay-1" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', padding:'28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(37,99,235,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div style={{ fontSize:'16px', fontWeight:'800' }}>Smart reports</div>
              </div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,.55)', lineHeight:'1.7' }}>Ask questions in plain English and get instant answers: "Which grade has the lowest attendance this term?" — no spreadsheets, no formulas.</div>
            </div>
            <div className="animate delay-2" style={{ background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', borderRadius:'14px', padding:'28px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'14px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'rgba(22,163,74,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                </div>
                <div style={{ fontSize:'16px', fontWeight:'800' }}>Automated parent comms</div>
              </div>
              <div style={{ fontSize:'14px', color:'rgba(255,255,255,.55)', lineHeight:'1.7' }}>AI drafts personalised fee reminders, absence follow-ups, and term-end summaries — saving hours of manual messaging each week.</div>
            </div>
          </div>
          <div style={{ textAlign:'center', marginTop:'40px' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:'20px', padding:'8px 18px', fontSize:'13px', color:'rgba(255,255,255,.5)', fontWeight:'600' }}>
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
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                School leaders
              </h3>
              <p style={{ fontSize:'14px', color:'var(--slate)', marginBottom:'18px' }}>Principals, bursars, and admin staff who want to spend less time on paperwork and more time on teaching.</p>
              <ul className="audience-list">
                <li>See your whole school's performance at a glance</li>
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

      {/* ═══════ PRICING ═══════ */}
      <section className="pricing" id="pricing">
        <div className="container">
          <span className="section-label">Pricing</span>
          <h2 className="section-title">Start free. Upgrade when you're ready.</h2>
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
              <Link to="/request-demo" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }}>Request a Demo</Link>
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
          <img src="/skolo-icon-white.svg" alt="Skolo" style={{ height:36, width:36, borderRadius:8, marginBottom:12 }} />
          <p>&copy; 2026 4D Climate Solutions &middot; <a href="https://4dcs.co.za">4D Climate Solutions</a> &middot; Built in Lesotho, for Southern Africa.</p>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;
