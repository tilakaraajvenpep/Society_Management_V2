import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Building, Users, Settings, LogOut, Plus, Trash2, Search, Filter, 
  CreditCard, Menu, X, AlertCircle, Activity, Loader2, Sliders, ShieldAlert, 
  Save, Smartphone, Globe, Check 
} from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { PageLoader, TableLoader } from '../components/LoadingSpinner';

const getTenantUrl = (slug: string) => {
  const { protocol, host } = window.location;
  const cleanHost = host.replace(/^www\./, '');
  return `${protocol}//${slug}.${cleanHost}`;
};

const SuperAdminDashboard = () => {
  const { logout, token } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [stats, setStats] = useState({ activeSocieties: 0, inactiveSocieties: 0, totalAdmins: 0, platformRevenue: 0, totalProcessed: 0, totalResidents: 0, systemStatus: 'Online' });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);

  // Menu Settings states
  const [selectedMenuTenantId, setSelectedMenuTenantId] = useState<string>('');
  const [menuSubTab, setMenuSubTab] = useState<'admin' | 'member'>('admin');
  const [menuConfigLoading, setMenuConfigLoading] = useState(false);
  const [savingMenuConfig, setSavingMenuConfig] = useState(false);
  const [saMenuConfig, setSaMenuConfig] = useState<{
    admin: Record<string, boolean>;
    memberWeb: Record<string, boolean>;
    memberMobile: Record<string, boolean>;
  }>({
    admin: {
      overview: true,
      members: true,
      payments: true,
      'ledger-reconciliation': true,
      upcoming: true,
      expenses: true,
      helpdesk: true,
      vendors: true,
      events: true,
      notifications: true,
      staff: true,
      logs: true,
      reports: true,
      settings: true
    },
    memberWeb: {
      overview: true,
      'dues-history': true,
      payments: true,
      receipts: true,
      events: true,
      helpdesk: true,
      profile: true
    },
    memberMobile: {
      dashboard: true,
      payments: true,
      receipts: true,
      events: true,
      helpdesk: true,
      profile: true
    }
  });

  // Maintenance Settings states
  const [maintenanceScope, setMaintenanceScope] = useState<'global' | 'tenant'>('global');
  const [selectedMaintTenantId, setSelectedMaintTenantId] = useState<string>('');
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [globalMaintenance, setGlobalMaintenance] = useState({
    isMaintenance: false,
    targets: ['ADMIN_WEB', 'MEMBER_WEB', 'MOBILE_APP'],
    message: 'SocietyArena platform is undergoing scheduled maintenance. Please check back shortly.',
    whitelistedEmails: [] as string[]
  });
  const [tenantMaintenanceList, setTenantMaintenanceList] = useState<any[]>([]);
  const [tenantMaintForm, setTenantMaintForm] = useState({
    isMaintenance: false,
    targets: ['ADMIN_WEB', 'MEMBER_WEB', 'MOBILE_APP'],
    message: '',
    whitelistedEmails: [] as string[],
    syncMobileApp: true
  });
  const [whitelistEmailInput, setWhitelistEmailInput] = useState('');

  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    address: '', 
    maintenanceAmount: 0,
    status: 'ACTIVE',
    slug: '',
    billingCycle: 'MONTHLY',
    subscriptionAmount: 0,
    startDate: new Date().toISOString().split('T')[0],
    lastRenewalDate: '',
    nextRenewalDate: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    enableForums: false
  });

  useEffect(() => {
    if (!editingTenantId && newTenant.startDate) {
      const start = new Date(newTenant.startDate);
      let next = new Date(start);
      if (newTenant.billingCycle === 'MONTHLY') next.setMonth(next.getMonth() + 1);
      else if (newTenant.billingCycle === 'QUARTERLY') next.setMonth(next.getMonth() + 3);
      else if (newTenant.billingCycle === 'ANNUAL') next.setFullYear(next.getFullYear() + 1);
      
      setNewTenant(prev => ({ ...prev, nextRenewalDate: next.toISOString().split('T')[0], lastRenewalDate: newTenant.startDate }));
    }
  }, [newTenant.startDate, newTenant.billingCycle, editingTenantId]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchTenants(), fetchStats()]);
      setLoading(false);
    };
    loadAll();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await axios.get('/tenants', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Tenants data:', response.data);
      setTenants(response.data);
    } catch (err) {
      console.error('Error fetching tenants', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get('/platform/platform-stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats', err);
    }
  };

  const handleSubmitTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingTenantId) {
        await axios.patch(`/tenants/${editingTenantId}`, newTenant, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/tenants', newTenant, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setShowModal(false);
      setEditingTenantId(null);
      await Promise.all([fetchTenants(), fetchStats()]);
      showToast(editingTenantId ? 'Society updated successfully!' : 'Society registered successfully!', 'success');
    } catch (err) {
      console.error('Error submitting tenant', err);
      showToast('Error saving society details.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await axios.patch(`/tenants/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTenants();
      showToast('Status updated successfully!', 'success');
    } catch (err) {
      console.error('Error toggling status', err);
      showToast('Failed to update status.', 'error');
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!await confirm({
      title: 'Delete Society',
      message: 'Are you sure you want to delete this society? This action is irreversible.',
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTenants();
      fetchStats();
      showToast('Society deleted successfully.', 'success');
    } catch (err) {
      console.error('Error deleting tenant', err);
      showToast('Failed to delete society.', 'error');
    }
  };

  // ── Menu Settings Handlers ──────────────────────────────────────────────────
  const fetchTenantMenuConfig = async (tenantId: string) => {
    if (!tenantId) return;
    setMenuConfigLoading(true);
    try {
      const res = await axios.get(`/tenants/${tenantId}/menu-config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.superadminMenuConfig) {
        setSaMenuConfig(prev => ({
          admin: { ...prev.admin, ...(res.data.superadminMenuConfig.admin || {}) },
          memberWeb: { ...prev.memberWeb, ...(res.data.superadminMenuConfig.memberWeb || {}) },
          memberMobile: { ...prev.memberMobile, ...(res.data.superadminMenuConfig.memberMobile || {}) }
        }));
      }
    } catch (err) {
      console.error('Error fetching tenant menu config', err);
      showToast('Failed to load menu settings for selected society.', 'error');
    } finally {
      setMenuConfigLoading(false);
    }
  };

  const handleSaveMenuConfig = async () => {
    if (!selectedMenuTenantId) {
      showToast('Please select a society first.', 'warning');
      return;
    }
    setSavingMenuConfig(true);
    try {
      await axios.patch(`/tenants/${selectedMenuTenantId}/superadmin-menu-config`, saMenuConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Menu access permissions saved successfully!', 'success');
    } catch (err) {
      console.error('Error saving menu config', err);
      showToast('Failed to save menu settings.', 'error');
    } finally {
      setSavingMenuConfig(false);
    }
  };

  // ── Maintenance Settings Handlers ───────────────────────────────────────────
  const fetchMaintenanceSettings = async () => {
    setMaintenanceLoading(true);
    try {
      const res = await axios.get('/platform/maintenance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data?.globalMaintenance) {
        setGlobalMaintenance(res.data.globalMaintenance);
      }
      if (res.data?.tenants) {
        setTenantMaintenanceList(res.data.tenants);
        const targetId = selectedMaintTenantId || res.data.tenants[0]?.id;
        if (targetId) {
          const match = res.data.tenants.find((t: any) => t.id === targetId);
          if (match) {
            setSelectedMaintTenantId(match.id);
            setTenantMaintForm({
              isMaintenance: !!match.maintenanceConfig?.isMaintenance,
              targets: match.maintenanceConfig?.targets || ['ADMIN_WEB', 'MEMBER_WEB', 'MOBILE_APP'],
              message: match.maintenanceConfig?.message || `${match.name} portal is currently under maintenance.`,
              whitelistedEmails: match.maintenanceConfig?.whitelistedEmails || [],
              syncMobileApp: true
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching maintenance settings', err);
      showToast('Failed to load maintenance configuration.', 'error');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const handleSelectMaintTenant = (tenantId: string) => {
    setSelectedMaintTenantId(tenantId);
    const match = tenantMaintenanceList.find((t: any) => t.id === tenantId);
    if (match?.maintenanceConfig) {
      setTenantMaintForm({
        isMaintenance: !!match.maintenanceConfig.isMaintenance,
        targets: match.maintenanceConfig.targets || ['ADMIN_WEB', 'MEMBER_WEB', 'MOBILE_APP'],
        message: match.maintenanceConfig.message || `${match.name} portal is currently under maintenance.`,
        whitelistedEmails: match.maintenanceConfig.whitelistedEmails || [],
        syncMobileApp: true
      });
    } else {
      setTenantMaintForm({
        isMaintenance: false,
        targets: ['ADMIN_WEB', 'MEMBER_WEB', 'MOBILE_APP'],
        message: match ? `${match.name} portal is currently under maintenance.` : '',
        whitelistedEmails: [],
        syncMobileApp: true
      });
    }
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      if (maintenanceScope === 'global') {
        await axios.patch('/platform/maintenance/global', globalMaintenance, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Global maintenance settings updated successfully!', 'success');
      } else {
        if (!selectedMaintTenantId) {
          showToast('Please select a society to update maintenance.', 'warning');
          setSavingMaintenance(false);
          return;
        }
        await axios.patch(`/platform/maintenance/tenant/${selectedMaintTenantId}`, tenantMaintForm, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast('Society maintenance settings updated successfully!', 'success');
      }
      await fetchMaintenanceSettings();
    } catch (err: any) {
      console.error('Error saving maintenance settings', err);
      showToast(err.response?.data?.message || 'Failed to save maintenance settings.', 'error');
    } finally {
      setSavingMaintenance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'menu-settings') {
      if (!selectedMenuTenantId && tenants.length > 0) {
        setSelectedMenuTenantId(tenants[0].id);
        fetchTenantMenuConfig(tenants[0].id);
      } else if (selectedMenuTenantId) {
        fetchTenantMenuConfig(selectedMenuTenantId);
      }
    } else if (activeTab === 'maintenance-settings') {
      fetchMaintenanceSettings();
    }
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--success)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--success)' }}>
                  <Building size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Active Societies</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.activeSocieties}</div>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--warning)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--warning)' }}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Inactive / Pending</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.inactiveSocieties}</div>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--primary)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--primary)' }}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Platform Revenue</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>₹{stats.platformRevenue.toLocaleString()}</div>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--accent)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--accent)' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Processed</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{stats.totalProcessed.toLocaleString()}</div>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--accent)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--accent)' }}>
                  <Users size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Total Office Bearers</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{stats.totalAdmins}</div>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', borderLeft: '4px solid var(--success)', padding: '1.5rem' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '0.75rem', color: 'var(--success)' }}>
                  <Activity size={24} />
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>System Status</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--success)' }}>{stats.systemStatus}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem' }}>Recent Societies</h3>
                <button className="btn btn-secondary" onClick={() => setActiveTab('societies')}>View All</button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Society Name</th>
                      <th>Location</th>
                      <th>Billing Plan</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <TableLoader colSpan={5} message="Loading societies..." />
                    ) : tenants.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No recent data.</td>
                      </tr>
                    ) : (
                      tenants.slice(0, 5).map((t: any) => (
                        <tr key={t.id}>
                          <td><strong>{t.name}</strong></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{t.address}</td>
                          <td>{t.billingCycle}</td>
                          <td>
                            <button 
                              onClick={() => handleToggleStatus(t.id)}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <span className={`badge ${t.status === 'INACTIVE' ? 'badge-error' : 'badge-success'}`} style={{ cursor: 'pointer' }}>
                                {t.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                              </span>
                            </button>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '0.4rem' }}
                                onClick={() => {
                                  const admin = t.users && t.users.length > 0 ? t.users[0] : null;
                                  setEditingTenantId(t.id);
                                  setNewTenant({
                                    name: t.name,
                                    address: t.address || '',
                                    maintenanceAmount: t.maintenanceAmount || 0,
                                    status: t.status,
                                    slug: t.slug || '',
                                    billingCycle: t.billingCycle || 'MONTHLY',
                                    subscriptionAmount: t.subscriptionAmount || 0,
                                    startDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                    lastRenewalDate: t.lastRenewalDate || '',
                                    nextRenewalDate: t.nextRenewalDate || '',
                                    adminName: admin ? admin.name : '',
                                    adminEmail: admin ? admin.email : '',
                                    adminPassword: '',
                                    enableForums: t.enableForums || false
                                  });
                                  setShowModal(true);
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                                onClick={() => handleDeleteTenant(t.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        );
      case 'societies':
        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>All Societies</h3>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <div style={{ position: 'relative', width: '240px' }}>
                  <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                  <input type="text" placeholder="Search societies..." style={{ paddingLeft: '2.5rem' }} />
                </div>
                <button className="btn btn-secondary"><Filter size={16} /> Filter</button>
              </div>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Society Name</th>
                    <th>URL / Slug</th>
                    <th>Billing Plan</th>
                    <th>Subscription</th>
                    <th>Next Renewal</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoader colSpan={7} message="Loading all societies..." />
                  ) : tenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        No societies registered yet. Click "Register New Society" to get started.
                      </td>
                    </tr>
                  ) : (
                    tenants.map((t: any) => (
                      <tr key={t.id}>
                        <td>
                          <strong>{t.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t.address}</div>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8125rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>{t.slug}</code>
                          <div style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>
                            <a href={getTenantUrl(t.slug)} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>Visit Site</a>
                          </div>
                        </td>
                        <td><span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>{t.billingCycle}</span></td>
                        <td>
                          <div style={{ fontWeight: 600 }}>₹{t.subscriptionAmount?.toLocaleString()}</div>
                        </td>
                        <td style={{ color: t.nextRenewalDate && new Date(t.nextRenewalDate) < new Date() ? 'var(--error)' : 'inherit' }}>
                          {t.nextRenewalDate ? new Date(t.nextRenewalDate).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <button 
                            onClick={() => handleToggleStatus(t.id)}
                            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <span className={`badge ${t.status === 'INACTIVE' ? 'badge-error' : 'badge-success'}`} style={{ cursor: 'pointer' }}>
                              {t.status === 'INACTIVE' ? 'Inactive' : 'Active'}
                            </span>
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary" 
                              style={{ padding: '0.4rem' }}
                              onClick={() => {
                                const admin = t.users && t.users.length > 0 ? t.users[0] : null;
                                setEditingTenantId(t.id);
                                setNewTenant({
                                  name: t.name,
                                  address: t.address || '',
                                  maintenanceAmount: t.maintenanceAmount || 0,
                                  status: t.status,
                                  slug: t.slug || '',
                                  billingCycle: t.billingCycle || 'MONTHLY',
                                  subscriptionAmount: t.subscriptionAmount || 0,
                                  startDate: t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                                  lastRenewalDate: t.lastRenewalDate || '',
                                  nextRenewalDate: t.nextRenewalDate || '',
                                  adminName: admin ? admin.name : '',
                                  adminEmail: admin ? admin.email : '',
                                  adminPassword: '',
                                  enableForums: t.enableForums || false
                                });
                                setShowModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button 
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)' }}
                              onClick={() => handleDeleteTenant(t.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'usage':
        return (
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Platform Usage</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Monitor server load, active sessions, and database health.</p>
            <div style={{ marginTop: '2rem', padding: '2rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', textAlign: 'center' }}>
              <Users size={48} style={{ color: 'var(--text-secondary)', marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Usage analytics and system logs will appear here.</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="card" style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Global Platform Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>System Maintenance Mode</label>
                <select style={{ width: '100%' }}>
                  <option>Disabled (Online)</option>
                  <option>Scheduled Maintenance</option>
                  <option>Emergency Shutdown</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>New Registrations</label>
                <select style={{ width: '100%' }}>
                  <option>Public (Anyone can register)</option>
                  <option>Invite Only</option>
                  <option>Closed</option>
                </select>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Save Global Settings</button>
            </div>
          </div>
        );

      case 'menu-settings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sliders size={22} style={{ color: 'var(--primary)' }} /> Society Menu Permissions
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Turn menus ON or OFF for each society. Only menus turned ON here can be seen or customized by society admins and residents.
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select Society:</label>
                  <select 
                    value={selectedMenuTenantId} 
                    onChange={(e) => {
                      setSelectedMenuTenantId(e.target.value);
                      fetchTenantMenuConfig(e.target.value);
                    }}
                    style={{ minWidth: '220px', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600 }}
                  >
                    {tenants.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>

                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveMenuConfig}
                    disabled={savingMenuConfig || menuConfigLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: '150px', justifyContent: 'center' }}
                  >
                    {savingMenuConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>{savingMenuConfig ? 'Saving...' : 'Save Settings'}</span>
                  </button>
                </div>
              </div>

              {/* Subtabs: Admin Portal vs Member Web and Mobile App */}
              <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('admin')}
                  style={{
                    padding: '0.6rem 1.25rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: menuSubTab === 'admin' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: menuSubTab === 'admin' ? '3px solid var(--primary)' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Building size={16} /> Admin Portal Menus
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('member')}
                  style={{
                    padding: '0.6rem 1.25rem',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: menuSubTab === 'member' ? 'var(--primary)' : 'var(--text-secondary)',
                    borderBottom: menuSubTab === 'member' ? '3px solid var(--primary)' : '3px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Globe size={16} /> Member Web & Mobile App Menus
                </button>
              </div>
            </div>

            {menuConfigLoading ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading society menu configuration...</p>
              </div>
            ) : menuSubTab === 'admin' ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Admin Portal Menus</h4>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      Enable or disable access to specific administrative sections for office bearers of this society.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                      onClick={() => {
                        const allOn = Object.keys(saMenuConfig.admin).reduce((acc: any, k) => { acc[k] = true; return acc; }, {});
                        setSaMenuConfig(prev => ({ ...prev, admin: allOn }));
                      }}
                    >
                      Enable All
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                      onClick={() => {
                        const allOff = Object.keys(saMenuConfig.admin).reduce((acc: any, k) => { acc[k] = false; return acc; }, {});
                        setSaMenuConfig(prev => ({ ...prev, admin: allOff }));
                      }}
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                  {[
                    { id: 'overview', name: 'Overview / Dashboard', desc: 'Core executive summary & KPI dashboard' },
                    { id: 'members', name: 'Members & Residents', desc: 'Flat units, tenant accounts & resident directory' },
                    { id: 'payments', name: 'Payments & Collections', desc: 'Record offline payments & cash handover' },
                    { id: 'ledger-reconciliation', name: 'Monthly Ledger Reconciliation', desc: 'Bank statement & monthly dues reconciliation' },
                    { id: 'upcoming', name: 'Upcoming Dues & Defaulters', desc: 'Outstanding balances and overdue notifications' },
                    { id: 'expenses', name: 'Expenses & Vouchers', desc: 'Society expenditure, vendor bills & bank accounts' },
                    { id: 'helpdesk', name: 'Helpdesk & Complaints', desc: 'Resident ticketing system & issue tracker' },
                    { id: 'vendors', name: 'Vendor Management', desc: 'Contractors, service providers & AMC contracts' },
                    { id: 'events', name: 'Events Calendar', desc: 'Community festivals, meetings & RSVPs' },
                    { id: 'notifications', name: 'Announcements & Broadcasts', desc: 'SMS, push & email notices to residents' },
                    { id: 'staff', name: 'Staff & Office Bearers', desc: 'Designations, committee members & guards' },
                    { id: 'logs', name: 'Audit & Activity Logs', desc: 'Immutable trail of financial & admin operations' },
                    { id: 'reports', name: 'Reports & P&L Analytics', desc: 'Monthly P&L, balance sheets & PDF exports' },
                    { id: 'settings', name: 'Society Settings', desc: 'Rules, banking details & maintenance pricing' }
                  ].map(item => {
                    const isEnabled = saMenuConfig.admin[item.id] !== false;
                    return (
                      <div 
                        key={item.id} 
                        style={{
                          padding: '1rem',
                          borderRadius: '0.75rem',
                          border: `1px solid ${isEnabled ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-color)'}`,
                          backgroundColor: isEnabled ? 'rgba(37, 99, 235, 0.03)' : 'var(--bg-secondary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                            {item.desc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSaMenuConfig(prev => ({
                            ...prev,
                            admin: { ...prev.admin, [item.id]: !isEnabled }
                          }))}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '2rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isEnabled ? 'var(--success)' : 'var(--text-secondary)',
                            color: '#fff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            minWidth: '70px',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isEnabled ? <Check size={12} /> : <X size={12} />}
                          <span>{isEnabled ? 'ON' : 'OFF'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Member Web Portal */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={18} style={{ color: 'var(--primary)' }} /> Member Web Portal Menus
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Permitted menus for residents when logging in via web browser.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => {
                          const allOn = Object.keys(saMenuConfig.memberWeb).reduce((acc: any, k) => { acc[k] = true; return acc; }, {});
                          setSaMenuConfig(prev => ({ ...prev, memberWeb: allOn }));
                        }}
                      >
                        Enable All
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => {
                          const allOff = Object.keys(saMenuConfig.memberWeb).reduce((acc: any, k) => { acc[k] = false; return acc; }, {});
                          setSaMenuConfig(prev => ({ ...prev, memberWeb: allOff }));
                        }}
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {[
                      { id: 'overview', name: 'Overview / Dashboard', desc: 'Outstanding dues summary & quick pay' },
                      { id: 'dues-history', name: 'Monthly Dues History', desc: '12-month calendar ledger & paid status' },
                      { id: 'payments', name: 'Pay Maintenance', desc: 'UPI QR code & bank transfer submission' },
                      { id: 'receipts', name: 'Payment Receipts', desc: 'Download PDF / print maintenance invoices' },
                      { id: 'events', name: 'Community Events', desc: 'View upcoming society celebrations & meetings' },
                      { id: 'helpdesk', name: 'Helpdesk & Complaints', desc: 'Submit tickets to society office bearers' },
                      { id: 'profile', name: 'My Profile', desc: 'Personal details, flat number & password' }
                    ].map(item => {
                      const isEnabled = saMenuConfig.memberWeb[item.id] !== false;
                      return (
                        <div 
                          key={item.id} 
                          style={{
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: `1px solid ${isEnabled ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-color)'}`,
                            backgroundColor: isEnabled ? 'rgba(37, 99, 235, 0.03)' : 'var(--bg-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {item.desc}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSaMenuConfig(prev => ({
                              ...prev,
                              memberWeb: { ...prev.memberWeb, [item.id]: !isEnabled }
                            }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '2rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isEnabled ? 'var(--success)' : 'var(--text-secondary)',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              minWidth: '65px',
                              justifyContent: 'center'
                            }}
                          >
                            {isEnabled ? <Check size={12} /> : <X size={12} />}
                            <span>{isEnabled ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Member Mobile App */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Smartphone size={18} style={{ color: 'var(--primary)' }} /> Member Mobile App Menus
                      </h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        Permitted navigation destinations inside the SocietyArena Android and iOS apps.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => {
                          const allOn = Object.keys(saMenuConfig.memberMobile).reduce((acc: any, k) => { acc[k] = true; return acc; }, {});
                          setSaMenuConfig(prev => ({ ...prev, memberMobile: allOn }));
                        }}
                      >
                        Enable All
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.7rem' }}
                        onClick={() => {
                          const allOff = Object.keys(saMenuConfig.memberMobile).reduce((acc: any, k) => { acc[k] = false; return acc; }, {});
                          setSaMenuConfig(prev => ({ ...prev, memberMobile: allOff }));
                        }}
                      >
                        Disable All
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                    {[
                      { id: 'dashboard', name: 'Home Tab', desc: 'Greeting, dues hero banner & recent activity' },
                      { id: 'payments', name: 'Payments Tab', desc: 'Monthly dues ledger & offline QR submission' },
                      { id: 'receipts', name: 'Receipts Tab', desc: 'Digital receipt archive & instant download' },
                      { id: 'events', name: 'Events Tab', desc: 'Upcoming festivals & community meetings' },
                      { id: 'helpdesk', name: 'Helpdesk Tab', desc: 'Create complaint tickets & review status' },
                      { id: 'profile', name: 'Profile Tab', desc: 'View flat info, contact details & language switcher' }
                    ].map(item => {
                      const isEnabled = saMenuConfig.memberMobile[item.id] !== false;
                      return (
                        <div 
                          key={item.id} 
                          style={{
                            padding: '1rem',
                            borderRadius: '0.75rem',
                            border: `1px solid ${isEnabled ? 'rgba(37, 99, 235, 0.3)' : 'var(--border-color)'}`,
                            backgroundColor: isEnabled ? 'rgba(37, 99, 235, 0.03)' : 'var(--bg-secondary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', color: isEnabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                              {item.desc}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSaMenuConfig(prev => ({
                              ...prev,
                              memberMobile: { ...prev.memberMobile, [item.id]: !isEnabled }
                            }))}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '2rem',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isEnabled ? 'var(--success)' : 'var(--text-secondary)',
                              color: '#fff',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              minWidth: '65px',
                              justifyContent: 'center'
                            }}
                          >
                            {isEnabled ? <Check size={12} /> : <X size={12} />}
                            <span>{isEnabled ? 'ON' : 'OFF'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'maintenance-settings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldAlert size={22} style={{ color: 'var(--warning)' }} /> Maintenance Mode Settings
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Put web portals or mobile app under maintenance. Unauthorized users cannot log in; whitelisted testers can access for verification.
                  </p>
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveMaintenance}
                  disabled={savingMaintenance || maintenanceLoading}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minWidth: '160px', justifyContent: 'center' }}
                >
                  {savingMaintenance ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>{savingMaintenance ? 'Saving...' : 'Apply Maintenance'}</span>
                </button>
              </div>

              {/* Scope Switcher */}
              <div style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.75rem', width: 'fit-content' }}>
                <button
                  type="button"
                  onClick={() => setMaintenanceScope('global')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    backgroundColor: maintenanceScope === 'global' ? 'var(--card-bg)' : 'transparent',
                    color: maintenanceScope === 'global' ? 'var(--primary)' : 'var(--text-secondary)',
                    boxShadow: maintenanceScope === 'global' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Globe size={16} /> Entire Platform (All Societies)
                </button>
                <button
                  type="button"
                  onClick={() => setMaintenanceScope('tenant')}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: '0.5rem',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    backgroundColor: maintenanceScope === 'tenant' ? 'var(--card-bg)' : 'transparent',
                    color: maintenanceScope === 'tenant' ? 'var(--primary)' : 'var(--text-secondary)',
                    boxShadow: maintenanceScope === 'tenant' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <Building size={16} /> Specific Society
                </button>
              </div>
            </div>

            {maintenanceLoading ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary)', margin: '0 auto 1rem' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading maintenance settings...</p>
              </div>
            ) : maintenanceScope === 'global' ? (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '0.75rem', backgroundColor: globalMaintenance.isMaintenance ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${globalMaintenance.isMaintenance ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: globalMaintenance.isMaintenance ? 'var(--error)' : 'var(--success)' }}>
                      Global Platform Status: {globalMaintenance.isMaintenance ? 'UNDER MAINTENANCE' : 'LIVE & OPERATIONAL'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {globalMaintenance.isMaintenance ? 'Normal logins are blocked across all societies on targeted platforms.' : 'All societies and mobile apps are operating normally.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlobalMaintenance(prev => ({ ...prev, isMaintenance: !prev.isMaintenance }))}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '2rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      backgroundColor: globalMaintenance.isMaintenance ? 'var(--error)' : 'var(--success)',
                      color: '#fff'
                    }}
                  >
                    {globalMaintenance.isMaintenance ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}
                  </button>
                </div>

                {/* Target Platforms */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Affected Platforms:
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ADMIN_WEB', label: 'Admin Web Portal' },
                      { id: 'MEMBER_WEB', label: 'Resident Web Portal' },
                      { id: 'MOBILE_APP', label: 'Resident Mobile App' }
                    ].map(target => {
                      const isChecked = globalMaintenance.targets.includes(target.id);
                      return (
                        <label key={target.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setGlobalMaintenance(prev => ({ ...prev, targets: [...prev.targets, target.id] }));
                              } else {
                                setGlobalMaintenance(prev => ({ ...prev, targets: prev.targets.filter(t => t !== target.id) }));
                              }
                            }}
                          />
                          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{target.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Maintenance Message */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Maintenance Notice Message:
                  </label>
                  <textarea 
                    rows={3}
                    value={globalMaintenance.message}
                    onChange={(e) => setGlobalMaintenance(prev => ({ ...prev, message: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.875rem', resize: 'vertical' }}
                    placeholder="Enter message displayed to users when maintenance is active..."
                  />
                </div>

                {/* Whitelist Emails */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Authorized Tester Whitelist:
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Users with these email addresses can bypass maintenance mode and log in normally for testing.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input 
                      type="email"
                      value={whitelistEmailInput}
                      onChange={(e) => setWhitelistEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const email = whitelistEmailInput.trim().toLowerCase();
                          if (email && !globalMaintenance.whitelistedEmails.includes(email)) {
                            setGlobalMaintenance(prev => ({ ...prev, whitelistedEmails: [...prev.whitelistedEmails, email] }));
                            setWhitelistEmailInput('');
                          }
                        }
                      }}
                      placeholder="e.g. tester@example.com"
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.875rem' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        const email = whitelistEmailInput.trim().toLowerCase();
                        if (email && !globalMaintenance.whitelistedEmails.includes(email)) {
                          setGlobalMaintenance(prev => ({ ...prev, whitelistedEmails: [...prev.whitelistedEmails, email] }));
                          setWhitelistEmailInput('');
                        }
                      }}
                    >
                      Add Tester
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {globalMaintenance.whitelistedEmails.length === 0 ? (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No tester emails added yet. Only Superadmin can log in during global maintenance.
                      </span>
                    ) : (
                      globalMaintenance.whitelistedEmails.map((email: string) => (
                        <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.6rem', borderRadius: '2rem', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {email}
                          <button 
                            type="button" 
                            onClick={() => setGlobalMaintenance(prev => ({ ...prev, whitelistedEmails: prev.whitelistedEmails.filter(e => e !== email) }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex' }}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Select Tenant */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Select Target Society:</label>
                  <select 
                    value={selectedMaintTenantId}
                    onChange={(e) => handleSelectMaintTenant(e.target.value)}
                    style={{ minWidth: '240px', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 600 }}
                  >
                    {tenants.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderRadius: '0.75rem', backgroundColor: tenantMaintForm.isMaintenance ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${tenantMaintForm.isMaintenance ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: tenantMaintForm.isMaintenance ? 'var(--error)' : 'var(--success)' }}>
                      Society Status: {tenantMaintForm.isMaintenance ? 'UNDER MAINTENANCE' : 'LIVE & OPERATIONAL'}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {tenantMaintForm.isMaintenance ? 'Access to this society is currently blocked on selected platforms.' : 'This society is live and accessible.'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTenantMaintForm(prev => ({ ...prev, isMaintenance: !prev.isMaintenance }))}
                    style={{
                      padding: '0.5rem 1.25rem',
                      borderRadius: '2rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      backgroundColor: tenantMaintForm.isMaintenance ? 'var(--error)' : 'var(--success)',
                      color: '#fff'
                    }}
                  >
                    {tenantMaintForm.isMaintenance ? 'Turn OFF Maintenance' : 'Turn ON Maintenance'}
                  </button>
                </div>

                {/* Target Platforms */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Affected Platforms:
                  </label>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {[
                      { id: 'ADMIN_WEB', label: 'Admin Web Portal' },
                      { id: 'MEMBER_WEB', label: 'Resident Web Portal' },
                      { id: 'MOBILE_APP', label: 'Resident Mobile App' }
                    ].map(target => {
                      const isChecked = tenantMaintForm.targets.includes(target.id);
                      return (
                        <label key={target.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.5rem 0.85rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: isChecked ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-secondary)' }}>
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTenantMaintForm(prev => ({ ...prev, targets: [...prev.targets, target.id] }));
                              } else {
                                setTenantMaintForm(prev => ({ ...prev, targets: prev.targets.filter(t => t !== target.id) }));
                              }
                            }}
                          />
                          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{target.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Sync with Mobile App Settings */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input 
                    type="checkbox"
                    id="syncMobile"
                    checked={tenantMaintForm.syncMobileApp}
                    onChange={(e) => setTenantMaintForm(prev => ({ ...prev, syncMobileApp: e.target.checked }))}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="syncMobile" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                    Synchronize with Mobile App Version Settings (automatically marks mobile app under maintenance)
                  </label>
                </div>

                {/* Maintenance Message */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Maintenance Notice Message:
                  </label>
                  <textarea 
                    rows={3}
                    value={tenantMaintForm.message}
                    onChange={(e) => setTenantMaintForm(prev => ({ ...prev, message: e.target.value }))}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.875rem', resize: 'vertical' }}
                    placeholder="Enter message displayed to users when maintenance is active..."
                  />
                </div>

                {/* Whitelist Emails */}
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Authorized Tester Whitelist:
                  </label>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    Users or admins with these email addresses can bypass maintenance mode and log in normally for testing.
                  </p>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input 
                      type="email"
                      value={whitelistEmailInput}
                      onChange={(e) => setWhitelistEmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const email = whitelistEmailInput.trim().toLowerCase();
                          if (email && !tenantMaintForm.whitelistedEmails.includes(email)) {
                            setTenantMaintForm(prev => ({ ...prev, whitelistedEmails: [...prev.whitelistedEmails, email] }));
                            setWhitelistEmailInput('');
                          }
                        }
                      }}
                      placeholder="e.g. dt@gmail.com or admin@society.com"
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.875rem' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        const email = whitelistEmailInput.trim().toLowerCase();
                        if (email && !tenantMaintForm.whitelistedEmails.includes(email)) {
                          setTenantMaintForm(prev => ({ ...prev, whitelistedEmails: [...prev.whitelistedEmails, email] }));
                          setWhitelistEmailInput('');
                        }
                      }}
                    >
                      Add Tester
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {tenantMaintForm.whitelistedEmails.length === 0 ? (
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        No tester emails added yet for this society.
                      </span>
                    ) : (
                      tenantMaintForm.whitelistedEmails.map((email: string) => (
                        <span key={email} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.25rem 0.6rem', borderRadius: '2rem', fontSize: '0.8125rem', fontWeight: 500 }}>
                          {email}
                          <button 
                            type="button" 
                            onClick={() => setTenantMaintForm(prev => ({ ...prev, whitelistedEmails: prev.whitelistedEmails.filter(e => e !== email) }))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, display: 'flex' }}
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <PageLoader 
        message="Loading SuperAdmin Portal..." 
        subtitle="Gathering platform statistics and registered societies..." 
        portalType="superadmin"
      />
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/societyarena-logo.jpeg" alt="SocietyArena" style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>SocietyArena Admin</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/societyarena-logo.jpeg" alt="SocietyArena" style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
            <span style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em' }}>SocietyArena</span>
          </div>
          <button 
            className="mobile-only"
            onClick={() => setIsSidebarOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'none' }}
          >
            <X size={24} />
          </button>
        </div>

        <nav style={{ flex: 1 }}>
          <a href="#" className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}>
            <LayoutDashboard size={20} /> Dashboard
          </a>
          <a href="#" className={`nav-link ${activeTab === 'societies' ? 'active' : ''}`} onClick={() => { setActiveTab('societies'); setIsSidebarOpen(false); }}>
            <Building size={20} /> Societies
          </a>
          <a href="#" className={`nav-link ${activeTab === 'menu-settings' ? 'active' : ''}`} onClick={() => { setActiveTab('menu-settings'); setIsSidebarOpen(false); }}>
            <Sliders size={20} /> Menu Settings
          </a>
          <a href="#" className={`nav-link ${activeTab === 'maintenance-settings' ? 'active' : ''}`} onClick={() => { setActiveTab('maintenance-settings'); setIsSidebarOpen(false); }}>
            <ShieldAlert size={20} /> Maintenance Settings
          </a>
          <a href="#" className={`nav-link ${activeTab === 'usage' ? 'active' : ''}`} onClick={() => { setActiveTab('usage'); setIsSidebarOpen(false); }}>
            <Users size={20} /> Platform Usage
          </a>
          <a href="#" className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}>
            <Settings size={20} /> Global Settings
          </a>
        </nav>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', color: 'var(--error)' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      <div className="main-content">
        <header className="dashboard-header">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Platform management and monitoring.</p>
          </div>
          <button className="btn btn-primary" onClick={() => {
            setEditingTenantId(null);
            setNewTenant({
              name: '', 
              address: '', 
              maintenanceAmount: 0,
              status: 'ACTIVE',
              slug: '',
              billingCycle: 'MONTHLY',
              subscriptionAmount: 0,
              startDate: new Date().toISOString().split('T')[0],
              lastRenewalDate: '',
              nextRenewalDate: '',
              adminName: '',
              adminEmail: '',
              adminPassword: '',
              enableForums: false
            });
            setShowModal(true);
          }}>
            <Plus size={18} /> Register New Society
          </button>
        </header>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {renderContent()}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: '600px', 
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--card-bg)', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{editingTenantId ? 'Edit Society' : 'Register New Society'}</h2>
              <button onClick={() => { setShowModal(false); setEditingTenantId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
            </div>
            <form onSubmit={handleSubmitTenant}>
              <div className="responsive-form-grid">
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Society Name</label>
                  <input type="text" required value={newTenant.name} onChange={(e) => setNewTenant({...newTenant, name: e.target.value})} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Address</label>
                  <input type="text" required value={newTenant.address} onChange={(e) => setNewTenant({...newTenant, address: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Subdomain / Slug</label>
                  <input type="text" placeholder="e.g. green-acres" value={newTenant.slug} onChange={(e) => setNewTenant({...newTenant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Platform Status</label>
                  <select value={newTenant.status || 'ACTIVE'} onChange={(e) => setNewTenant({...newTenant, status: e.target.value})}>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={16} style={{ color: 'var(--primary)' }} /> Platform Billing & Subscription
                </h4>
                <div className="responsive-form-grid">
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Subscription Amount (₹)</label>
                    <input type="number" value={newTenant.subscriptionAmount} onChange={(e) => setNewTenant({...newTenant, subscriptionAmount: parseFloat(e.target.value) || 0})} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Billing Cycle</label>
                    <select value={newTenant.billingCycle} onChange={(e) => setNewTenant({...newTenant, billingCycle: e.target.value})}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="ANNUAL">Annual</option>
                    </select>
                  </div>
                  
                  {!editingTenantId ? (
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Account Start Date</label>
                      <input type="date" value={newTenant.startDate} onChange={(e) => setNewTenant({...newTenant, startDate: e.target.value})} />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Next renewal will be automatically set to: <strong>{new Date(newTenant.nextRenewalDate).toLocaleDateString()}</strong>
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Last Renewal</label>
                        <input type="date" value={newTenant.lastRenewalDate} onChange={(e) => setNewTenant({...newTenant, lastRenewalDate: e.target.value})} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Next Renewal</label>
                        <input type="date" value={newTenant.nextRenewalDate} onChange={(e) => setNewTenant({...newTenant, nextRenewalDate: e.target.value})} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Settings size={16} style={{ color: 'var(--primary)' }} /> Feature Controls
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="enableForums" 
                    checked={newTenant.enableForums || false} 
                    onChange={(e) => setNewTenant({...newTenant, enableForums: e.target.checked})} 
                    style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }}
                  />
                  <label htmlFor="enableForums" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}>
                    Enable Helpdesk & Discussion Forum
                  </label>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem', marginLeft: '2rem' }}>
                  Allows residents to raise tickets and discuss concerns with society admins.
                </p>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Users size={16} style={{ color: 'var(--primary)' }} />
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>{editingTenantId ? 'Primary Admin Account' : 'Initial Admin Account'}</h4>
                </div>
                
                <div className="responsive-form-grid">
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Admin Name</label>
                    <input type="text" required value={newTenant.adminName} onChange={(e: any) => setNewTenant({...newTenant, adminName: e.target.value})} />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Admin Email</label>
                    <input type="email" required value={newTenant.adminEmail} onChange={(e: any) => setNewTenant({...newTenant, adminEmail: e.target.value})} />
                  </div>
                </div>
                
                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px dashed var(--border-color)' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--primary)' }}>
                    {editingTenantId ? 'Reset Password' : 'Password'}
                  </label>
                  <input 
                    type="password" 
                    placeholder={editingTenantId ? "Leave blank to keep current" : "admin123 (default)"} 
                    value={newTenant.adminPassword} 
                    onChange={(e: any) => setNewTenant({...newTenant, adminPassword: e.target.value})} 
                  />
                  {editingTenantId && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Enter a new password only if you want to reset it for the admin.</p>}
                </div>
              </div>

              <div style={{ 
                position: 'sticky', 
                bottom: 0, 
                backgroundColor: 'var(--card-bg)', 
                padding: '1.25rem 0 0.5rem 0', 
                marginTop: '1.5rem', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                gap: '1rem', 
                justifyContent: 'flex-end',
                zIndex: 10
              }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingTenantId(null); }}>Cancel</button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ minWidth: '160px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : (editingTenantId ? 'Save Changes' : 'Register Society')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
