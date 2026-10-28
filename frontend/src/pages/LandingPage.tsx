import React, { useState } from 'react';
import { 
  ShieldCheck, 
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
  Star, 
  Send, 
  Lock, 
  Award, 
  Zap, 
  Check 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const SALES_PHONE = '7812860791';
const SALES_PHONE_DISPLAY = '+91 7812860791';
const WHATSAPP_URL = `https://wa.me/917812860791?text=${encodeURIComponent(
  'Hello SocietyArena Team! I would like to schedule an executive demo for my residential society.'
)}`;

const LandingPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  // Active states
  const [activePreviewTab, setActivePreviewTab] = useState<'finance' | 'security' | 'tickets' | 'amenities'>('finance');
  const [activeRoleTab, setActiveRoleTab] = useState<'admin' | 'resident' | 'security'>('admin');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // ROI Calculator states
  const [calcFlats, setCalcFlats] = useState<number>(180);
  const [calcMaintenance, setCalcMaintenance] = useState<number>(3500);

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

  // Dynamic calculations for ROI
  const annualCollection = calcFlats * calcMaintenance * 12;
  const hoursSavedPerMonth = Math.round(calcFlats * 0.22);
  const estimatedLeakagePrevented = Math.round(annualCollection * 0.045);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    // Construct WhatsApp message with user details for instantaneous outreach
    const leadText = `*New SocietyArena Demo Inquiry:*\n- Society: ${demoForm.societyName || 'N/A'}\n- City: ${demoForm.city || 'N/A'}\n- Name: ${demoForm.contactPerson}\n- Phone: ${demoForm.phoneNumber}\n- Units: ${demoForm.flatsCount || 'N/A'}\n- Note: ${demoForm.message || 'Ready for demo'}`;
    const dynamicWhatsApp = `https://wa.me/917812860791?text=${encodeURIComponent(leadText)}`;
    
    // Automatically open WhatsApp in background/tab
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
              src="/societyarena-logo.jpeg" 
              alt="SocietyArena Logo" 
              className="sa-brand-img"
            />
            <span className="sa-brand-name">SOCIETYARENA</span>
          </a>

          <nav className="sa-nav-links">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#calculator">Savings Calculator</a>
            <a href="#mobile-app">Mobile App</a>
            <a href="#testimonials">Reviews</a>
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

          {/* Social Proof Stats */}
          <div className="sa-stats-grid">
            <div className="sa-stat-card">
              <div className="sa-stat-val">99.4%</div>
              <div className="sa-stat-lbl">On-Time Dues Collection</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-val">60%</div>
              <div className="sa-stat-lbl">Reduction in Admin Workload</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-val">24/7</div>
              <div className="sa-stat-lbl">Live Gate Security & Intercom</div>
            </div>
            <div className="sa-stat-card">
              <div className="sa-stat-val">4.9 ★</div>
              <div className="sa-stat-lbl">Resident Mobile App Rating</div>
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
                  className={`sa-preview-tab-btn ${activePreviewTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActivePreviewTab('security')}
                >
                  Gate & Visitor Security
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

              {activePreviewTab === 'security' && (
                <div>
                  <div className="sa-kpi-row">
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Today's Visitors Handled</div>
                      <div className="sa-kpi-amount">84 Entries</div>
                      <div className="sa-kpi-tag"><CheckCircle2 size={12} /> 100% Verified Passports</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Delivery Passes Issued</div>
                      <div className="sa-kpi-amount">46 Deliveries</div>
                      <div className="sa-kpi-tag">Swiggy, Amazon, Zomato, Blinkit</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Domestic Staff On Premises</div>
                      <div className="sa-kpi-amount">38 Active</div>
                      <div className="sa-kpi-tag">Maids, Drivers & Cooks logged</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Gate Intercom Response</div>
                      <div className="sa-kpi-amount">4.2s</div>
                      <div className="sa-kpi-tag">Instant Resident Phone Prompt</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', padding: '0.45rem', borderRadius: '8px' }}>
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Main Gate Security Check-In: BlueDart Courier</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-muted)' }}>Approved by Flat 1204 via SocietyArena Mobile Push Notification</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#3B82F6', fontWeight: 700 }}>VERIFIED ENTRY</span>
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
                      <div className="sa-kpi-tag">Slot Reserved & Access Card Synced</div>
                    </div>
                    <div className="sa-kpi-item">
                      <div className="sa-kpi-title">Swimming Pool Pass</div>
                      <div className="sa-kpi-amount">Digital Pass</div>
                      <div className="sa-kpi-tag">Strict Resident-Only Capacity Control</div>
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

      {/* Feature Pillars Section */}
      <section className="sa-section" id="features">
        <div className="sa-container">
          <span className="sa-sec-badge">ENGINEERED FOR EXCELLENCE</span>
          <h2 className="sa-sec-title">The Six Pillars of SocietyArena</h2>
          <p className="sa-sec-sub">
            Every feature is fine-tuned to solve the exact pain points faced by modern RWAs, 
            residents, and security supervisors.
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

            {/* Feature 2 */}
            <div className="sa-feature-card">
              <div className="sa-feature-icon">
                <ShieldCheck size={26} />
              </div>
              <h3 className="sa-feature-title">Smart Gate & High-Security Log</h3>
              <p className="sa-feature-desc">
                Transform your security gate with real-time digital entry passes, 
                automated delivery agent check-ins, and biometric staff attendance tracking.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Pre-approved guest invites via shareable QR pass</li>
                <li><Check size={14} /> Over-the-phone and push approval for couriers</li>
                <li><Check size={14} /> Complete daily logs of maids, drivers, and vendors</li>
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
                Pay dues, book amenities, approve visitors, and stay informed on the go.
              </p>
              <ul className="sa-feature-points">
                <li><Check size={14} /> Hindi, Tamil, Telugu, Kannada, Marathi & English</li>
                <li><Check size={14} /> Digital Resident Identity card for clubhouse entry</li>
                <li><Check size={14} /> Instant offline caching & biometric login</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Role-Based Solutions */}
      <section className="sa-section" id="solutions">
        <div className="sa-container">
          <span className="sa-sec-badge">TAILORED EXPERIENCES</span>
          <h2 className="sa-sec-title">Engineered for Every Stakeholder</h2>
          <p className="sa-sec-sub">
            Whether you are on the management committee, a proud homeowner, or guarding the main gate, 
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
              <button 
                className={`sa-role-tab-btn ${activeRoleTab === 'security' ? 'active' : ''}`}
                onClick={() => setActiveRoleTab('security')}
              >
                <Lock size={18} /> For Security & Facility Staff
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
                        <div className="sa-bullet-desc">Send immediate SMS or app notifications to all towers in case of power, water, or lift emergencies.</div>
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
                    in 10 seconds via Google Pay or PhonePe, approve visitor entry from bed, 
                    and get maintenance issues fixed without chasing the society manager.
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
                        <div className="sa-bullet-label">Guest & Delivery Pre-Approval</div>
                        <div className="sa-bullet-desc">Send WhatsApp entry passes to friends. Avoid unnecessary intercom calls during meetings.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Clubhouse & Sports Slot Booking</div>
                        <div className="sa-bullet-desc">Book the swimming pool or tennis court ahead of time with clear slot availability.</div>
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

            {activeRoleTab === 'security' && (
              <div className="sa-role-content">
                <div className="sa-role-text">
                  <h3>Ironclad Gate Security with Ultra-Simple Guard Tablet</h3>
                  <p>
                    Designed to be operated seamlessly by security guards of all education levels. 
                    Large buttons, multilingual voice prompts, vehicle number scanning, and instant photo verification.
                  </p>
                  <div className="sa-role-bullets">
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Quick Delivery Check-In</div>
                        <div className="sa-bullet-desc">Select Swiggy / Zomato / Amazon logo with 1 tap; flat owner automatically prompted.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Staff & Maid Attendance</div>
                        <div className="sa-bullet-desc">Tracks entry and exit timestamps of domestic helpers and maintenance workers.</div>
                      </div>
                    </div>
                    <div className="sa-role-bullet-item">
                      <div className="sa-bullet-icon"><Check size={14} /></div>
                      <div>
                        <div className="sa-bullet-label">Vehicle Parking Search</div>
                        <div className="sa-bullet-desc">Identify unknown parked cars immediately by entering the registration plate digits.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sa-role-card-display">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>MAIN GATE ENTRY TERMINAL</span>
                    <span style={{ fontSize: '0.75rem', background: '#10B981', color: '#050814', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
                      ONLINE
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                      🟢 <strong>Delivery Agent:</strong> Amazon • Tower B-301 (Approved)
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                      🟢 <strong>Guest:</strong> Dr. Rajesh Mehta • Flat A-102 (QR Pass Verified)
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                      🟢 <strong>Staff:</strong> Sunita Devi (Housemaid) • In-time 08:32 AM
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="sa-section" id="calculator">
        <div className="sa-container">
          <span className="sa-sec-badge">MEASURE THE VALUE</span>
          <h2 className="sa-sec-title">Society Savings & Efficiency Calculator</h2>
          <p className="sa-sec-sub">
            See how much time and money your apartment community saves every month with SocietyArena.
          </p>

          <div className="sa-calc-container">
            {/* Input Controls */}
            <div>
              <div className="sa-calc-input-group">
                <div className="sa-calc-label-row">
                  <span className="sa-calc-label">Total Flats / Units in Society</span>
                  <span className="sa-calc-val-badge">{calcFlats} Units</span>
                </div>
                <input 
                  type="range" 
                  min="30" 
                  max="1200" 
                  step="10" 
                  value={calcFlats}
                  onChange={(e) => setCalcFlats(Number(e.target.value))}
                  className="sa-slider"
                  id="slider-flats"
                />
              </div>

              <div className="sa-calc-input-group">
                <div className="sa-calc-label-row">
                  <span className="sa-calc-label">Average Monthly Maintenance per Flat</span>
                  <span className="sa-calc-val-badge">₹ {calcMaintenance.toLocaleString('en-IN')}</span>
                </div>
                <input 
                  type="range" 
                  min="1000" 
                  max="15000" 
                  step="250" 
                  value={calcMaintenance}
                  onChange={(e) => setCalcMaintenance(Number(e.target.value))}
                  className="sa-slider"
                  id="slider-maintenance"
                />
              </div>

              <div style={{ background: 'rgba(212, 175, 55, 0.1)', border: '1px solid var(--sa-border-gold)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--sa-gold-light)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                  <Zap size={18} />
                  <span>The SocietyArena Advantage</span>
                </div>
                <p style={{ fontSize: '0.825rem', color: 'var(--sa-text-muted)', margin: 0 }}>
                  Automated recurring reminders reduce delayed dues by up to 88% within 45 days of launch.
                </p>
              </div>
            </div>

            {/* Calculated Output Box */}
            <div className="sa-calc-results-box">
              <div className="sa-result-row">
                <div>
                  <div className="sa-result-metric-lbl">Total Annual Society Fund Managed</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-subtle)' }}>Dues processed smoothly without manual cash</div>
                </div>
                <div className="sa-result-metric-val">
                  ₹ {(annualCollection / 100000).toFixed(2)} Lakhs
                </div>
              </div>

              <div className="sa-result-row">
                <div>
                  <div className="sa-result-metric-lbl">Hours Saved by Committee Each Month</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-subtle)' }}>Zero manual spreadsheets or payment receipting</div>
                </div>
                <div className="sa-result-metric-val" style={{ color: '#38BDF8' }}>
                  ~ {hoursSavedPerMonth} Hours / mo
                </div>
              </div>

              <div className="sa-result-row">
                <div>
                  <div className="sa-result-metric-lbl">Estimated Leakage & Penalty Prevented</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--sa-text-subtle)' }}>Through automated GST logs & audit trails</div>
                </div>
                <div className="sa-result-metric-val" style={{ color: '#10B981' }}>
                  ₹ {(estimatedLeakagePrevented / 1000).toFixed(0)}K / yr
                </div>
              </div>

              <a href="#demo" className="sa-btn-primary-lg" style={{ width: '100%', justifyContent: 'center' }}>
                <span>Claim These Savings for Your Society</span>
                <ArrowRight size={18} />
              </a>
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
                Experience seamless payments, instant visitor approvals, and community alerts directly from your pocket.
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
                  src="/societyarena-logo.jpeg" 
                  alt="SocietyArena Mobile App" 
                  style={{ width: '100%', borderRadius: '24px', display: 'block' }} 
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

      {/* Client Testimonials */}
      <section className="sa-section" id="testimonials">
        <div className="sa-container">
          <span className="sa-sec-badge">TESTED & TRUSTED</span>
          <h2 className="sa-sec-title">What Society Presidents & Residents Say</h2>
          <p className="sa-sec-sub">
            Read authentic feedback from housing societies that switched to SocietyArena.
          </p>

          <div className="sa-reviews-grid">
            <div className="sa-review-card">
              <div>
                <div className="sa-stars">
                  <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                </div>
                <p className="sa-review-quote">
                  "Before SocietyArena, our managing committee spent 15 days every month chasing maintenance dues. 
                  Now 95% of our 240 owners pay within the first 4 days via UPI! It has brought complete peace of mind."
                </p>
              </div>
              <div className="sa-reviewer-row">
                <div className="sa-reviewer-avatar">RK</div>
                <div>
                  <div className="sa-reviewer-name">Rajesh Kulkarni</div>
                  <div className="sa-reviewer-role">RWA President • Palm Meadows Residency, Bengaluru</div>
                </div>
              </div>
            </div>

            <div className="sa-review-card">
              <div>
                <div className="sa-stars">
                  <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                </div>
                <p className="sa-review-quote">
                  "The gate security and delivery management is so seamless. When courier agents arrive, 
                  I get a clean photo alert on my phone. The clubhouse booking also works flawlessly with zero disputes."
                </p>
              </div>
              <div className="sa-reviewer-row">
                <div className="sa-reviewer-avatar">SP</div>
                <div>
                  <div className="sa-reviewer-name">Sneha Paranjpe</div>
                  <div className="sa-reviewer-role">Flat Owner • Godrej Horizon, Pune</div>
                </div>
              </div>
            </div>

            <div className="sa-review-card">
              <div>
                <div className="sa-stars">
                  <Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" /><Star size={16} fill="currentColor" />
                </div>
                <p className="sa-review-quote">
                  "Our accounting audit passed with flying colors for the first time in 6 years. 
                  Every single expense, GST input, and vendor payout was transparently documented in SocietyArena."
                </p>
              </div>
              <div className="sa-reviewer-row">
                <div className="sa-reviewer-avatar">AN</div>
                <div>
                  <div className="sa-reviewer-name">Anand Narayanan</div>
                  <div className="sa-reviewer-role">Treasurer • Silver Crest Towers, Hyderabad</div>
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
              Our society onboarding specialists will tailor a customized walkthrough for your managing committee.
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
                  Thank you! Our regional representative is reaching out to you shortly at <strong>{demoForm.phoneNumber}</strong>. 
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
                    placeholder="e.g. Bengaluru, Mumbai, Delhi, Pune" 
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
                    placeholder="Your Full Name (Committee Member / Resident)" 
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
                    placeholder="e.g. 9876543210" 
                    className="sa-form-input"
                    value={demoForm.phoneNumber}
                    onChange={(e) => setDemoForm({ ...demoForm, phoneNumber: e.target.value })}
                  />
                </div>

                <div className="sa-form-group full-width">
                  <label className="sa-form-label">Approximate Number of Flats</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 150 Flats" 
                    className="sa-form-input"
                    value={demoForm.flatsCount}
                    onChange={(e) => setDemoForm({ ...demoForm, flatsCount: e.target.value })}
                  />
                </div>

                <div className="sa-form-group full-width">
                  <label className="sa-form-label">Specific Questions or Requirements</label>
                  <textarea 
                    rows={3} 
                    placeholder="Tell us about current challenges with billing, security gates, or existing software..." 
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
            Have questions about onboarding, pricing, or data migration? We've got answers.
          </p>

          <div className="sa-faq-grid">
            {[
              {
                q: 'How fast can our society be onboarded onto SocietyArena?',
                a: 'Standard onboarding takes between 24 to 48 hours. Our technical team uploads your existing flat owner roster, tenant data, vehicle numbers, and opening balances via Excel or CSV with zero downtime.'
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
              },
              {
                q: 'What hardware is required for the main gate security guards?',
                a: 'Any standard, budget Android tablet or smartphone connected to Wi-Fi or mobile data is all you need. We provide complete setup guidance and guard training.'
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

      {/* Luxury Footer */}
      <footer className="sa-footer">
        <div className="sa-container">
          <div className="sa-footer-grid">
            <div className="sa-footer-brand">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img 
                  src="/societyarena-logo.jpeg" 
                  alt="SocietyArena" 
                  style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }}
                />
                <span className="sa-brand-name" style={{ fontSize: '1.25rem' }}>SOCIETYARENA</span>
              </div>
              <p>
                India's premier smart society management operating system. Empowering gated communities 
                with digital finance, biometric security, and elevated resident experiences.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
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
                <li><a href="#features">Gate & Security</a></li>
                <li><a href="#features">Helpdesk SLA</a></li>
                <li><a href="#features">Clubhouse Booking</a></li>
                <li><a href="#calculator">Savings Calculator</a></li>
              </ul>
            </div>

            <div className="sa-footer-col">
              <h4>Solutions</h4>
              <ul>
                <li><a href="#solutions">For RWA Committees</a></li>
                <li><a href="#solutions">For Residents & Owners</a></li>
                <li><a href="#solutions">For Security Guards</a></li>
                <li><a href="#mobile-app">Android Mobile APK</a></li>
                <li><a href="/login">Platform Sign In</a></li>
              </ul>
            </div>

            <div className="sa-footer-col">
              <h4>Sales Hotline & Support</h4>
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
                  <span style={{ color: 'var(--sa-text-muted)' }}>✉️ sales@societyarena.com</span>
                </li>
                <li>
                  <span style={{ color: 'var(--sa-text-subtle)' }}>📍 Pan-India Deployment & On-Site Support</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="sa-footer-bottom">
            <div>
              © 2026 SocietyArena Technologies. All rights reserved. Built with pride for luxury residential communities.
            </div>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              <a href="/login" style={{ color: 'var(--sa-text-muted)', textDecoration: 'none' }}>Client Portal Login</a>
              <a href="#demo" style={{ color: 'var(--sa-gold-light)', textDecoration: 'none' }}>Request Society Demo</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
