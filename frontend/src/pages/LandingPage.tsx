import React, { useState } from 'react';
import { 
  CreditCard, 
  Wrench, 
  Calendar, 
  Smartphone, 
  Users, 
  CheckCircle2, 
  PhoneCall, 
  MessageSquare, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Sparkles, 
  Download, 
  Send, 
  Award, 
  Check,
  FileText,
  BadgePercent
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const SALES_PHONE = '7812860791';
const SALES_PHONE_DISPLAY = '+91 7812860791';
const CONTACT_EMAIL = 'd.tilakaraaj2003@gmail.com';
const LOCATION_DISPLAY = 'DT Venture, Coimbatore, Tamil Nadu, India';
const WHATSAPP_URL = `https://wa.me/917812860791?text=${encodeURIComponent(
  'Hello SocietyArena Team! I would like to schedule an executive demo and setup pricing for my residential society.'
)}`;

const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Active preview and role states (security/guard completely removed)
  const [activePreviewTab, setActivePreviewTab] = useState<'finance' | 'tickets' | 'amenities'>('finance');
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'resident'>('admin');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Pricing & Estimator states
  const [calcUnits, setCalcUnits] = useState<number>(120);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Demo Form states
  const [demoForm, setDemoForm] = useState({
    societyName: '',
    city: '',
    contactPerson: '',
    phoneNumber: '',
    flatsCount: '',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  // Dynamic pricing calculation
  const getDynamicPricing = (units: number) => {
    if (units <= 50) {
      const monthly = billingCycle === 'annual' ? 899 : 999;
      return {
        plan: 'Starter Plan',
        tierDesc: 'Ideal for boutique apartments & villa communities up to 50 flats',
        ratePerUnit: (monthly / units).toFixed(0),
        monthlyTotal: monthly,
        annualTotal: monthly * 12,
        savingsText: billingCycle === 'annual' ? 'Save ₹1,200/yr with annual billing' : 'Billed monthly'
      };
    } else if (units <= 250) {
      const rate = billingCycle === 'annual' ? 15 : 18;
      const monthly = units * rate;
      return {
        plan: 'Professional Plan',
        tierDesc: 'Best for mid-to-large societies with 51 to 250 flats',
        ratePerUnit: rate.toString(),
        monthlyTotal: monthly,
        annualTotal: monthly * 12,
        savingsText: billingCycle === 'annual' ? 'Save 17% with annual commitment' : 'Flexible monthly billing'
      };
    } else {
      const rate = billingCycle === 'annual' ? 12 : 15;
      const monthly = units * rate;
      return {
        plan: 'Enterprise Plan',
        tierDesc: 'For premium multi-tower townships and 250+ unit layouts',
        ratePerUnit: rate.toString(),
        monthlyTotal: monthly,
        annualTotal: monthly * 12,
        savingsText: billingCycle === 'annual' ? 'Save 20% + Dedicated Account Manager' : 'Volume enterprise tier'
      };
    }
  };

  const dynamicPricing = getDynamicPricing(calcUnits);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    const leadText = `*New SocietyArena Demo & Pricing Inquiry:*\n- Society: ${demoForm.societyName || 'N/A'}\n- City: ${demoForm.city || 'N/A'}\n- Name: ${demoForm.contactPerson}\n- Phone: ${demoForm.phoneNumber}\n- Units: ${demoForm.flatsCount || 'N/A'}\n- Note: ${demoForm.message || 'Interested in platform pricing & setup'}`;
    const dynamicWhatsApp = `https://wa.me/917812860791?text=${encodeURIComponent(leadText)}`;
    
    setTimeout(() => {
      window.open(dynamicWhatsApp, '_blank');
    }, 800);
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'SUPER_ADMIN') return '/super-admin';
    if (user.role === 'TENANT_ADMIN') return '/tenant-admin';
    return '/member';
  };

  return (
    <div className="sa-landing">
      {/* Ambient background glowing orbs */}
      <div className="sa-ambient-bg" aria-hidden="true">
        <div className="sa-glow-orb sa-glow-orb-1" />
        <div className="sa-glow-orb sa-glow-orb-2" />
        <div className="sa-glow-orb sa-glow-orb-3" />
      </div>

      {/* Logged in User Bar if active session exists */}
      {isAuthenticated && user && (
        <div className="sa-auth-ribbon">
          <span>
            👋 Welcome back, <strong>{user.name || user.email}</strong>!
          </span>
          <a href={getDashboardLink()} id="btn-return-dashboard">
            Return to Dashboard <ArrowRight size={14} />
          </a>
        </div>
      )}

      {/* Sticky Header Navigation */}
      <header className="sa-navbar">
        <div className="sa-container sa-navbar-inner">
          <a href="/landing" className="sa-brand-logo" id="logo-nav">
            <img 
              src="/societyarena-emblem.png" 
              alt="SocietyArena Emblem" 
              className="sa-brand-img"
            />
            <span className="sa-brand-name">SOCIETYARENA</span>
          </a>

          <nav className="sa-nav-links">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing & Setup</a>
            <a href="#mobile-app">Mobile App</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="sa-nav-actions">
            <a href={`tel:${SALES_PHONE}`} className="sa-phone-pill" title="Call Sales Hotline">
              <PhoneCall size={14} />
              <span>{SALES_PHONE}</span>
            </a>

            <a href="/login" className="sa-btn-login" id="btn-portal-login">
              Portal Sign In
            </a>

            <a href="#demo" className="sa-btn-gold" id="btn-book-demo-nav">
              <Sparkles size={16} />
              <span>Book Demo</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="sa-hero">
        <div className="sa-container">
          <div className="sa-badge-pill">
            <span className="sa-pulse-dot" />
            <span>Next-Generation Society Operating System</span>
          </div>

          <h1 className="sa-hero-title">
            Intelligent Society Operations. <br />
            <span className="sa-highlight">Elevated Resident Luxury.</span>
          </h1>

          <p className="sa-hero-sub">
            The ultra-modern ERP designed specifically for residential societies, gated villas, 
            and premium apartment complexes. Eliminate manual registers, automate 100% of maintenance billing, 
            and deliver a 5-star mobile experience for your residents.
          </p>

          <div className="sa-hero-ctas">
            <a href="#demo" className="sa-btn-primary-lg" id="btn-hero-demo">
              <Sparkles size={18} />
              <span>Schedule Executive Demo</span>
            </a>

            <a 
              href={WHATSAPP_URL} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="sa-btn-whatsapp-lg"
              id="btn-hero-whatsapp"
            >
              <MessageSquare size={18} />
              <span>Chat on WhatsApp: {SALES_PHONE}</span>
            </a>

            <a href="#mobile-app" className="sa-btn-outline-lg" id="btn-hero-apk">
              <Download size={18} />
              <span>Download Mobile App (v2.0)</span>
            </a>
          </div>

          {/* Social Proof Stats (Filtered to 2 primary performance cards) */}
          <div className="sa-stats-grid">
            <div className="sa-stat-card">
              <div className="sa-stat-val">99.4%</div>
              <div className="sa-stat-lbl">On-Time Dues Collection</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-val">60%</div>
              <div className="sa-stat-lbl">Reduction in Admin Workload</div>
            </div>
          </div>

          {/* Interactive Live Preview Shell */}
          <div className="sa-preview-shell">
            <div className="sa-preview-topbar">
              <div className="sa-dots">
                <div className="sa-dot sa-dot-red" />
                <div className="sa-dot sa-dot-yellow" />
                <div className="sa-dot sa-dot-green" />
              </div>
              <div className="sa-preview-tabs">
                <button 
                  className={`sa-preview-tab-btn ${activePreviewTab === 'finance' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('finance')}
                >
                  Maintenance & Billing
                </button>
                <button 
                  className={`sa-preview-tab-btn ${activePreviewTab === 'tickets' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('tickets')}
                >
                  Complaints & SLA
                </button>
                <button 
                  className={`sa-preview-tab-btn ${activePreviewTab === 'amenities' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('amenities')}
                >
                  Clubhouse & Amenities
                </button>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--sa-gold-primary)', fontWeight: 700 }}>
                ● LIVE DEMO PREVIEW
              </span>
            </div>

            <div className="sa-preview-content">
              {activePreviewTab === 'finance' && (
                <div>
                  <div className="sa-kpi-row">
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Current Quarter Collections</div>
                      <div className="sa-kpi-amount">₹ 24,85,000</div>
                      <div className="sa-kpi-tag"><TrendingUp size={12} /> +18.4% vs last period</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Collection Efficiency</div>
                      <div className="sa-kpi-amount">98.8%</div>
                      <div className="sa-kpi-tag">194 of 196 flats cleared</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Auto-Reconciled Payments</div>
                      <div className="sa-kpi-amount">₹ 23,40,000</div>
                      <div className="sa-kpi-tag"><CheckCircle2 size={12} /> Instant UPI & Netbanking</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Overdue Aging</div>
                      <div className="sa-kpi-amount" style={{ color: '#10B981' }}>0 Default Risk</div>
                      <div className="sa-kpi-tag">Automated WhatsApp Reminders</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', padding: '0.45rem', borderRadius: '8px' }}>
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Tower B - Unit 402 Maintenance Paid via UPI</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Auto-generated Receipt #SA-2026-8842 sent to member email & mobile</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>+₹ 4,500.00 • Just now</span>
                  </div>
                </div>
              )}

              {activePreviewTab === 'tickets' && (
                <div>
                  <div className="sa-kpi-row">
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Open Service Tickets</div>
                      <div className="sa-kpi-amount">3 Active</div>
                      <div className="sa-kpi-tag">97.2% Resolved within SLA</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Avg Resolution Time</div>
                      <div className="sa-kpi-amount">2.4 Hours</div>
                      <div className="sa-kpi-tag">Electrical, Lift & Plumbing</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Vendor Assigned</div>
                      <div className="sa-kpi-amount">Apex Facility</div>
                      <div className="sa-kpi-tag">Contractor SLA Monitored</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Resident Satisfaction</div>
                      <div className="sa-kpi-amount">4.92 / 5.0</div>
                      <div className="sa-kpi-tag">Based on 140 ratings</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', padding: '0.45rem', borderRadius: '8px' }}>
                        <Wrench size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Ticket #819: Tower A Elevator Sensor Inspection</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Technician on-site • Work Order closed with photo verification</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>COMPLETED</span>
                  </div>
                </div>
              )}

              {activePreviewTab === 'amenities' && (
                <div>
                  <div className="sa-kpi-row">
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Clubhouse Banquet Hall</div>
                      <div className="sa-kpi-amount">Booked (Sat)</div>
                      <div className="sa-kpi-tag">Flat 801 Family Function</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Tennis Court 1</div>
                      <div className="sa-kpi-amount">06:00 - 08:00 AM</div>
                      <div className="sa-kpi-tag">Slot Reserved & Access Synced</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Swimming Pool Pass</div>
                      <div className="sa-kpi-amount">Digital Pass</div>
                      <div className="sa-kpi-tag">Resident-Only Capacity Control</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Amenity Revenue</div>
                      <div className="sa-kpi-amount">₹ 84,000</div>
                      <div className="sa-kpi-tag">Deposited directly into Society Account</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#A855F7', padding: '0.45rem', borderRadius: '8px' }}>
                        <Calendar size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Multi-Purpose Hall Reservation Confirmed</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Rules accepted, deposit auto-charged, society calendar synchronized</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#A855F7', fontWeight: 700 }}>RESERVED</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars Section (Refactored to 100% Platform & Administration focus) */}
      <section className="sa-section" id="features">
        <div className="sa-container">
          <span className="sa-sec-badge">ENGINEERED FOR EXCELLENCE</span>
          <h2 className="sa-sec-title">Core Pillars of SocietyArena</h2>
          <p className="sa-sec-sub">
            Every feature is fine-tuned to solve the exact pain points faced by modern RWAs, 
            estate managers, and residents.
          </p>

          <div className="sa-features-grid">
            {/* Feature 1 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <CreditCard size={26} />
              </div>
              <h3 className="sa-feature-title">Automated Dues & Instant Invoicing</h3>
              <p className="sa-feature-desc">
                Generate monthly recurring maintenance with flat-rate or square-foot logic. 
                Residents pay in 1-tap via UPI, cards, or netbanking with auto-generated GST receipts.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Automated WhatsApp & SMS payment nudges</li>
                <li><Check size={14} /> Instant ledger reconciliations with bank statements</li>
                <li><Check size={14} /> Zero manual receipt writing or spreadsheet chasing</li>
              </ul>
            </div>

            {/* Feature 2: Replaced Gate Security with Financial Ledgers & Audits */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <FileText size={26} />
              </div>
              <h3 className="sa-feature-title">Financial Ledgers & AGM-Ready Audits</h3>
              <p className="sa-feature-desc">
                Bank-grade multi-head accounting. Track vendor payments, sinking funds, 
                and capital expenditures with single-click export of audited balance sheets.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Real-time bank account reconciliation & GST reports</li>
                <li><Check size={14} /> Defaulter aging analysis and automatic penalty engine</li>
                <li><Check size={14} /> 100% transparent income-vs-expense audit trail</li>
              </ul>
            </div>

            {/* Feature 3 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <Wrench size={26} />
              </div>
              <h3 className="sa-feature-title">Instant Helpdesk & SLA Resolution</h3>
              <p className="sa-feature-desc">
                Residents raise plumbing, electrical, or common area issues directly from their phone 
                with photos. Society managers assign staff and track resolution timers.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Live ticket progress status updates for residents</li>
                <li><Check size={14} /> SLA violation alerts to President & Estate Manager</li>
                <li><Check size={14} /> Transparent resident ratings after job closure</li>
              </ul>
            </div>

            {/* Feature 4 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <Calendar size={26} />
              </div>
              <h3 className="sa-feature-title">Clubhouse & Amenity Management</h3>
              <p className="sa-feature-desc">
                Eliminate booking double-allocations. Manage slots for party halls, swimming pool, 
                badminton courts, and barbecue pavilions with customizable rules.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Conflict-free calendar with real-time slot locks</li>
                <li><Check size={14} /> Integrated security deposit & cleaning fee collection</li>
                <li><Check size={14} /> Member limits and guest policy enforcement</li>
              </ul>
            </div>

            {/* Feature 5 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <Users size={26} />
              </div>
              <h3 className="sa-feature-title">Digital Noticeboard & Governance</h3>
              <p className="sa-feature-desc">
                Broadcast official circulars, water shortage warnings, and AGM announcements 
                with guaranteed delivery. Conduct digital polls with certified tamper-proof records.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> High-priority push notifications & email summaries</li>
                <li><Check size={14} /> Digital polling for society committee elections</li>
                <li><Check size={14} /> Centralized repository for society bylaws and audits</li>
              </ul>
            </div>

            {/* Feature 6 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <Smartphone size={26} />
              </div>
              <h3 className="sa-feature-title">Native Android & iOS Resident App</h3>
              <p className="sa-feature-desc">
                A blazing-fast, multilingual mobile application for Android and iOS that residents love. 
                Pay dues, book amenities, track complaints, and stay informed on the go.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Hindi, Tamil, Telugu, Kannada, Marathi & English</li>
                <li><Check size={14} /> Instant digital receipts and outstanding balances</li>
                <li><Check size={14} /> Fast offline caching & biometric login</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Solutions (Focused purely on RWA Committees & Residents) */}
      <section className="sa-section" id="solutions">
        <div className="sa-container">
          <span className="sa-sec-badge">TAILORED EXPERIENCES</span>
          <h2 className="sa-sec-title">Engineered for Society Stakeholders</h2>
          <p className="sa-sec-sub">
            Whether you are on the management committee steering society governance or a proud resident enjoying community amenities, 
            SocietyArena provides a specialized, intuitive interface.
          </p>

          <div className="sa-roles-container">
            <div className="sa-role-tabs-bar">
              <button 
                className={`sa-role-tab-btn ${activeRoleTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveRoleTab('admin')}
              >
                <Award size={18} /> For RWA & Managing Committee
              </button>
              <button 
                className={`sa-role-tab-btn ${activeRoleTab === 'resident' ? 'active' : ''}`}
                onClick={() => setActiveRoleTab('resident')}
              >
                <Users size={18} /> For Residents & Owners
              </button>
            </div>

            {activeRoleTab === 'admin' && (
              <div className="sa-role-content">
                <div className="sa-role-text">
                  <h3>Complete Financial Transparency & Zero Hassle</h3>
                  <p>
                    Take complete control of society finances. Track vendor invoices, 
                    view real-time bank reconciliation, run automated collection cycles, 
                    and download audited balance sheets with a single click.
                  </p>
                  <div className="sa-role-bullets">
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Defaulter Recovery Engine</div>
                        <div className="sa-bullet-desc">Automatic gentle WhatsApp reminders eliminate uncomfortable manual follow-ups.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">GST & Vendor Expense Audits</div>
                        <div className="sa-bullet-desc">All expenses mapped to budget categories with receipt attachments for instant AGM review.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Broadcast Hub & Emergency Alert</div>
                        <div className="sa-bullet-desc">Send immediate SMS or app notifications to all towers in case of power, water, or lift maintenance.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sa-role-card-display">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>RWA Executive Financial Summary</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--sa-text-muted)' }}>Total Annual Operating Budget</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--sa-gold-light)' }}>₹ 42,50,000</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Sinking Fund Reserve</div>
                      <div style={{ fontWeight: 700 }}>₹ 18,20,000</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Operational Expenses</div>
                      <div style={{ fontWeight: 700 }}>₹ 12,40,000</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRoleTab === 'resident' && (
              <div className="sa-role-content">
                <div className="sa-role-text">
                  <h3>Luxurious, Frictionless Living at Your Fingertips</h3>
                  <p>
                    Everything a homeowner or tenant needs in one smartphone app. Pay your dues 
                    in 10 seconds via Google Pay or PhonePe, reserve clubhouse amenities anytime, 
                    and get maintenance issues resolved promptly without chasing committee members.
                  </p>
                  <div className="sa-role-bullets">
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">1-Tap UPI Maintenance Payment</div>
                        <div className="sa-bullet-desc">Direct GPay / PhonePe / Paytm integration. Download official receipts instantly.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Complete Financial Transparency</div>
                        <div className="sa-bullet-desc">View society balance sheets and monthly audited accounts directly inside the app.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Clubhouse & Sports Slot Booking</div>
                        <div className="sa-bullet-desc">Reserve the banquet hall, swimming pool, or tennis court ahead of time with live slot locks.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sa-role-card-display">
                  <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                      <Smartphone size={30} style={{ color: 'var(--sa-gold-primary)' }} />
                    </div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Resident Companion</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--sa-text-muted)' }}>Loved by 10,000+ happy families across India</p>
                  </div>
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.85rem', borderRadius: '10px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 700 }}>
                      ✓ All Maintenance Cleared for October 2026
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PLATFORM PRICING & SETUP SECTION (Replaces Savings Calculator) */}
      <section className="sa-section" id="pricing">
        <div className="sa-container">
          <span className="sa-sec-badge">TRANSPARENT PLATFORM PRICING</span>
          <h2 className="sa-sec-title">Predictable Pricing for Modern Communities</h2>
          <p className="sa-sec-sub">
            Zero setup fees, zero hardware investment, and a 30-day risk-free pilot for your managing committee.
          </p>

          {/* Billing Switch Toggle */}
          <div className="sa-billing-toggle-bar">
            <span className={billingCycle === 'monthly' ? 'active-label' : ''}>Monthly Billing</span>
            <button 
              className="sa-billing-toggle-btn"
              onClick={() => setBillingCycle(billingCycle === 'annual' ? 'monthly' : 'annual')}
              aria-label="Toggle annual billing discount"
            >
              <div className={`sa-toggle-pill ${billingCycle === 'annual' ? 'annual-active' : ''}`} />
            </button>
            <span className={billingCycle === 'annual' ? 'active-label' : ''}>
              Annual Commitment <span className="sa-discount-chip">SAVE UP TO 20%</span>
            </span>
          </div>

          {/* 3 Pricing Plans Grid */}
          <div className="sa-pricing-cards-grid">
            {/* Plan 1: Starter */}
            <div className="sa-price-card">
              <div className="sa-price-header">
                <h3 className="sa-plan-name">Starter Plan</h3>
                <p className="sa-plan-for">Ideal for standalone boutique apartments & villa layouts</p>
                <div className="sa-plan-price-row">
                  <span className="sa-plan-currency">₹</span>
                  <span className="sa-plan-num">{billingCycle === 'annual' ? '899' : '999'}</span>
                  <span className="sa-plan-period">/ month</span>
                </div>
                <div className="sa-plan-cap">For societies up to 50 flats</div>
              </div>

              <ul className="sa-plan-features">
                <li><Check size={16} /> Up to 50 Flats / Units</li>
                <li><Check size={16} /> Automated Dues Invoicing & UPI Receipts</li>
                <li><Check size={16} /> WhatsApp & SMS Payment Reminders</li>
                <li><Check size={16} /> Android Resident Mobile App</li>
                <li><Check size={16} /> Helpdesk Complaints & Ticket SLA</li>
                <li><Check size={16} /> 2 Managing Committee Admin Logins</li>
                <li><Check size={16} /> Free Setup & Data Migration</li>
              </ul>

              <a href="#demo" className="sa-btn-outline-lg" style={{ width: '100%', justifyContent: 'center' }}>
                Get Started with Starter
              </a>
            </div>

            {/* Plan 2: Professional (Recommended) */}
            <div className="sa-price-card featured">
              <div className="sa-popular-tag">MOST POPULAR CHOICE</div>
              <div className="sa-price-header">
                <h3 className="sa-plan-name">Professional Plan</h3>
                <p className="sa-plan-for">Designed for mid-to-large residential complexes & towers</p>
                <div className="sa-plan-price-row">
                  <span className="sa-plan-currency">₹</span>
                  <span className="sa-plan-num">{billingCycle === 'annual' ? '15' : '18'}</span>
                  <span className="sa-plan-period">/ flat / month</span>
                </div>
                <div className="sa-plan-cap">For societies with 51 to 250 flats</div>
              </div>

              <ul className="sa-plan-features">
                <li><Check size={16} /> Unlimited Towers & Flat Configurations</li>
                <li><Check size={16} /> Direct Society Bank Account UPI Integration</li>
                <li><Check size={16} /> Automated Late Fine & GST Ledger Engine</li>
                <li><Check size={16} /> Clubhouse & Sports Amenity Booking Engine</li>
                <li><Check size={16} /> Digital Noticeboard & AGM Voting / Polling</li>
                <li><Check size={16} /> Complete Vendor Expense & Audit Reports</li>
                <li><Check size={16} /> Dedicated WhatsApp Support Group</li>
                <li><Check size={16} /> 30-Day Free Trial Before First Invoice</li>
              </ul>

              <a href="#demo" className="sa-btn-gold" style={{ width: '100%', justifyContent: 'center' }}>
                <Sparkles size={16} /> Choose Professional Plan
              </a>
            </div>

            {/* Plan 3: Enterprise */}
            <div className="sa-price-card">
              <div className="sa-price-header">
                <h3 className="sa-plan-name">Enterprise Plan</h3>
                <p className="sa-plan-for">Sprawling townships, luxury towers & federation RWAs</p>
                <div className="sa-plan-price-row">
                  <span className="sa-plan-currency">₹</span>
                  <span className="sa-plan-num">{billingCycle === 'annual' ? '12' : '15'}</span>
                  <span className="sa-plan-period">/ flat / month</span>
                </div>
                <div className="sa-plan-cap">For large societies with 250+ units</div>
              </div>

              <ul className="sa-plan-features">
                <li><Check size={16} /> Everything in Professional, plus:</li>
                <li><Check size={16} /> Multi-Phase Township & Sub-Society Hierarchy</li>
                <li><Check size={16} /> Custom Payment Gateway & Split Escrows</li>
                <li><Check size={16} /> Custom Bylaws & Maintenance Formulas</li>
                <li><Check size={16} /> Dedicated Onboarding Manager & On-Site Assistance</li>
                <li><Check size={16} /> 99.9% High-Availability SLA</li>
                <li><Check size={16} /> 24/7 Priority Hotline: {SALES_PHONE}</li>
              </ul>

              <a href={`tel:${SALES_PHONE}`} className="sa-btn-outline-lg" style={{ width: '100%', justifyContent: 'center' }}>
                <PhoneCall size={16} /> Speak to Enterprise Sales
              </a>
            </div>
          </div>

          {/* Interactive Flat Price Estimator */}
          <div className="sa-estimator-box">
            <div className="sa-estimator-left">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--sa-gold-primary)', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                <BadgePercent size={18} />
                <span>Instant Society Cost Estimator</span>
              </div>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                Calculate Investment for Your Society
              </h3>
              <p style={{ color: 'var(--sa-text-muted)', fontSize: '0.925rem', marginBottom: '2rem' }}>
                Drag the slider to match your society's total unit count to see exact transparent pricing.
              </p>

              <div className="sa-calc-input-group">
                <div className="sa-calc-label-row">
                  <span className="sa-calc-label">Total Flats in Society</span>
                  <span className="sa-calc-val-badge">{calcUnits} Units</span>
                </div>
                <input 
                  type="range" 
                  min="20" 
                  max="500" 
                  step="5" 
                  value={calcUnits}
                  onChange={(e) => setCalcUnits(Number(e.target.value))}
                  className="sa-slider"
                  id="slider-flats-pricing"
                />
              </div>

              <div style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid var(--sa-border-gold)', borderRadius: '12px', padding: '1rem', marginTop: '1.5rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--sa-gold-light)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  Recommended: {dynamicPricing.plan}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--sa-text-muted)' }}>
                  {dynamicPricing.tierDesc} • {dynamicPricing.savingsText}
                </div>
              </div>
            </div>

            <div className="sa-estimator-right">
              <div className="sa-est-metric">
                <div className="sa-est-metric-title">Monthly Society Investment</div>
                <div className="sa-est-metric-val">₹ {dynamicPricing.monthlyTotal.toLocaleString('en-IN')}</div>
                <div className="sa-est-metric-sub">
                  That is only ~₹ {(dynamicPricing.monthlyTotal / calcUnits / 30).toFixed(2)} per flat / day!
                </div>
              </div>

              <div className="sa-est-divider" />

              <div className="sa-est-metric">
                <div className="sa-est-metric-title">Total Annual Investment</div>
                <div className="sa-est-metric-val" style={{ color: '#10B981' }}>
                  ₹ {dynamicPricing.annualTotal.toLocaleString('en-IN')} / year
                </div>
                <div className="sa-est-metric-sub">
                  Zero setup fees • 100% Free Data Migration • 30-Day Free Trial
                </div>
              </div>

              <a href="#demo" className="sa-btn-primary-lg" style={{ width: '100%', justifyContent: 'center', marginTop: '1.5rem' }}>
                <span>Lock In This Price for Your Society</span>
                <ArrowRight size={18} />
              </a>
            </div>
          </div>

          {/* How Can We Setup The Price & Onboard Our Society */}
          <div className="sa-setup-guide">
            <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3rem' }}>
              <span className="sa-sec-badge">ONBOARDING SIMPLIFIED</span>
              <h3 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                How Do We Setup The Platform for Your Society?
              </h3>
              <p style={{ color: 'var(--sa-text-muted)', fontSize: '1rem' }}>
                Setting up SocietyArena requires zero technical effort from your managing committee. 
                Our dedicated onboarding engineers handle 100% of the migration.
              </p>
            </div>

            <div className="sa-steps-grid">
              <div className="sa-step-card">
                <div className="sa-step-number">01</div>
                <h4>Share Roster & Select Plan</h4>
                <p>
                  Submit your flat count and society name. Share your existing owner/tenant roster and opening balances in simple Excel or CSV format.
                </p>
                <div className="sa-step-footer">
                  <CheckCircle2 size={16} /> Zero manual data entry for you
                </div>
              </div>

              <div className="sa-step-card">
                <div className="sa-step-number">02</div>
                <h4>24-Hour Configuration & Bank Link</h4>
                <p>
                  Our technical engineers configure your towers, unit billing formulas, and connect your society's existing bank account for direct UPI collections.
                </p>
                <div className="sa-step-footer">
                  <CheckCircle2 size={16} /> Funds settle directly to society account
                </div>
              </div>

              <div className="sa-step-card">
                <div className="sa-step-number">03</div>
                <h4>30-Day Free Trial & Resident Rollout</h4>
                <p>
                  Your managing committee and residents receive login credentials. Experience all premium features risk-free for 30 days before making any payment.
                </p>
                <div className="sa-step-footer">
                  <CheckCircle2 size={16} /> Risk-free committee approval
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile App Showcase & Direct APK Download */}
      <section className="sa-section" id="mobile-app">
        <div className="sa-container">
          <div className="sa-mobile-banner">
            <div className="sa-mobile-text">
              <span className="sa-sec-badge" style={{ textAlign: 'left' }}>NATIVE MOBILE EXPERIENCE</span>
              <h3>Take SocietyArena Wherever You Go</h3>
              <p>
                Equip your residents and committee members with the high-performance SocietyArena mobile app. 
                Experience instant dues payment, clubhouse reservations, and community circulars directly from your pocket.
              </p>

              <div className="sa-mobile-badge-list">
                <div className="sa-mobile-badge-item">
                  <CheckCircle2 size={16} /> Instant Biometric Login
                </div>
                <div className="sa-mobile-badge-item">
                  <CheckCircle2 size={16} /> WhatsApp Payment Nudges
                </div>
                <div className="sa-mobile-badge-item">
                  <CheckCircle2 size={16} /> 6 Indian Languages
                </div>
                <div className="sa-mobile-badge-item">
                  <CheckCircle2 size={16} /> Zero Connectivity Lag
                </div>
              </div>

              <div className="sa-app-actions">
                <a 
                  href="/SocietyArena.apk" 
                  download="SocietyArena.apk" 
                  className="sa-btn-download-apk"
                  id="btn-download-apk"
                >
                  <Download size={20} />
                  <span>Download Android APK (v2.0)</span>
                </a>

                <a 
                  href={`tel:${SALES_PHONE}`} 
                  className="sa-btn-outline-lg"
                  id="btn-request-ios"
                >
                  <PhoneCall size={18} />
                  <span>Need iOS / TestFlight? Call {SALES_PHONE}</span>
                </a>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                display: 'inline-block', 
                background: 'linear-gradient(180deg, #16244B 0%, #080D1D 100%)', 
                padding: '1.25rem', 
                borderRadius: '32px', 
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)', 
                border: '2px solid var(--sa-border-gold)',
                maxWidth: '280px'
              }}>
                <img 
                  src="/societyarena-emblem.png" 
                  alt="SocietyArena Mobile App" 
                  style={{ width: '100%', borderRadius: '24px', display: 'block', background: '#090f24', padding: '1.5rem' }} 
                />
                <div style={{ marginTop: '1rem', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '1px', color: 'var(--sa-gold-light)' }}>
                  SocietyArena Mobile v2.0
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>
                  Production Cloud Sync Active
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Booking & Lead Capture Form */}
      <section className="sa-form-section" id="demo">
        <div className="sa-container">
          <div className="sa-form-card">
            <span className="sa-sec-badge" style={{ textAlign: 'center' }}>START YOUR TRANSFORMATION</span>
            <h2 className="sa-sec-title">Book an In-Person or Live Virtual Demo</h2>
            <p className="sa-sec-sub" style={{ marginBottom: '2.5rem' }}>
              Our society onboarding specialists in Coimbatore will tailor a customized walkthrough for your managing committee.
            </p>

            {formSubmitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  color: '#10B981', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '1.5rem' 
                }}>
                  <CheckCircle2 size={40} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                  Demo Request Received!
                </h3>
                <p style={{ color: 'var(--sa-text-muted)', maxWidth: '520px', margin: '0 auto 2rem' }}>
                  Thank you! Our DT Venture representative is reaching out to you shortly at <strong>{demoForm.phoneNumber}</strong>. 
                  WhatsApp chat has also been prepared for instant scheduling.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <a href={`tel:${SALES_PHONE}`} className="sa-btn-primary-lg">
                    <PhoneCall size={18} />
                    <span>Call Sales Directly: {SALES_PHONE}</span>
                  </a>
                  <button 
                    onClick={() => setFormSubmitted(false)} 
                    className="sa-btn-outline-lg"
                    style={{ cursor: 'pointer' }}
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="sa-form-grid">
                <div className="sa-form-group">
                  <label className="sa-form-label">Society / Apartment Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Prestige Green Meadows" 
                    className="sa-form-input"
                    value={demoForm.societyName}
                    onChange={(e) => setDemoForm({ ...demoForm, societyName: e.target.value })}
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label">City *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Coimbatore, Bengaluru, Chennai, Mumbai" 
                    className="sa-form-input"
                    value={demoForm.city}
                    onChange={(e) => setDemoForm({ ...demoForm, city: e.target.value })}
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label">Contact Person Name *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Your Full Name (President, Secretary, Treasurer)" 
                    className="sa-form-input"
                    value={demoForm.contactPerson}
                    onChange={(e) => setDemoForm({ ...demoForm, contactPerson: e.target.value })}
                  />
                </div>

                <div className="sa-form-group">
                  <label className="sa-form-label">Phone / WhatsApp Number *</label>
                  <input 
                    type="tel" 
                    required 
                    placeholder="e.g. 7812860791" 
                    className="sa-form-input"
                    value={demoForm.phoneNumber}
                    onChange={(e) => setDemoForm({ ...demoForm, phoneNumber: e.target.value })}
                  />
                </div>

                <div className="sa-form-group full-width">
                  <label className="sa-form-label">Approximate Number of Flats</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 120 Flats" 
                    className="sa-form-input"
                    value={demoForm.flatsCount}
                    onChange={(e) => setDemoForm({ ...demoForm, flatsCount: e.target.value })}
                  />
                </div>

                <div className="sa-form-group full-width">
                  <label className="sa-form-label">Specific Questions or Requirements</label>
                  <textarea 
                    rows={3} 
                    placeholder="Tell us about your society's requirements for billing cycles, bank account integration, or platform setup..." 
                    className="sa-form-input"
                    value={demoForm.message}
                    onChange={(e) => setDemoForm({ ...demoForm, message: e.target.value })}
                  />
                </div>

                <div className="sa-form-actions">
                  <button type="submit" className="sa-btn-primary-lg" style={{ width: '100%', justifyContent: 'center' }}>
                    <Send size={18} />
                    <span>Submit & Connect with Sales (Hotline: {SALES_PHONE})</span>
                  </button>

                  <div className="sa-call-sales-strip">
                    <span>Prefer an immediate phone conversation?</span>
                    <a href={`tel:${SALES_PHONE}`}>Call Hotline: {SALES_PHONE_DISPLAY}</a>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions Accordion */}
      <section className="sa-section" id="faq">
        <div className="sa-container">
          <span className="sa-sec-badge">COMMON QUESTIONS</span>
          <h2 className="sa-sec-title">Frequently Asked Questions</h2>
          <p className="sa-sec-sub">
            Have questions about onboarding, pricing setup, or data migration? We've got answers.
          </p>

          <div className="sa-faq-grid">
            {[
              {
                q: 'How do we setup the price and get started with SocietyArena?',
                a: 'Setup is completely seamless. Choose your tier (Starter, Professional, or Enterprise) based on your flat count. Our Coimbatore onboarding team configures your society portal, bank account links, and dues cycle within 24 hours at zero setup cost.'
              },
              {
                q: 'Are there any hidden setup, migration, or cancellation fees?',
                a: 'No hidden fees whatsoever. Full data migration of your resident roster, historical payment balances, and flat records from Excel or physical registers is 100% free with all plans. We also provide a 30-day risk-free trial.'
              },
              {
                q: 'Can we collect maintenance dues through UPI without high gateway fees?',
                a: 'Yes! SocietyArena supports direct UPI integration (PhonePe, Google Pay, BHIM, Paytm) where funds settle directly into your society bank account with instant automated payment receipts.'
              },
              {
                q: 'Is resident personal information protected and private?',
                a: 'Strictly yes. SocietyArena uses bank-grade multi-tenant data isolation. Each housing society operates in a dedicated secure container. We never share or monetize resident contact numbers.'
              },
              {
                q: 'How do elderly or non-tech-savvy residents use the system?',
                a: 'SocietyArena was designed with extreme simplicity. Residents can view their outstanding balance and tap a simple "Pay via UPI" button. Our mobile app also supports 6 regional languages (Hindi, Tamil, Telugu, Kannada, Marathi, and English).'
              }
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className={`sa-faq-item ${isOpen ? 'open' : ''}`}>
                  <div 
                    className="sa-faq-question"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                  {isOpen && (
                    <div className="sa-faq-answer">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Luxury Footer with DT Venture attribution, email, and Coimbatore location */}
      <footer className="sa-footer">
        <div className="sa-container">
          <div className="sa-footer-grid">
            <div className="sa-footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <img 
                  src="/societyarena-emblem.png" 
                  alt="SocietyArena Emblem" 
                  style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'contain', background: '#0e1a38', border: '1px solid var(--sa-border-gold)', padding: '2px' }}
                />
                <span className="sa-brand-name" style={{ fontSize: '1.25rem' }}>SOCIETYARENA</span>
              </div>
              <p>
                India's premier smart society management operating system by DT Venture. 
                Empowering gated communities with automated digital finance, audited accounting, and elevated resident experiences.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <a href={`tel:${SALES_PHONE}`} className="sa-phone-pill" style={{ textDecoration: 'none' }}>
                  <PhoneCall size={14} />
                  <span>Call Sales: {SALES_PHONE}</span>
                </a>
              </div>
            </div>

            <div className="sa-footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Automated Billing</a></li>
                <li><a href="#features">Financial Ledgers</a></li>
                <li><a href="#features">Helpdesk SLA</a></li>
                <li><a href="#features">Clubhouse Booking</a></li>
                <li><a href="#pricing">Platform Pricing</a></li>
              </ul>
            </div>

            <div className="sa-footer-col">
              <h4>Solutions</h4>
              <ul>
                <li><a href="#solutions">For RWA Committees</a></li>
                <li><a href="#solutions">For Residents & Owners</a></li>
                <li><a href="#pricing">Onboarding & Setup</a></li>
                <li><a href="#mobile-app">Android Mobile APK</a></li>
                <li><a href="/login">Platform Sign In</a></li>
              </ul>
            </div>

            <div className="sa-footer-col">
              <h4>Sales Hotline & DT Venture</h4>
              <ul>
                <li>
                  <a href={`tel:${SALES_PHONE}`} style={{ color: 'var(--sa-gold-light)', fontWeight: 700 }}>
                    📞 Hotline: {SALES_PHONE_DISPLAY}
                  </a>
                </li>
                <li>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366', fontWeight: 600 }}>
                    💬 WhatsApp: {SALES_PHONE_DISPLAY}
                  </a>
                </li>
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--sa-text-muted)' }}>
                    ✉️ {CONTACT_EMAIL}
                  </a>
                </li>
                <li>
                  <span style={{ color: 'var(--sa-gold-light)', fontWeight: 600 }}>
                    📍 {LOCATION_DISPLAY}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="sa-footer-bottom">
            <div>
              © 2026 SocietyArena by DT Venture. All rights reserved.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="/login" style={{ color: 'var(--sa-text-muted)', textDecoration: 'none' }}>Client Portal Login</a>
              <a href="#pricing" style={{ color: 'var(--sa-gold-light)', textDecoration: 'none' }}>Platform Pricing</a>
              <a href="#demo" style={{ color: 'var(--sa-gold-light)', textDecoration: 'none' }}>Request Society Demo</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
