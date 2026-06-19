import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

import {
  LayoutDashboard, Users, User,
  ArrowDownLeft, Landmark, LogOut, Plus, Send,
  TrendingUp, Users2, Receipt, Building, Settings, History, Download, Upload, Edit, XCircle, Printer, Eye, UserCheck, Trash2, Calendar, BarChart2, Menu, X, Bell,
  MessageSquare, LifeBuoy, Clock, FileText, Image, Search, DollarSign, Percent, Wrench, Save
} from 'lucide-react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import NotificationPanel from '../components/NotificationPanel';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
const exportTableToCSV = (filename: string, headers: string[], rows: (string|number)[][]) => {
  const escapeCSV = (str: string | number) => `"${String(str).replace(/"/g, '""')}"`;
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};
const StaffManagement = ({ token, currentUserId, designations, staff, onRefresh }: { token: string | null, currentUserId?: string, designations: string[], staff: any[], onRefresh: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [form, setForm] = useState({ 
    name: '', email: '', mobile: '', designation: designations[0] || 'Treasurer', password: '', flatNo: '', alsoAddMember: false,
    residenceType: 'COMMON', bhk: 'COMMON', customBhk: '', useCommonMaintenance: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!form.name.trim()) {
      showToast("Full Name is required", 'error');
      return;
    }
    if (!form.email.trim()) {
      showToast("Email is required", 'error');
      return;
    }
    if (!form.mobile.trim()) {
      showToast("Mobile number is required", 'error');
      return;
    }
    const cleanMobile = form.mobile.trim();
    if (!/^\d{10}$/.test(cleanMobile)) {
      showToast("Mobile number must be exactly 10 digits", 'error');
      return;
    }
    setLoading(true);
    try {
      const finalBhk = form.residenceType === 'COMMON'
        ? 'COMMON'
        : (form.bhk === 'other' ? form.customBhk.trim() : form.bhk);

      if (form.alsoAddMember && form.residenceType !== 'COMMON' && !finalBhk) {
        showToast("Please enter BHK value", 'error');
        setLoading(false);
        return;
      }

      const payload = {
        ...form,
        bhk: finalBhk
      };

      if (editingStaff) {
        await axios.patch(`/staff/${editingStaff.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post('/staff', payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setShowForm(false); setEditingStaff(null);
      setForm({ 
        name: '', email: '', mobile: '', designation: designations[0] || 'Treasurer', password: '', flatNo: '', alsoAddMember: false,
        residenceType: 'COMMON', bhk: 'COMMON', customBhk: '', useCommonMaintenance: true
      });
      onRefresh();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving staff');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!await confirm({
      title: 'Remove Office Bearer',
      message: `Are you sure you want to remove "${name}" from office bearers?`,
      danger: true,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    })) return;

    const s = staff.find(x => x.id === id);
    const hasMember = s && !!s.memberProfile;

    let removeMember = false;
    if (hasMember) {
      removeMember = await confirm({
        title: 'Remove Linked Member Profile',
        message: `"${name}" is also registered as a member.\n\n` +
          `Do you want to remove them from the Members list as well?\n` +
          `• Click OK to remove from BOTH (Office Bearer & Member)\n` +
          `• Click Cancel to remove ONLY as Office Bearer (keeps them as Member)`,
        confirmLabel: 'Remove from BOTH',
        cancelLabel: 'Remove ONLY as Office Bearer',
        danger: true
      });
    }

    try {
      await axios.delete(`/staff/${id}?removeMember=${removeMember}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error removing staff', 'error');
    }
  };

  return (
    <div className="card">
      <div className="section-header-row">
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Office Bearers & Staff</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Manage treasurers, secretaries, and committee members who can log in to this portal.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { 
          setEditingStaff(null); 
          setForm({ 
            name: '', email: '', mobile: '', designation: designations[0] || 'Treasurer', password: '', flatNo: '', alsoAddMember: false,
            residenceType: 'COMMON', bhk: 'COMMON', customBhk: '', useCommonMaintenance: true
          }); 
          setShowForm(true); 
        }}>
          <Plus size={18} /> Add Office Bearer
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem' }}>{editingStaff ? 'Edit Office Bearer' : 'Add New Office Bearer'}</h4>
          <div className="responsive-form-grid" style={{ gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Full Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Designation *</label>
              <select value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}>
                {designations.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Email *</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Mobile *</label>
              <input type="text" required value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{editingStaff ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Flat Number (Optional)</label>
              <input value={form.flatNo} onChange={e => setForm({ ...form, flatNo: e.target.value })} placeholder="e.g. A-402" />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 2', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="alsoAddMember"
                checked={form.alsoAddMember} 
                onChange={e => setForm({ ...form, alsoAddMember: e.target.checked })} 
                disabled={!!editingStaff && !!editingStaff.memberProfile}
                style={{ width: 'auto', margin: 0 }}
              />
              <label htmlFor="alsoAddMember" style={{ fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', color: 'var(--text-primary)' }}>
                Also add this office bearer as a society member (displays in member list)
              </label>
            </div>

            {form.alsoAddMember && (
              <div style={{ gridColumn: 'span 2', backgroundColor: 'var(--bg-primary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h5 style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>Associated Member Profile Details</h5>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Residence Type *</label>
                    <select 
                      value={form.residenceType} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm({ 
                          ...form, 
                          residenceType: val,
                          bhk: val === 'COMMON' ? 'COMMON' : '1'
                        });
                      }}
                      style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                    >
                      <option value="COMMON">Common</option>
                      <option value="FLAT">Flat</option>
                      <option value="VILLA">Villa</option>
                    </select>
                  </div>

                  {form.residenceType !== 'COMMON' ? (
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>BHK Option *</label>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <select 
                          value={form.bhk} 
                          onChange={(e) => setForm({ ...form, bhk: e.target.value })}
                          style={{ flex: 1, padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                        >
                          <option value="1">1 BHK</option>
                          <option value="2">2 BHK</option>
                          <option value="3">3 BHK</option>
                          <option value="4">4 BHK</option>
                          <option value="other">Other (Manual)</option>
                        </select>
                        {form.bhk === 'other' && (
                          <input 
                            type="text" 
                            required
                            placeholder="Specify BHK" 
                            value={form.customBhk} 
                            onChange={(e) => setForm({ ...form, customBhk: e.target.value })}
                            style={{ width: '120px', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>BHK Option</label>
                      <input type="text" disabled value="COMMON" style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', padding: '0.625rem 0.875rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-muted)', width: '100%' }} />
                    </div>
                  )}

                  <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <input 
                      type="checkbox" 
                      id="staffUseCommonMaintenance"
                      checked={form.useCommonMaintenance}
                      onChange={(e) => setForm({ ...form, useCommonMaintenance: e.target.checked })}
                      style={{ width: '1rem', height: '1rem', margin: 0, cursor: 'pointer' }}
                    />
                    <label htmlFor="staffUseCommonMaintenance" style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}>
                      Enable common maintenance (if checked, charges the common value instead of BHK value)
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.75rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading ? 'Saving...' : (editingStaff ? 'Update' : 'Add Office Bearer')}</button>
            <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingStaff(null); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table style={{ tableLayout: 'fixed', width: '100%' }}>
          <colgroup>
            <col style={{ width: '25%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Designation</th>
              <th>Email</th>
              <th>Mobile</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {staff.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No office bearers added yet. Add your first treasurer or secretary.</td></tr>
            ) : staff.map((s: any) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                  {s.id === currentUserId && <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>You</span>}
                  {s.memberProfile && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                      Flat: <code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.1rem 0.25rem', borderRadius: '0.25rem' }}>{s.memberProfile.flatNo}</code>
                    </div>
                  )}
                </td>
                <td><span className="badge badge-warning">{s.designation || '—'}</span></td>
                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{s.email || '—'}</td>
                <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.mobile || '—'}</td>
                <td style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Edit" onClick={() => {
                      const isStandardBhk = s.memberProfile ? ['COMMON', '1', '2', '3', '4'].includes(s.memberProfile.bhk || 'COMMON') : true;
                      setEditingStaff(s);
                      setForm({
                        name: s.name,
                        email: s.email || '',
                        mobile: s.mobile || '',
                        designation: s.designation || 'Treasurer',
                        password: '',
                        flatNo: s.memberProfile?.flatNo || '',
                        alsoAddMember: !!s.memberProfile,
                        residenceType: s.memberProfile?.residenceType || 'COMMON',
                        bhk: s.memberProfile ? (isStandardBhk ? (s.memberProfile.bhk || 'COMMON') : 'other') : 'COMMON',
                        customBhk: s.memberProfile ? (isStandardBhk ? '' : (s.memberProfile.bhk || '')) : '',
                        useCommonMaintenance: s.memberProfile ? (s.memberProfile.useCommonMaintenance !== undefined ? s.memberProfile.useCommonMaintenance : true) : true
                      });
                      setShowForm(true);
                    }}>
                      <Edit size={15} />
                    </button>
                    {s.id !== currentUserId && (
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--error)' }} title="Remove" onClick={() => handleDelete(s.id, s.name)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
};

const SERVICE_TYPES_DEFAULT = ['Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Security', 'Other'];

const VendorManagement = ({ token, vendors, onRefresh, serviceTypes }: { token: string | null, vendors: any[], onRefresh: () => void, serviceTypes: string[] }) => {
  const [vendorForm, setVendorForm] = useState({ name: '', serviceType: serviceTypes[0] || 'Plumbing', contact: '', email: '', address: '', notes: '' });
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorError, setVendorError] = useState('');

  const resetForm = () => setVendorForm({ name: '', serviceType: serviceTypes[0] || 'Plumbing', contact: '', email: '', address: '', notes: '' });

  const handleSave = async () => {
    setVendorError('');
    if (!vendorForm.name.trim()) { setVendorError('Vendor name is required'); return; }
    if (vendorForm.contact) {
      const cleanContact = vendorForm.contact.trim();
      if (cleanContact !== "" && !/^\d{10}$/.test(cleanContact)) {
        setVendorError('Contact/Mobile number must be exactly 10 digits');
        return;
      }
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingVendor) {
        await axios.patch(`/vendors/${editingVendor.id}`, vendorForm, { headers });
      } else {
        await axios.post('/vendors', vendorForm, { headers });
      }
      setShowVendorModal(false); setEditingVendor(null); resetForm(); onRefresh();
    } catch (err: any) { setVendorError(err.response?.data?.message || 'Error saving vendor'); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!await confirm({
      title: 'Delete Vendor',
      message: `Delete vendor "${name}"? This may affect linked expenses.`,
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/vendors/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch (err: any) { showToast(err.response?.data?.message || 'Error deleting vendor', 'error'); }
  };

  const exportVendors = () => {
    const headers = ['Name', 'Service Type', 'Mobile', 'Email', 'Status'];
    const rows = vendors.map((v: any) => [v.name, v.serviceType, v.mobile, v.email || '', v.status]);
    exportTableToCSV(`vendors_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  return (
    <div className="card">
      <div className="section-header-row">
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Vendors & Service Providers</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} registered</p>
        </div>
        <div className="action-button-group">
          <button className="btn btn-secondary" onClick={exportVendors}>
            <Download size={18} /> Export Excel
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingVendor(null); resetForm(); setShowVendorModal(true); }}>
            <Plus size={18} /> Add Vendor
          </button>
        </div>
      </div>

      {showVendorModal && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem' }}>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h4>
          <div className="responsive-form-grid">
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Vendor / Company Name *</label>
              <input value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} placeholder="e.g. Ravi Electricals" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Service Type *</label>
              <select value={vendorForm.serviceType} onChange={e => setVendorForm({ ...vendorForm, serviceType: e.target.value })} style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}>
                {serviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Phone / Mobile</label>
              <input value={vendorForm.contact} onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Email</label>
              <input type="email" value={vendorForm.email} onChange={e => setVendorForm({ ...vendorForm, email: e.target.value })} placeholder="vendor@example.com" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Address</label>
              <input value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} placeholder="Street, Area, City" />
            </div>
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Notes</label>
              <input value={vendorForm.notes} onChange={e => setVendorForm({ ...vendorForm, notes: e.target.value })} placeholder="Contract details, warranty, etc." />
            </div>
          </div>
          {vendorError && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.75rem' }}>{vendorError}</div>}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button className="btn btn-primary" onClick={handleSave}>{editingVendor ? 'Update Vendor' : 'Add Vendor'}</button>
            <button className="btn btn-secondary" onClick={() => { setShowVendorModal(false); setEditingVendor(null); }}>Cancel</button>
          </div>
        </div>
      )}

      {vendors.length === 0 && !showVendorModal ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <Users2 size={48} style={{ marginBottom: '1rem', opacity: 0.4 }} />
          <p>No vendors added yet. Add your plumbers, electricians, and other service providers.</p>
        </div>
      ) : (
        <div className="table-container">
          <table style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '22%' }} /><col style={{ width: '15%' }} /><col style={{ width: '13%' }} />
              <col style={{ width: '18%' }} /><col style={{ width: '20%' }} /><col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Name</th><th>Service Type</th><th>Phone</th><th>Email</th><th>Notes</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v: any) => (
                <tr key={v.id}>
                  <td><strong>{v.name}</strong>{v.address && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{v.address}</div>}</td>
                  <td><span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{v.serviceType}</span></td>
                  <td style={{ fontSize: '0.875rem' }}>{v.contact || '—'}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{v.email || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{v.notes || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Edit" onClick={() => { setEditingVendor(v); setVendorForm({ name: v.name, serviceType: v.serviceType, contact: v.contact || '', email: v.email || '', address: v.address || '', notes: v.notes || '' }); setShowVendorModal(true); }}><Edit size={15} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--error)' }} title="Delete" onClick={() => handleDelete(v.id, v.name)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const ExpenseManagement = ({
  token, expenses, vendors, expenseCategories, members, onRefresh
}: {
  token: string | null; expenses: any[]; vendors: any[]; expenseCategories: string[]; members: any[]; onRefresh: () => void;
}) => {
  const blankForm = { title: '', category: expenseCategories[0] || 'Maintenance', amount: 0, date: new Date().toISOString().split('T')[0], vendorId: '', notes: '', isRecurring: false, paidByMemberId: '', reimbursementType: 'OFFSET_DUES', paymentMode: 'CASH' };
  const [showModal, setShowModal] = useState(false);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState('');

  const openAdd = () => { setEditingExpense(null); setForm({ ...blankForm, category: expenseCategories[0] || 'Maintenance' }); setError(''); setShowModal(true); };
  const openEdit = (e: any) => { setEditingExpense(e); setForm({ title: e.title, category: e.category, amount: e.amount, date: (e.date || '').split('T')[0] || new Date().toISOString().split('T')[0], vendorId: e.vendorId || '', notes: e.notes || '', isRecurring: !!e.isRecurring, paidByMemberId: e.paidByMemberId || '', reimbursementType: 'OFFSET_DUES', paymentMode: e.paymentMode || 'CASH' }); setError(''); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingExpense(null); };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.amount || form.amount <= 0) { setError('Enter a valid amount'); return; }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingExpense) {
        await axios.patch(`/expenses/${editingExpense.id}`, form, { headers });
      } else {
        await axios.post('/expenses', form, { headers });
      }
      closeModal(); onRefresh();
    } catch (err: any) { setError(err.response?.data?.message || 'Error saving expense'); }
  };

  const exportExpenses = () => {
    const headers = ['Title', 'Category', 'Amount', 'Date', 'Vendor', 'Recurring', 'Paid By'];
    const rows = expenses.map((e: any) => [
      e.title, e.category, e.amount, new Date(e.date).toLocaleDateString(),
      e.vendor?.name || '', e.isRecurring ? 'Yes' : 'No', e.paidByMemberId ? 'Member' : 'Society'
    ]);
    exportTableToCSV(`expenses_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({
      title: 'Delete Expense',
      message: 'Delete this expense?',
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      onRefresh();
    } catch { showToast('Error deleting expense', 'error'); }
  };

  const totalAmt = expenses.reduce((s, e) => s + e.amount, 0);
  const selectStyle: React.CSSProperties = { width: '100%', padding: '0.65rem 0.875rem', backgroundColor: 'var(--bg-tertiary, #1a2035)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.95rem' };
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };

  return (
    <>
      {/* Overlay Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: '640px', 
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>{editingExpense ? '✏️ Edit Expense' : '➕ New Expense'}</h3>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>×</button>
            </div>

            {/* Form Grid */}
            <div className="responsive-form-grid">
              {/* Title */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Generator repair, Lift servicing" autoFocus />
              </div>
              {/* Category */}
              <div>
                <label style={labelStyle}>Category *</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={selectStyle}>
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {/* Amount */}
              <div>
                <label style={labelStyle}>Amount (₹) *</label>
                <input type="number" min="0" step="1" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} placeholder="0" />
              </div>
              {/* Date */}
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              {/* Payment Mode */}
              {!form.paidByMemberId && (
                <div>
                  <label style={labelStyle}>Payment Mode *</label>
                  <select value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })} style={selectStyle}>
                    <option value="CASH">Cash (deducts from Cash in Hand)</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
              )}
              {/* Vendor */}
              <div>
                <label style={labelStyle}>Vendor (optional)</label>
                <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} style={selectStyle}>
                  <option value="">— No Vendor —</option>
                  {vendors.map((v: any) => <option key={v.id} value={v.id}>{v.name} ({v.serviceType})</option>)}
                </select>
              </div>
              
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem', backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--border-color)' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block', color: 'var(--primary)' }}>Paid By Member (Reimbursement Claim)</label>
                <div className="responsive-form-grid">
                  <div>
                    <label style={labelStyle}>Select Member</label>
                    <select value={form.paidByMemberId} onChange={e => setForm({ ...form, paidByMemberId: e.target.value })} style={selectStyle} disabled={!!editingExpense}>
                      <option value="">— No (Paid by Society) —</option>
                      {members.map((m: any) => <option key={m.id} value={m.id}>{m.flatNo} - {m.name}</option>)}
                    </select>
                  </div>
                  {form.paidByMemberId && !editingExpense && (
                    <div>
                      <label style={labelStyle}>Reimbursement Method</label>
                      <select value={form.reimbursementType} onChange={e => setForm({ ...form, reimbursementType: e.target.value })} style={selectStyle}>
                        <option value="OFFSET_DUES">Offset Dues (Advance Paid-Until)</option>
                        <option value="CASH">Cash Refund (Deduct Society Cash)</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Notes (optional)</label>
                <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." />
              </div>
            </div>

            {/* Recurring */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '1rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input type="checkbox" checked={form.isRecurring} onChange={e => setForm({ ...form, isRecurring: e.target.checked })} />
              <span>Mark as recurring expense (monthly)</span>
            </label>

            {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.75rem', padding: '0.6rem', backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: '0.4rem' }}>{error}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={handleSave} style={{ flex: 1 }}>{editingExpense ? 'Update Expense' : 'Add Expense'}</button>
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Page */}
      <div className="card">
        <div className="section-header-row">
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Expense Ledger</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {expenses.length} record{expenses.length !== 1 ? 's' : ''} · Total: <strong style={{ color: 'var(--error)' }}>₹{totalAmt.toLocaleString()}</strong>
            </p>
          </div>
          <div className="action-button-group">
            <button className="btn btn-secondary" onClick={exportExpenses}>
              <Download size={18} /> Export Excel
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={18} /> Add Expense
            </button>
          </div>
        </div>

        <div className="table-container">
          <table style={{ tableLayout: 'fixed', width: '100%' }}>
            <colgroup>
              <col style={{ width: '26%' }} /><col style={{ width: '14%' }} /><col style={{ width: '12%' }} />
              <col style={{ width: '13%' }} /><col style={{ width: '20%' }} /><col style={{ width: '15%' }} />
            </colgroup>
            <thead>
              <tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th><th>Vendor</th><th style={{ textAlign: 'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>No expenses recorded yet. Click "Add Expense" to get started.</td></tr>
              ) : expenses.map((e: any) => (
                <tr key={e.id}>
                  <td>
                    <strong>{e.title}</strong>
                    {e.isRecurring && <span className="badge badge-success" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>Recurring</span>}
                    {e.notes && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{e.notes}</div>}
                  </td>
                  <td><span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>{e.category}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--error)' }}>₹{Number(e.amount).toLocaleString()}</td>
                  <td style={{ fontSize: '0.875rem' }}>{new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{e.vendor?.name || '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem' }} title="Edit" onClick={() => openEdit(e)}><Edit size={15} /></button>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--error)' }} title="Delete" onClick={() => handleDelete(e.id)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const MASTER_CATEGORIES = [
  { key: 'SERVICE_TYPE', label: 'Vendor Service Types', description: 'Types of services vendors can provide (e.g. Plumbing, Electrical)' },
  { key: 'DESIGNATION', label: 'Staff Designations', description: 'Titles for office bearers (e.g. Treasurer, Secretary)' },
  { key: 'EXPENSE_CATEGORY', label: 'Expense Categories', description: 'Categories for classifying expenses (e.g. Repairs, Utilities)' },
];

const FinancialYearCostSetup = ({ token }: { token: string | null }) => {
  const [startYear, setStartYear] = useState(2026);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [selectedFY, setSelectedFY] = useState('');
  const [costAmount, setCostAmount] = useState('');
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [residenceType, setResidenceType] = useState('COMMON');
  
  const [bhkFees, setBhkFees] = useState<Record<string, string>>({
    '1': '',
    '2': '',
    '3': '',
    '4': ''
  });
  const [customBhkFees, setCustomBhkFees] = useState<{ bhk: string; amount: string }[]>([]);

  const fetchConfigs = async () => {
    try {
      const res = await axios.get('/maintenance-costs', { headers: { Authorization: `Bearer ${token}` } });
      setConfigs(res.data);
    } catch (err) { console.error('Error fetching configurations', err); }
  };

  useEffect(() => { fetchConfigs(); }, []);

  // Prefill the form inputs whenever Selected FY, Residence Type, or configs change
  useEffect(() => {
    if (!selectedFY) return;

    if (residenceType === 'COMMON') {
      const commonCfg = configs.find((c: any) => c.financialYear === selectedFY && c.residenceType === 'COMMON');
      setCostAmount(commonCfg ? commonCfg.amount.toString() : '');
      return;
    }

    const filtered = configs.filter((c: any) => c.financialYear === selectedFY && c.residenceType === residenceType);
    const newBhkFees: Record<string, string> = { '1': '', '2': '', '3': '', '4': '' };
    const newCustom: { bhk: string; amount: string }[] = [];

    filtered.forEach((c: any) => {
      if (['1', '2', '3', '4'].includes(c.bhk)) {
        newBhkFees[c.bhk] = c.amount.toString();
      } else if (c.bhk !== 'COMMON') {
        newCustom.push({ bhk: c.bhk, amount: c.amount.toString() });
      }
    });

    setBhkFees(newBhkFees);
    setCustomBhkFees(newCustom);
  }, [selectedFY, residenceType, configs]);

  const generateFYRange = (start: number) => {
    const list = [];
    for (let i = 0; i < 5; i++) {
      const yr = start + i;
      const s = (yr + 1) % 100;
      list.push(yr + '-' + (s < 10 ? '0' + s : '' + s));
    }
    return list;
  };

  const fyRangeList = generateFYRange(startYear);
  const rangeLabel = fyRangeList[0] + ' - ' + fyRangeList[4];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFY) { showToast('Please select a financial year', 'error'); return; }
    
    setLoading(true);
    try {
      if (residenceType === 'COMMON') {
        if (!costAmount || parseFloat(costAmount) <= 0) {
          showToast('Please enter a valid amount', 'error');
          setLoading(false);
          return;
        }
        await axios.post('/maintenance-costs', {
          financialYear: selectedFY,
          amount: parseFloat(costAmount),
          residenceType: 'COMMON',
          bhk: 'COMMON'
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        const configsToSave: { bhk: string; amount: number }[] = [];

        // Add standard BHKs
        for (const [b, val] of Object.entries(bhkFees)) {
          if (val && parseFloat(val) > 0) {
            configsToSave.push({ bhk: b, amount: parseFloat(val) });
          }
        }

        // Add custom BHKs
        for (const item of customBhkFees) {
          if (item.bhk.trim() && item.amount && parseFloat(item.amount) > 0) {
            configsToSave.push({ bhk: item.bhk.trim(), amount: parseFloat(item.amount) });
          }
        }

        if (configsToSave.length === 0) {
          showToast('Please specify fee amount for at least one BHK type', 'error');
          setLoading(false);
          return;
        }

        await axios.post('/maintenance-costs/bulk', {
          financialYear: selectedFY,
          residenceType,
          configs: configsToSave
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      setCostAmount('');
      setBhkFees({ '1': '', '2': '', '3': '', '4': '' });
      setCustomBhkFees([]);
      setSelectedFY('');
      setResidenceType('COMMON');

      fetchConfigs();
      showToast('Maintenance cost(s) configured successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error saving configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm({
      title: 'Delete Pricing Configuration',
      message: 'Are you sure you want to delete this configuration?',
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/maintenance-costs/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchConfigs(); showToast('Configuration deleted successfully', 'success');
    } catch (err: any) { showToast(err.response?.data?.message || 'Error deleting configuration', 'error'); }
  };

  const handleEdit = (config: any) => {
    setSelectedFY(config.financialYear);
    const fyStart = parseInt(config.financialYear.split('-')[0]);
    if (fyStart < startYear || fyStart >= startYear + 5) {
      const offset = (fyStart - 2026) % 5;
      setStartYear(fyStart - (offset >= 0 ? offset : offset + 5));
    }
    setResidenceType(config.residenceType);
    if (config.residenceType === 'COMMON') {
      setCostAmount(config.amount.toString());
    }
  };

  return (
    <div className="card" style={{ maxWidth: '860px' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.4rem' }}>Financial Year - Annual Fee Setup</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Set different annual fees per BHK type for Flat and Villa. Each combination (Residence Type + BHK) can have its own fee.
      </p>

      <form onSubmit={handleSubmit} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="responsive-form-grid" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Financial Year</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => setStartYear(p => p - 5)}>Prev</button>
              <span style={{ fontSize: '0.75rem', fontWeight: 500, flex: 1, textAlign: 'center', backgroundColor: 'var(--bg-secondary)', padding: '0.35rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', whiteSpace: 'nowrap' }}>{rangeLabel}</span>
              <button type="button" className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => setStartYear(p => p + 5)}>Next</button>
            </div>
            <select value={selectedFY} onChange={e => setSelectedFY(e.target.value)} style={{ width: '100%' }}>
              <option value="">-- Choose Financial Year --</option>
              {fyRangeList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Residence Type</label>
            <select value={residenceType} onChange={e => setResidenceType(e.target.value)} style={{ width: '100%' }}>
              <option value="COMMON">Common (all members)</option>
              <option value="FLAT">Flat</option>
              <option value="VILLA">Villa</option>
            </select>
          </div>

          {residenceType === 'COMMON' && (
            <div>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Annual Fee (Rs.)</label>
              <input
                type="text"
                required
                placeholder="e.g. 18000"
                value={costAmount}
                onChange={e => setCostAmount(e.target.value.replace(/[^0-9]/g, ''))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        {residenceType !== 'COMMON' && (
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>
              Set Annual Fees for {residenceType === 'FLAT' ? 'Flat' : 'Villa'} by BHK Type
            </label>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Specify the annual fee for each BHK type. Empty or 0 values will not be updated/configured.
            </p>

            <div className="responsive-form-grid" style={{ gap: '1.25rem', marginBottom: '1.25rem' }}>
              {['1', '2', '3', '4'].map(b => (
                <div key={b}>
                  <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>
                    {b} BHK Fee (Rs.)
                  </label>
                  <input
                    type="text"
                    placeholder={`Fee for ${b} BHK`}
                    value={bhkFees[b] || ''}
                    onChange={e => setBhkFees({ ...bhkFees, [b]: e.target.value.replace(/[^0-9]/g, '') })}
                    style={{ width: '100%' }}
                  />
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>Custom BHK Fees (optional)</span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  onClick={() => setCustomBhkFees([...customBhkFees, { bhk: '', amount: '' }])}
                >
                  + Add Custom BHK
                </button>
              </div>

              {customBhkFees.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                  {customBhkFees.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="e.g. 5 BHK, Duplex, Penthouse"
                        value={item.bhk}
                        onChange={e => {
                          const updated = [...customBhkFees];
                          updated[idx].bhk = e.target.value;
                          setCustomBhkFees(updated);
                        }}
                        style={{ flex: 2 }}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Fee Amount (Rs.)"
                        value={item.amount}
                        onChange={e => {
                          const updated = [...customBhkFees];
                          updated[idx].amount = e.target.value.replace(/[^0-9]/g, '');
                          setCustomBhkFees(updated);
                        }}
                        style={{ flex: 2 }}
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 0.75rem', color: 'var(--error)' }}
                        onClick={() => {
                          const updated = customBhkFees.filter((_, i) => i !== idx);
                          setCustomBhkFees(updated);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Set Annual Fees'}
          </button>
        </div>
      </form>

      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>Configured Annual Fees</h4>
      {(() => {
        const fys = [...new Set(configs.map((c: any) => c.financialYear))].sort().reverse();
        if (fys.length === 0) return (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: '0.5rem' }}>
            <Calendar size={36} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.875rem' }}>No fees configured yet. Use the form above to get started.</p>
          </div>
        );
        return fys.map(fy => {
          const fyc = configs.filter((c: any) => c.financialYear === fy);
          const common = fyc.filter((c: any) => c.residenceType === 'COMMON');
          const flats = fyc.filter((c: any) => c.residenceType === 'FLAT').sort((a: any, b: any) => a.bhk > b.bhk ? 1 : -1);
          const villas = fyc.filter((c: any) => c.residenceType === 'VILLA').sort((a: any, b: any) => a.bhk > b.bhk ? 1 : -1);
          const Chip = ({ c, accent }: { c: any; accent: string }) => (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem',
              backgroundColor: accent + '14', border: '1px solid ' + accent + '35', borderRadius: '0.5rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: accent, minWidth: '3.5rem' }}>
                {c.residenceType === 'COMMON' ? 'Common' : (c.bhk === 'COMMON' ? 'Common' : c.bhk + ' BHK')}
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>Rs.{Number(c.amount).toLocaleString()}<span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/yr</span></span>
              <button type="button" onClick={() => handleEdit(c)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '0.72rem', padding: '0.1rem 0.3rem' }} title="Edit">Edit</button>
              <button type="button" onClick={() => handleDelete(c.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '0.72rem', padding: '0.1rem 0.3rem' }} title="Delete">x</button>
            </div>
          );
          return (
            <div key={fy} style={{ marginBottom: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '0.625rem', overflow: 'hidden' }}>
              <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.65rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={15} style={{ color: 'var(--primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>FY {fy}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.25rem' }}>{fyc.length} entry/entries</span>
              </div>
              <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {common.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Common</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{common.map((c: any) => <Chip key={c.id} c={c} accent="#10b981" />)}</div>
                  </div>
                )}
                {flats.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Flat - by BHK</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{flats.map((c: any) => <Chip key={c.id} c={c} accent="#6366f1" />)}</div>
                  </div>
                )}
                {villas.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>Villa - by BHK</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>{villas.map((c: any) => <Chip key={c.id} c={c} accent="#f59e0b" />)}</div>
                  </div>
                )}
              </div>
            </div>
          );
        });
      })()}
    </div>
  );
};;

const MastersManagement = ({ token, onRefresh }: { token: string | null, onRefresh: () => void }) => {
  const { confirm } = useConfirm();
  const [activeCategory, setActiveCategory] = useState('SERVICE_TYPE');
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [error, setError] = useState('');

  const fetchItems = async (category: string) => {
    setLoadingItems(true); setError('');
    try {
      const res = await axios.get(`/master-data/${category}`, { headers: { Authorization: `Bearer ${token}` } });
      setItems(res.data);
    } catch { setError('Failed to load items'); }
    finally { setLoadingItems(false); }
  };

  useEffect(() => { fetchItems(activeCategory); }, [activeCategory]);

  const handleAdd = async () => {
    if (!newValue.trim()) return;
    setError('');
    try {
      await axios.post(`/master-data/${activeCategory}`, { value: newValue.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setNewValue(''); fetchItems(activeCategory); onRefresh();
    } catch (err: any) { setError(err.response?.data?.message || 'Error adding item'); }
  };

  const handleUpdate = async (id: string) => {
    if (!editingValue.trim()) return;
    setError('');
    try {
      await axios.patch(`/master-data/${id}`, { value: editingValue.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      setEditingId(null); fetchItems(activeCategory); onRefresh();
    } catch (err: any) { setError(err.response?.data?.message || 'Error updating item'); }
  };

  const handleDelete = async (id: string, value: string) => {
    if (!await confirm({
      title: 'Remove Master Item',
      message: `Remove "${value}" from the list?`,
      danger: true,
      confirmLabel: 'Remove',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/master-data/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchItems(activeCategory); onRefresh();
    } catch (err: any) { setError(err.response?.data?.message || 'Error deleting item'); }
  };

  const activeCat = MASTER_CATEGORIES.find(c => c.key === activeCategory)!;

  return (
    <div className="card">
      <h3 style={{ marginBottom: '0.5rem' }}>Data Masters</h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Manage the dropdown values used across the system.
      </p>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
        {MASTER_CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => { setActiveCategory(cat.key); setEditingId(null); setNewValue(''); setError(''); }}
            style={{
              padding: '0.6rem 1.1rem', border: 'none', borderRadius: '0.5rem 0.5rem 0 0', cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem',
              backgroundColor: activeCategory === cat.key ? 'var(--primary)' : 'transparent',
              color: activeCategory === cat.key ? '#fff' : 'var(--text-secondary)',
              borderBottom: activeCategory === cat.key ? '2px solid var(--primary)' : 'none',
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>{activeCat.description}</p>

      {/* Add new item */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={`Add new ${activeCat.label.toLowerCase().replace('vendor ', '').replace(' types', ' type').replace(' categories', ' category').replace('staff ', '')}...`}
          style={{ flex: 1 }} />
        <button className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={handleAdd}>
          <Plus size={16} /> Add
        </button>
      </div>

      {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>{error}</div>}

      {/* Items list */}
      {loadingItems ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              {editingId === item.id ? (
                <>
                  <input value={editingValue} onChange={e => setEditingValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleUpdate(item.id); if (e.key === 'Escape') setEditingId(null); }}
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.875rem' }} autoFocus />
                  <button className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleUpdate(item.id)}>Save</button>
                  <button className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{item.value}</span>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }} title="Edit"
                    onClick={() => { setEditingId(item.id); setEditingValue(item.value); }}>
                    <Edit size={14} />
                  </button>
                  <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', color: 'var(--error)' }} title="Remove"
                    onClick={() => handleDelete(item.id, item.value)}>
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          ))}
          {items.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No items yet. Add your first one above.</p>}
        </div>
      )}
    </div>
  );
};

const Helpdesk = ({ token }: { token: string | null }) => {
  const [tickets, setTickets] = useState<any[]>([]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, OPEN, RESOLVED, CLOSED, ARCHIVED

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/tickets${filter !== 'ALL' ? `?status=${filter}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, [filter]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      await axios.patch(`/tickets/${ticketId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedTicket?.id === ticketId) {
        const res = await axios.get(`/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSelectedTicket(res.data);
      }
      fetchTickets();
    } catch (err) {
      showToast("Error updating status", 'error');
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!await confirm({
      title: 'Delete Helpdesk Ticket',
      message: 'Are you sure you want to permanently delete this ticket and all its discussions?',
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(null);
      fetchTickets();
    } catch (err) {
      showToast("Error deleting ticket", 'error');
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const res = await axios.post(`/tickets/${selectedTicket.id}/comments`, { content: comment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket({
        ...selectedTicket,
        comments: [...(selectedTicket.comments || []), res.data]
      });
      setComment('');
    } catch (err) {
      showToast("Error adding comment", 'error');
    }
  };

  const selectTicket = async (id: string) => {
    try {
      const res = await axios.get(`/tickets/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(res.data);
    } catch (err) {
      showToast("Error loading ticket details", 'error');
    }
  };

  const getPriorityColor = (p: string) => {
    switch(p) {
      case 'URGENT': return '#ef4444';
      case 'HIGH': return '#f97316';
      case 'MEDIUM': return '#6366f1';
      default: return '#10b981';
    }
  };

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'OPEN': return <span className="badge badge-error">Open</span>;
      case 'IN_PROGRESS': return <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>In Progress</span>;
      case 'RESOLVED': return <span className="badge badge-success">Resolved</span>;
      case 'CLOSED': return <span className="badge" style={{ backgroundColor: 'var(--text-secondary)', color: '#fff' }}>Closed</span>;
      case 'ARCHIVED': return <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>Archived</span>;
      default: return null;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedTicket ? '350px 1fr' : '1fr', gap: '1.5rem', height: 'calc(100vh - 200px)', minHeight: '600px' }}>
      {/* Ticket List Panel */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LifeBuoy size={20} /> Helpdesk
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tickets.length} Tickets</div>
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem' }}>
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <MessageSquare size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p>No tickets found</p>
            </div>
          ) : (
            tickets.map((t) => (
              <div 
                key={t.id} 
                onClick={() => selectTicket(t.id)}
                style={{ 
                  padding: '1rem 1.25rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  cursor: 'pointer',
                  backgroundColor: selectedTicket?.id === t.id ? 'var(--bg-tertiary)' : 'transparent',
                  borderLeft: `4px solid ${selectedTicket?.id === t.id ? 'var(--primary)' : 'transparent'}`,
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: getPriorityColor(t.priority), textTransform: 'uppercase' }}>{t.priority}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.925rem', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Flat {t.member?.flatNo} • {t.member?.name}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {getStatusBadge(t.status)}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <MessageSquare size={12} /> {t._count?.comments || 0}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Ticket Thread Panel */}
      {selectedTicket ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{selectedTicket.subject}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span>Raised by: <strong>{selectedTicket.member?.name} (Flat {selectedTicket.member?.flatNo})</strong></span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={selectedTicket.status} 
                onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem' }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
              <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--error)' }} title="Delete Ticket" onClick={() => handleDeleteTicket(selectedTicket.id)}>
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Description Area */}
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', marginBottom: selectedTicket.imageUrl ? '1rem' : 0 }}>{selectedTicket.description}</div>
            {selectedTicket.imageUrl && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Attached Image</div>
                <a href={selectedTicket.imageUrl} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={selectedTicket.imageUrl} 
                    alt="Attachment" 
                    style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '0.5rem', border: '1px solid var(--border-color)', cursor: 'pointer' }} 
                  />
                </a>
              </div>
            )}
          </div>

          {/* Comments Thread */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
            {(selectedTicket.comments || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No discussions yet. Start the conversation below.</div>
            ) : (
              selectedTicket.comments.map((c: any) => {
                const isAdmin = !!c.userId;
                return (
                  <div key={c.id} style={{ 
                    alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAdmin ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <strong>{isAdmin ? c.user?.name : c.member?.name}</strong>
                      {isAdmin && <span className="badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>Admin</span>}
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '1rem', 
                      borderTopRightRadius: isAdmin ? '0' : '1rem',
                      borderTopLeftRadius: isAdmin ? '1rem' : '0',
                      backgroundColor: isAdmin ? 'var(--primary)' : 'var(--card-bg)',
                      color: isAdmin ? '#fff' : 'var(--text-primary)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }}>
                      {c.content}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply Box */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
            <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="Type your response here..." 
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-primary" disabled={!comment.trim()}>
                <Send size={18} /> Reply
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ textAlign: 'center' }}>
            <LifeBuoy size={60} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
            <h3>Select a ticket to view conversation</h3>
            <p style={{ fontSize: '0.875rem' }}>Manage society concerns and member requests from this portal.</p>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminProfileEdit = ({ token, user, updateUser }: { token: string | null, user: any, updateUser: (userData: any, newToken?: string) => void }) => {
  const [name, setName] = useState(user?.name || '');
  const { showToast } = useToast();
  const [email, setEmail] = useState(user?.email || '');
  const [mobile, setMobile] = useState(user?.mobile || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      showToast("Passwords do not match", 'error');
      return;
    }
    if (mobile) {
      const cleanMobile = mobile.trim();
      if (cleanMobile !== "" && !/^\d{10}$/.test(cleanMobile)) {
        showToast("Mobile number must be exactly 10 digits", 'error');
        return;
      }
    }
    try {
      setLoading(true);
      const res = await axios.patch('/auth/profile', {
        name,
        email: email || null,
        mobile: mobile || null,
        password: password || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      updateUser(res.data.user, res.data.token);
      showToast("Profile and password updated successfully!", 'success');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to update profile", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '800px' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>My Profile & Password</h3>
      <form onSubmit={handleSubmit}>
        <div className="responsive-form-grid">
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Name</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="form-control" />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Designation</label>
            <input type="text" disabled value={user?.designation || 'Primary Admin'} style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }} className="form-control" />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Mobile Number</label>
            <input type="text" value={mobile} onChange={(e) => setMobile(e.target.value)} className="form-control" />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>New Password</label>
            <input type="password" placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" />
          </div>
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>Confirm New Password</label>
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-control" />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile & Password'}
          </button>
        </div>
      </form>
    </div>
  );
};

const getFinancialYear = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // Jan is 0, Apr is 3
  if (month >= 3) {
    const nextYr = (year + 1) % 100;
    return `${year}-${nextYr < 10 ? '0' + nextYr : nextYr}`;
  } else {
    const prevYr = year - 1;
    const currYrShort = year % 100;
    return `${prevYr}-${currYrShort < 10 ? '0' + currYrShort : currYrShort}`;
  }
};



const getGroupedFYOptions = () => {
  const currentYear = new Date().getFullYear();
  const futureLimit = currentYear + 10;
  const groups: { [key: string]: string[] } = {};

  for (let yr = futureLimit; yr >= 1900; yr--) {
    const decade = `${Math.floor(yr / 10) * 10}s`;
    const nextYrShort = (yr + 1) % 100;
    const nextYrStr = nextYrShort < 10 ? `0${nextYrShort}` : `${nextYrShort}`;
    const val = `${yr}-${nextYrStr}`;
    
    if (!groups[decade]) {
      groups[decade] = [];
    }
    groups[decade].push(val);
  }

  return Object.keys(groups)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .map(decade => ({
      label: decade,
      options: groups[decade]
    }));
};

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toISODateString = (dateInput: any) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalDate = (dateInput: any) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-IN', options);
};

const EventManagement = ({ token }: { token: string | null }) => {
  const [events, setEvents] = useState<any[]>([]);
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', eventDate: '', location: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/events', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error("Error fetching events", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.eventDate) {
      setError("Title, description, and date are required.");
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (editingEvent) {
        await axios.put(`/events/${editingEvent.id}`, form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Event updated successfully!", 'success');
      } else {
        await axios.post('/events', form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showToast("Event created and members notified successfully!", 'success');
      }
      setShowForm(false);
      setEditingEvent(null);
      setForm({ title: '', description: '', eventDate: '', location: '' });
      fetchEvents();
    } catch (err: any) {
      setError(err.response?.data?.message || "Error saving event");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (event: any) => {
    setEditingEvent(event);
    const d = new Date(event.eventDate);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
    setForm({
      title: event.title,
      description: event.description,
      eventDate: localISOTime,
      location: event.location || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!await confirm({
      title: 'Delete Event',
      message: `Are you sure you want to delete the event "${title}"?`,
      danger: true,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    })) return;
    try {
      await axios.delete(`/events/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast("Event deleted successfully!", 'success');
      fetchEvents();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Error deleting event", 'error');
    }
  };

  return (
    <div className="card">
      <div className="section-header-row">
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Society Events</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Schedule and manage events/meetings in the society. Creating an event automatically sends a notification to all members.
          </p>
        </div>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setForm({ title: '', description: '', eventDate: '', location: '' }); setShowForm(true); }}>
            <Plus size={18} /> Add Event
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem' }}>{editingEvent ? 'Edit Event' : 'Create New Event'}</h4>
          <form onSubmit={handleSubmit}>
            <div className="responsive-form-grid">
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Event Title *</label>
                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual General Body Meeting" />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Event Date & Time *</label>
                <input type="datetime-local" required value={form.eventDate} onChange={e => setForm({ ...form, eventDate: e.target.value })} />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Location / Venue</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Clubhouse Hall, Block A Lobby" />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Event Description *</label>
                <textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Provide event details, agenda, rules, etc." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
            </div>
            {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginTop: '0.75rem' }}>{error}</div>}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : (editingEvent ? 'Update Event' : 'Create Event')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setEditingEvent(null); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '1rem' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', marginTop: '1rem' }}>
          No upcoming events scheduled yet. Click "Add Event" to create one.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {events.map((event: any) => {
            const dateObj = new Date(event.eventDate);
            return (
              <div key={event.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                    {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: '0.35rem' }} onClick={() => handleEdit(event)} title="Edit Event">
                      <Edit size={14} />
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '0.3rem', borderRadius: '0.35rem', color: 'var(--error)' }} onClick={() => handleDelete(event.id, event.title)} title="Delete Event">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>{event.title}</h4>
                {event.location && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
                    <strong>📍 Venue:</strong> {event.location}
                  </div>
                )}
                <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', flexGrow: 1 }}>{event.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DUES_KEYWORDS = ['due', 'dues', 'pending', 'payment', 'maintenance', 'arrear', 'outstanding', 'unpaid', 'overdue'];

const NotificationManagement = ({ token, members }: { token: string | null; members: any[] }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState<'ALL' | 'MEMBER'>('ALL');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dues check warning state
  const [duesWarning, setDuesWarning] = useState<null | { memberName: string; flatNo: string; outstandingDues: number; isPaidUpToDate: boolean }>(null);

  // Monthly dues reminder state
  const [sendingReminder, setSendingReminder] = useState(false);
  const [reminderResult, setReminderResult] = useState<{ message: string; count: number; members?: any[] } | null>(null);

  const isDuesRelated = (t: string) => DUES_KEYWORDS.some(kw => t.toLowerCase().includes(kw));

  const checkDuesAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { setError("Title and description are required."); return; }
    if (recipient === 'MEMBER' && !selectedMemberId) { setError("Please select a member to send the notification to."); return; }
    setError(''); setSuccess('');

    // If sending to a specific member and the title suggests dues — check their dues status
    if (recipient === 'MEMBER' && selectedMemberId && isDuesRelated(title)) {
      try {
        const res = await axios.get(`/notifications/check-member-dues/${selectedMemberId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data;
        // If the member has no dues / is paid up — warn admin
        if (!data.hasDues || data.isPaidUpToDate) {
          setDuesWarning({
            memberName: data.memberName,
            flatNo: data.flatNo,
            outstandingDues: data.outstandingDues,
            isPaidUpToDate: data.isPaidUpToDate,
          });
          return; // Don't send yet — wait for admin decision
        }
      } catch (err: any) {
        // If check fails, still allow sending
        console.error('Dues check error:', err);
      }
    }

    await doSend();
  };

  const doSend = async () => {
    setDuesWarning(null);
    setSubmitting(true);
    try {
      const payload: any = { title: title.trim(), message: message.trim(), type: 'ANNOUNCEMENT' };
      if (recipient === 'MEMBER' && selectedMemberId) {
        payload.targetMemberId = selectedMemberId;
      }
      await axios.post('/notifications', payload, { headers: { Authorization: `Bearer ${token}` } });

      const memberName = members.find(m => m.id === selectedMemberId)?.name;
      setSuccess(
        recipient === 'ALL'
          ? "Notification broadcasted successfully to all members!"
          : `Notification sent successfully to ${memberName || 'selected member'}!`
      );
      setTitle(''); setMessage(''); setSelectedMemberId(''); setRecipient('ALL');
    } catch (err: any) {
      setError(err.response?.data?.message || "Error sending notification");
    } finally {
      setSubmitting(false);
    }
  };

  const sendMonthlyReminder = async () => {
    setSendingReminder(true);
    setReminderResult(null);
    try {
      const res = await axios.post('/notifications/send-monthly-dues-reminders', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminderResult(res.data);
    } catch (err: any) {
      setReminderResult({ message: err.response?.data?.message || "Error sending reminders", count: 0 });
    } finally {
      setSendingReminder(false);
    }
  };

  const activeMembers = members.filter((m: any) => m.status === 'ACTIVE' || m.status === 'INACTIVE');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '720px' }}>

      {/* ─── Dues Warning Dialog ──────────────────────────────────────── */}
      {duesWarning && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={20} style={{ color: '#f59e0b' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Member May Have Paid Already
                </h3>
                <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  You are sending a dues-related notification to <strong>{duesWarning.memberName}</strong> (Flat {duesWarning.flatNo}).
                </p>
              </div>
            </div>

            <div style={{ backgroundColor: duesWarning.isPaidUpToDate ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)', border: `1px solid ${duesWarning.isPaidUpToDate ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`, borderRadius: '0.5rem', padding: '0.875rem', marginBottom: '1.25rem' }}>
              {duesWarning.isPaidUpToDate ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 600, fontSize: '0.9rem' }}>
                  ✅ This member appears to be <strong>paid up for the current month</strong>.
                </div>
              ) : (
                <div style={{ color: '#f59e0b', fontWeight: 600, fontSize: '0.9rem' }}>
                  ⚠️ Outstanding dues: <strong>₹{duesWarning.outstandingDues.toLocaleString('en-IN')}</strong>
                  {duesWarning.outstandingDues === 0 && ' — Member has no outstanding dues recorded.'}
                </div>
              )}
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                Sending a dues-pending notification to a member who has already paid may cause confusion.
                Do you still want to proceed?
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => { setDuesWarning(null); }}>
                Cancel — Don't Send
              </button>
              <button className="btn btn-primary" onClick={doSend} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Send size={15} /> {submitting ? 'Sending...' : 'Send Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Manual Notification Card ─────────────────────────────────── */}
      <div className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Bell size={20} style={{ color: 'var(--primary)' }} /> Send Manual Notification
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Send a targeted notification to a specific member or broadcast to all society members.
          </p>
        </div>

        <form onSubmit={checkDuesAndSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Recipient Selector */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.6rem', display: 'block', color: 'var(--text-primary)' }}>
              Send To *
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: recipient === 'MEMBER' ? '0.75rem' : 0 }}>
              {[{ val: 'ALL', label: '📢 All Members (Broadcast)' }, { val: 'MEMBER', label: '👤 Specific Member' }].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => { setRecipient(opt.val as any); setSelectedMemberId(''); }}
                  style={{
                    flex: 1, padding: '0.625rem', fontSize: '0.8125rem', fontWeight: 600, borderRadius: '0.5rem',
                    border: recipient === opt.val ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                    backgroundColor: recipient === opt.val ? 'rgba(37,99,235,0.08)' : 'var(--bg-secondary)',
                    color: recipient === opt.val ? 'var(--primary)' : 'var(--text-secondary)',
                    cursor: 'pointer', transition: 'all 0.15s ease'
                  }}
                >{opt.label}</button>
              ))}
            </div>

            {recipient === 'MEMBER' && (
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>
                  Select Member *
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontSize: '0.875rem' }}
                >
                  <option value="">— Select a Member —</option>
                  {activeMembers.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.flatNo} — {m.name}{m.outstandingDues > 0 ? ` (Dues: ₹${Number(m.outstandingDues).toLocaleString('en-IN')})` : ' ✓ Paid'}
                    </option>
                  ))}
                </select>
                {selectedMemberId && !members.find(m => m.id === selectedMemberId)?.userId && (
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    ⚠️ This member has no portal account. Notifications require an active member login.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Notification Title *</label>
            <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water Supply Interruption / Dues Pending Reminder" />
            {recipient === 'MEMBER' && selectedMemberId && isDuesRelated(title) && (
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.3rem', fontStyle: 'italic' }}>
                💡 Dues-related title detected — we'll verify payment status before sending.
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Description / Message *</label>
            <textarea required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Enter the detailed description of the notification..." style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
          </div>

          {error && <div style={{ color: 'var(--error)', fontSize: '0.875rem', padding: '0.5rem', backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: '0.375rem' }}>{error}</div>}
          {success && <div style={{ color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500, padding: '0.5rem', backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: '0.375rem' }}>✅ {success}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || (recipient === 'MEMBER' && !selectedMemberId)} style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Send size={16} /> {submitting ? 'Sending...' : (recipient === 'ALL' ? 'Broadcast Notification' : 'Send to Member')}
            </button>
          </div>
        </form>
      </div>

      {/* ─── Monthly Dues Reminder Card ───────────────────────────────── */}
      <div className="card" style={{ border: '1px solid rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: '0.625rem', backgroundColor: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Monthly Dues Reminders
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Automatically runs on the <strong>1st of every month</strong>. You can also trigger it manually now — only members with outstanding dues will be notified.
            </p>
          </div>
        </div>

        {reminderResult && (
          <div style={{
            padding: '0.875rem', borderRadius: '0.5rem', marginBottom: '1rem',
            backgroundColor: reminderResult.count > 0 ? 'rgba(16,185,129,0.08)' : 'rgba(59,130,246,0.08)',
            border: `1px solid ${reminderResult.count > 0 ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.25)'}`
          }}>
            <div style={{ fontWeight: 600, color: reminderResult.count > 0 ? 'var(--success)' : 'var(--primary)', marginBottom: reminderResult.count > 0 ? '0.5rem' : 0 }}>
              {reminderResult.count > 0 ? `✅ Sent ${reminderResult.count} reminder${reminderResult.count > 1 ? 's' : ''}` : 'ℹ️'} — {reminderResult.message}
            </div>
            {reminderResult.members && reminderResult.members.length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxHeight: '100px', overflowY: 'auto' }}>
                {reminderResult.members.map((m: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                    <span>{m.flatNo} — {m.name}</span>
                    <span style={{ color: 'var(--error)', fontWeight: 600 }}>₹{Number(m.dues).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Members with <strong>₹0 dues</strong> or who are <strong>fully paid</strong> will <strong>not</strong> receive a reminder.
          </div>
          <button
            className="btn btn-secondary"
            onClick={sendMonthlyReminder}
            disabled={sendingReminder}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', borderColor: '#f59e0b', color: '#f59e0b' }}
          >
            <Bell size={16} /> {sendingReminder ? 'Sending Reminders...' : 'Send Dues Reminders Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TenantAdminDashboard = () => {
  const { logout, token, user, updateUser } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSettingsTab, setActiveSettingsTab] = useState('pricing');
  const [loading, setLoading] = useState(true);
  const [duesCalcMode, setDuesCalcMode] = useState<string>('DB');
  const [duesSortField, setDuesSortField] = useState<'flatNo' | 'name' | 'outstandingDues'>('flatNo');
  const [duesSortDir, setDuesSortDir] = useState<'asc' | 'desc'>('asc');
  const [summary, setSummary] = useState<any>({ totalIncome: 0, totalExpenses: 0, totalOutstanding: 0, netBalance: 0, totalCashInHand: 0, thisMonthIncome: 0, thisMonthExpenses: 0, thisMonthNet: 0, lastMonthIncome: 0, lastMonthExpenses: 0, totalMembers: 0, membersWithDues: 0, maintenanceAmount: 0, monthlyTrends: [], expenseByCategory: [], recentPayments: [] });
  const [financials, setFinancials] = useState<any>({});
  const [activeReportTab, setActiveReportTab] = useState<'pnl' | 'balanceSheet'>('pnl');
  const [reportFilters, setReportFilters] = useState({ month: '', year: new Date().getFullYear().toString(), startDate: '', endDate: '' });
  const [members, setMembers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [payments, setPayments] = useState<any[]>([]);
  const [cashBalances, setCashBalances] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [maintenanceCosts, setMaintenanceCosts] = useState<any[]>([]);

  // Pricing settings local inputs state
  const [maintenanceAmountInput, setMaintenanceAmountInput] = useState('');
  const [quarterlyAmountInput, setQuarterlyAmountInput] = useState('');
  const [halfYearlyAmountInput, setHalfYearlyAmountInput] = useState('');
  const [annualAmountInput, setAnnualAmountInput] = useState('');

  // Reminder settings states
  const [enableMonthlyReminder, setEnableMonthlyReminder] = useState(false);
  const [monthlyReminderCountInput, setMonthlyReminderCountInput] = useState('1');
  const [monthlyReminderIntervalInput, setMonthlyReminderIntervalInput] = useState('7');
  const [enableOverdueReminder, setEnableOverdueReminder] = useState(false);
  const [overdueReminderIntervalInput, setOverdueReminderIntervalInput] = useState('7');

  // Discount settings states
  const [discountDateInput, setDiscountDateInput] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('0');

  // Late fee settings states
  const [lateFeeDateInput, setLateFeeDateInput] = useState('');
  const [lateFeeAmountInput, setLateFeeAmountInput] = useState('0');

  useEffect(() => {
    if (summary) {
      setMaintenanceAmountInput(summary.maintenanceAmount !== undefined && summary.maintenanceAmount !== null ? String(summary.maintenanceAmount) : '0');
      setQuarterlyAmountInput(summary.quarterlyAmount !== undefined && summary.quarterlyAmount !== null ? String(summary.quarterlyAmount) : '');
      setHalfYearlyAmountInput(summary.halfYearlyAmount !== undefined && summary.halfYearlyAmount !== null ? String(summary.halfYearlyAmount) : '');
      setAnnualAmountInput(summary.annualAmount !== undefined && summary.annualAmount !== null ? String(summary.annualAmount) : '');
      
      setEnableMonthlyReminder(!!summary.enableMonthlyReminder);
      setMonthlyReminderCountInput(summary.monthlyReminderCount !== undefined && summary.monthlyReminderCount !== null ? String(summary.monthlyReminderCount) : '1');
      setMonthlyReminderIntervalInput(summary.monthlyReminderInterval !== undefined && summary.monthlyReminderInterval !== null ? String(summary.monthlyReminderInterval) : '7');
      setEnableOverdueReminder(!!summary.enableOverdueReminder);
      setOverdueReminderIntervalInput(summary.overdueReminderInterval !== undefined && summary.overdueReminderInterval !== null ? String(summary.overdueReminderInterval) : '7');

      setDiscountDateInput(summary.discountDate ? summary.discountDate.split('T')[0] : '');
      setDiscountAmountInput(summary.discountAmount !== undefined && summary.discountAmount !== null ? String(summary.discountAmount) : '0');

      setLateFeeDateInput(summary.lateFeeDate ? summary.lateFeeDate.split('T')[0] : '');
      setLateFeeAmountInput(summary.lateFeeAmount !== undefined && summary.lateFeeAmount !== null ? String(summary.lateFeeAmount) : '0');
    }
  }, [summary]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [newMember, setNewMember] = useState({ 
    name: '', email: '', mobile: '', secondaryEmail: '', secondaryMobile: '', secondaryPassword: '', enableSecondaryLogin: false, flatNo: '', address: '', 
    outstandingDues: 0, password: '', enableLogin: false, loginMethod: 'BOTH',
    defaultTenure: 'MONTHLY', paidUntil: '',
    initialPaymentAmount: 0, initialPaymentMode: 'CASH', initialPaymentNotes: '',
    photoUrl: '', idProofUrl: '',
    registrationYear: getFinancialYear(new Date()),
    initialPaymentDate: getTodayDateString(),
    residenceType: 'COMMON',
    bhk: 'COMMON',
    customBhk: '',
    useCommonMaintenance: true
  });
  const [editingMember, setEditingMember] = useState<any>(null);
  const [idProofType, setIdProofType] = useState<'PHOTO' | 'PDF'>('PHOTO');
  const [editIdProofType, setEditIdProofType] = useState<'PHOTO' | 'PDF'>('PHOTO');
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{url: string, type: string} | null>(null);

  const handleFileUpload = async (file: File, type: 'photo' | 'idProof') => {
    setUploading(true);
    const formData = new FormData();
    formData.append(type, file);

    try {
      const res = await axios.post('/upload/member-docs', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}` 
        }
      });
      
      const url = res.data[type === 'photo' ? 'photoUrl' : 'idProofUrl'];
      
      if (showModal === 'member') {
        setNewMember((prev: any) => ({ 
          ...prev, 
          [type === 'photo' ? 'photoUrl' : 'idProofUrl']: url 
        }));
      } else if (editingMember) {
        setEditingMember((prev: any) => ({ 
          ...prev, 
          [type === 'photo' ? 'photoUrl' : 'idProofUrl']: url 
        }));
      }
      showToast(`${type === 'photo' ? 'Photo' : 'ID Proof'} uploaded successfully!`, 'success');
    } catch (err) {
      console.error('Upload error', err);
      showToast('Error uploading file.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const DocumentViewer = ({ url, type, onClose }: { url: string, type: string, onClose: () => void }) => (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000, padding: '2rem' }} onClick={onClose}>
      <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: '-2.5rem', right: '-0.5rem', background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}>&times;</button>
        {url.toLowerCase().endsWith('.pdf') ? (
          <iframe src={url} style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: '0.5rem' }} title="Document Viewer" />
        ) : (
          <img src={url} alt={type} style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '0.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} />
        )}
      </div>
    </div>
  );


  const [newPayment, setNewPayment] = useState({ memberId: '', amount: 0, mode: 'CASH', notes: '', paidMonths: 0, periodLabel: 'Click to select', coverageStartDate: '', coverageEndDate: '', paymentDate: getTodayDateString(), ledgerDate: getTodayDateString(), category: 'Maintenance' });
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [upcomingMembers, setUpcomingMembers] = useState([]);
  const [newTransfer, setNewTransfer] = useState({ toAdminId: '', amount: 0, type: 'HANDOVER', referenceNote: '' });
  const [auditLogs, setAuditLogs] = useState([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>(SERVICE_TYPES_DEFAULT);
  const [designations, setDesignations] = useState<string[]>(['President', 'Secretary', 'Treasurer', 'Committee Member']);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Maintenance', 'Repairs', 'Utilities', 'Other']);

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const fetchFinancials = async () => {
    try {
      let url = '/reports/financials?';
      if (reportFilters.startDate && reportFilters.endDate) {
        url += `startDate=${reportFilters.startDate}&endDate=${reportFilters.endDate}`;
      } else if (reportFilters.month && reportFilters.year) {
        // Calculate start and end date of the month
        const start = new Date(parseInt(reportFilters.year), parseInt(reportFilters.month) - 1, 1).toISOString();
        const end = new Date(parseInt(reportFilters.year), parseInt(reportFilters.month), 0, 23, 59, 59).toISOString();
        url += `startDate=${start}&endDate=${end}`;
      } else if (reportFilters.year) {
        const start = new Date(parseInt(reportFilters.year), 0, 1).toISOString();
        const end = new Date(parseInt(reportFilters.year), 11, 31, 23, 59, 59).toISOString();
        url += `startDate=${start}&endDate=${end}`;
      }
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      setFinancials(res.data);
    } catch (err) {
      console.error("Error fetching financials", err);
    }
  };

  const getCalculatedDuesDetails = (member: any, mode: string) => {
    const defaultDetails = {
      modeLabel: 'Database',
      rateLabel: 'N/A',
      unpaidPeriods: 0,
      periodName: 'period',
      amount: member.outstandingDues || 0,
      annualFee: 0,
      hasFee: false
    };

    if (mode === 'DB') return defaultDetails;

    const regYear = member.registrationYear || getFinancialYear(member.createdAt ? new Date(member.createdAt) : new Date());
    const useCommon = member.useCommonMaintenance !== undefined ? member.useCommonMaintenance : true;
    const config = maintenanceCosts.find((c: any) => {
      if (c.financialYear !== regYear) return false;
      if (useCommon) {
        return c.residenceType === 'COMMON';
      } else {
        return c.residenceType === (member.residenceType || 'COMMON') && c.bhk === (member.bhk || 'COMMON');
      }
    });
    if (!config) return { ...defaultDetails, modeLabel: mode };

    const annualCost = config.amount;
    const today = new Date();
    
    // Financial year starts on April 1st of the starting year of config
    let startYearNum = today.getFullYear();
    if (regYear && regYear.includes('-')) {
      const parsed = parseInt(regYear.split('-')[0]);
      if (!isNaN(parsed)) startYearNum = parsed;
    }
    const fyStartDate = new Date(startYearNum, 3, 1); // April 1st
    const fyEndDate = new Date(startYearNum + 1, 2, 31, 23, 59, 59); // March 31st of next year

    // 1. Calculate how many months have been paid in this financial year so far
    let monthsPaid = 0;
    if (member.paidUntil) {
      const paidUntilDate = new Date(member.paidUntil);
      // Normalize to 1st of the month:
      // If the day is >= 15, we round up to the 1st of the next month.
      // If the day is < 15, it represents the 1st of this month.
      if (paidUntilDate.getDate() >= 15) {
        paidUntilDate.setMonth(paidUntilDate.getMonth() + 1);
      }
      paidUntilDate.setDate(1);

      if (paidUntilDate >= fyStartDate) {
        const cappedPaidUntil = paidUntilDate < fyEndDate ? paidUntilDate : fyEndDate;
        const pYears = cappedPaidUntil.getFullYear() - fyStartDate.getFullYear();
        const pMonths = cappedPaidUntil.getMonth() - fyStartDate.getMonth();
        monthsPaid = Math.max(0, pYears * 12 + pMonths);
      }
    }

    // 2. Determine the month index (relative to FY start) and length of the current period
    const currentMonth = today.getMonth(); // 0-11
    const fyMonthIndex = (currentMonth - 3 + 12) % 12; // 0 (April) to 11 (March)
    
    let periodStartIdx = 0;
    let periodLength = 1;
    
    if (mode === 'MONTHLY') {
      periodStartIdx = fyMonthIndex;
      periodLength = 1;
    } else if (mode === 'QUARTERLY') {
      periodStartIdx = Math.floor(fyMonthIndex / 3) * 3;
      periodLength = 3;
    } else if (mode === 'HALF_YEARLY') {
      periodStartIdx = Math.floor(fyMonthIndex / 6) * 6;
      periodLength = 6;
    } else if (mode === 'ANNUAL') {
      periodStartIdx = 0;
      periodLength = 12;
    }

    // 3. Calculate paid and unpaid months in the current period
    const paidInPeriod = Math.max(0, Math.min(periodStartIdx + periodLength, monthsPaid) - periodStartIdx);
    const unpaidInPeriod = Math.max(0, periodLength - paidInPeriod);

    const monthlyRate = annualCost / 12;
    const amount = unpaidInPeriod * monthlyRate;

    return {
      modeLabel: mode,
      rateLabel: `₹${monthlyRate.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`,
      unpaidPeriods: unpaidInPeriod,
      periodName: unpaidInPeriod === 1 ? 'month' : 'months',
      amount,
      annualFee: annualCost,
      hasFee: true
    };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [membersRes, paymentsRes, cashRes, pendingRes, summaryRes, vendorsRes, logsRes, expensesRes, stRes, desRes, ecRes, upcomingRes, finRes, mcRes, staffRes] = await Promise.all([
        axios.get('/members', { headers }),
        axios.get('/payments/history', { headers }),
        axios.get('/cash/in-hand', { headers }),
        axios.get('/cash/pending', { headers }),
        axios.get('/reports/summary', { headers }),
        axios.get('/vendors', { headers }),
        axios.get('/tenants/logs', { headers }),
        axios.get('/expenses', { headers }),
        axios.get('/master-data/SERVICE_TYPE', { headers }),
        axios.get('/master-data/DESIGNATION', { headers }),
        axios.get('/master-data/EXPENSE_CATEGORY', { headers }),
        axios.get('/payments/upcoming', { headers }),
        axios.get('/reports/financials', { headers }),
        axios.get('/maintenance-costs', { headers }),
        axios.get('/staff', { headers }),
      ]);
      setMembers(membersRes.data);
      setStaff(staffRes.data);
      setPayments(paymentsRes.data);
      setCashBalances(cashRes.data);
      setPendingTransfers(pendingRes.data);
      setSummary(summaryRes.data);
      setFinancials(finRes.data);
      setVendors(vendorsRes.data);
      setAuditLogs(logsRes.data);
      setExpenses(expensesRes.data);
      setServiceTypes(stRes.data.map((x: any) => x.value));
      setDesignations(desRes.data.map((x: any) => x.value));
      setExpenseCategories(ecRes.data.map((x: any) => x.value));
      setUpcomingMembers(upcomingRes.data);
      setMaintenanceCosts(mcRes.data);
    } catch (err) {
      console.error('Error fetching data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/cash/transfer', newTransfer, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(null);
      setNewTransfer({ toAdminId: '', amount: 0, type: 'HANDOVER', referenceNote: '' });
      fetchData();
      showToast('Transfer initiated successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error initiating transfer', 'error');
    }
  };

  const getDayFromDateString = (dateStr: string) => {
    if (!dateStr) return 0;
    const datePart = dateStr.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      return parseInt(parts[2], 10);
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.getDate() : 0;
  };

  const getMonthsCount = (defaultMonths: number, start: string, end: string) => {
    if (start && end) {
      const s = new Date(start);
      const e = new Date(end);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
        return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
      }
    }
    return defaultMonths;
  };

  const getPricing = (months: number, selectedCategory: string = 'Maintenance', payDate: string = getTodayDateString(), coverageStart: string = '', coverageEnd: string = '') => {
    if (months === 0) return 0;
    const totalMonths = getMonthsCount(months, coverageStart, coverageEnd);
    let baseAmount = 0;
    
    if (totalMonths === 3 && summary.quarterlyAmount) {
      baseAmount = summary.quarterlyAmount;
    } else if (totalMonths === 6 && summary.halfYearlyAmount) {
      baseAmount = summary.halfYearlyAmount;
    } else if (totalMonths === 12 && summary.annualAmount) {
      baseAmount = summary.annualAmount;
    } else {
      baseAmount = (summary.maintenanceAmount || 0) * totalMonths;
    }

    let finalAmount = baseAmount;

    // Apply early bird discount
    if (selectedCategory === 'Maintenance' && summary.discountDate && summary.discountAmount && payDate) {
      const discountDeadline = new Date(summary.discountDate);
      const paymentDateVal = new Date(payDate);
      discountDeadline.setHours(23, 59, 59, 999);
      paymentDateVal.setHours(0, 0, 0, 0);

      if (paymentDateVal <= discountDeadline) {
        finalAmount = Math.max(0, finalAmount - summary.discountAmount);
      }
    }

    // Apply late fee based on day of the month only
    if (selectedCategory === 'Maintenance' && summary.lateFeeDate && summary.lateFeeAmount && payDate) {
      const cutOffDay = getDayFromDateString(summary.lateFeeDate);
      const paymentDay = getDayFromDateString(payDate);

      if (paymentDay > cutOffDay) {
        finalAmount += totalMonths * summary.lateFeeAmount;
      }
    }

    return finalAmount;
  };

  const handleApproveTransfer = async (id: string) => {
    try {
      await axios.post(`/cash/approve/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Transfer approved and balance updated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error approving transfer', 'error');
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/payments', newPayment, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(null);
      setNewPayment({ memberId: '', amount: 0, mode: 'CASH', notes: '', paidMonths: 0, periodLabel: 'Click to select', coverageStartDate: '', coverageEndDate: '', paymentDate: getTodayDateString(), ledgerDate: getTodayDateString(), category: 'Maintenance' });
      fetchData();
      showToast('Payment recorded successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error recording payment', 'error');
    }
  };

  const handleSubmitMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMember.mobile) {
      const cleanMobile = newMember.mobile.trim();
      if (cleanMobile !== "" && !/^\d{10}$/.test(cleanMobile)) {
        showToast("Primary mobile number must be exactly 10 digits", 'error');
        return;
      }
    }
    if (newMember.secondaryMobile) {
      const cleanSecMobile = newMember.secondaryMobile.trim();
      if (cleanSecMobile !== "" && !/^\d{10}$/.test(cleanSecMobile)) {
        showToast("Secondary mobile number must be exactly 10 digits", 'error');
        return;
      }
    }
    try {
      const finalBhk = newMember.residenceType === 'COMMON' 
        ? 'COMMON'
        : (newMember.bhk === 'other' ? newMember.customBhk.trim() : newMember.bhk);

      if (newMember.residenceType !== 'COMMON' && !finalBhk) {
        showToast("Please enter BHK value", 'error');
        return;
      }

      await axios.post('/members', {
        ...newMember,
        bhk: finalBhk
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(null);
      setNewMember({ 
        name: '', email: '', mobile: '', secondaryEmail: '', secondaryMobile: '', secondaryPassword: '', enableSecondaryLogin: false, flatNo: '', address: '', 
        outstandingDues: 0, password: '', enableLogin: false, loginMethod: 'BOTH',
        defaultTenure: 'MONTHLY', paidUntil: '', 
        initialPaymentAmount: 0, initialPaymentMode: 'CASH', initialPaymentNotes: '',
        photoUrl: '', idProofUrl: '',
        registrationYear: getFinancialYear(new Date()),
        initialPaymentDate: getTodayDateString(),
        residenceType: 'COMMON',
        bhk: 'COMMON',
        customBhk: '',
        useCommonMaintenance: true
      });
      fetchData();
      showToast('Member added successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error adding member', 'error');
    }
  };
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMember.mobile) {
      const cleanMobile = editingMember.mobile.trim();
      if (cleanMobile !== "" && !/^\d{10}$/.test(cleanMobile)) {
        showToast("Primary mobile number must be exactly 10 digits", 'error');
        return;
      }
    }
    if (editingMember.secondaryMobile) {
      const cleanSecMobile = editingMember.secondaryMobile.trim();
      if (cleanSecMobile !== "" && !/^\d{10}$/.test(cleanSecMobile)) {
        showToast("Secondary mobile number must be exactly 10 digits", 'error');
        return;
      }
    }
    try {
      const finalBhk = editingMember.residenceType === 'COMMON'
        ? 'COMMON'
        : (editingMember.bhk === 'other' ? editingMember.customBhk.trim() : editingMember.bhk);

      if (editingMember.residenceType !== 'COMMON' && !finalBhk) {
        showToast("Please enter BHK value", 'error');
        return;
      }

      await axios.patch(`/members/${editingMember.id}`, {
        ...editingMember,
        bhk: finalBhk
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(null);
      setEditingMember(null);
      fetchData();
      showToast('Member updated successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error updating member', 'error');
    }
  };

  const handleEditClick = (m: any) => {
    let initialLoginMethod = 'BOTH';
    if (m.userId) {
      if (m.email && !m.mobile) initialLoginMethod = 'EMAIL';
      else if (!m.email && m.mobile) initialLoginMethod = 'MOBILE';
    }
    const isStandardBhk = ['COMMON', '1', '2', '3', '4'].includes(m.bhk || 'COMMON');
    setEditingMember({ 
      ...m, 
      password: '', 
      enableLogin: !!m.userId,
      loginMethod: initialLoginMethod,
      secondaryPassword: '',
      enableSecondaryLogin: !!m.secondaryUserId,
      secondaryEmail: m.secondaryEmail || '',
      secondaryMobile: m.secondaryMobile || '',
      paidUntil: m.paidUntil ? new Date(m.paidUntil).toISOString().split('T')[0] : '',
      photoUrl: m.photoUrl || '',
      idProofUrl: m.idProofUrl || '',
      registrationYear: m.registrationYear || getFinancialYear(m.createdAt ? new Date(m.createdAt) : new Date()),
      _duesRaw: (m.outstandingDues || 0).toString(),
      residenceType: m.residenceType || 'COMMON',
      bhk: isStandardBhk ? (m.bhk || 'COMMON') : 'other',
      customBhk: isStandardBhk ? '' : (m.bhk || ''),
      useCommonMaintenance: m.useCommonMaintenance !== undefined ? m.useCommonMaintenance : true
    });
    setEditIdProofType(m.idProofUrl && m.idProofUrl.toLowerCase().endsWith('.pdf') ? 'PDF' : 'PHOTO');
    setShowModal('edit-member');
  };

  const handleVacantMember = async (id: string, name: string, flatNo: string) => {
    const member = members.find(m => m.id === id);
    const isStaff = member && member.userId && staff.some(s => s.id === member.userId);

    const details = getCalculatedDuesDetails(member, duesCalcMode);
    const dueAmount = details.amount;
    const hasDues = dueAmount > 0;

    let confirmMsg = `Are you sure you want to mark Flat ${flatNo} (${name}) as VACANT?\nThis will revoke their login access and pause future dues. You can add a new occupant to this flat later.`;
    
    if (hasDues) {
      confirmMsg += `\n\n⚠️ WARNING: This member has pending dues of ₹${dueAmount.toLocaleString()}.\nOnce marked vacant, they will be hidden from the active members list, but their outstanding dues will be shown separately at the bottom of this page.`;
    }

    if (!await confirm({
      title: 'Mark Flat as Vacant',
      message: confirmMsg,
      danger: true,
      confirmLabel: 'Mark Vacant',
      cancelLabel: 'Cancel'
    })) return;

    let removeStaff = false;
    if (isStaff) {
      removeStaff = await confirm({
        title: 'Remove Linked Office Bearer',
        message: `"${name}" is also registered as an Office Bearer.\n\n` +
          `Do you want to remove them from the Office Bearers list as well?\n` +
          `• Click OK to remove from BOTH (Member & Office Bearer)\n` +
          `• Click Cancel to remove ONLY as Member (keeps them as Office Bearer)`,
        confirmLabel: 'Remove from BOTH',
        cancelLabel: 'Remove ONLY as Member',
        danger: true
      });
    }

    try {
      await axios.patch(`/members/${id}/vacant?removeStaff=${removeStaff}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Flat marked as vacant successfully.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error marking vacant', 'error');
    }
  };


  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleCancelPayment = async (id: string) => {
    if (!await confirm({
      title: 'Cancel Payment',
      message: 'Are you sure you want to cancel this payment? This will revert the cash balance and member dues.',
      danger: true,
      confirmLabel: 'Cancel Payment',
      cancelLabel: 'Keep Payment'
    })) return;
    try {
      await axios.patch(`/payments/${id}`, { status: 'CANCELLED' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      showToast('Payment cancelled successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error cancelling payment', 'error');
    }
  };

  const handleOpenEditPayment = (payment: any) => {
    setEditingPayment({
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      memberName: payment.member?.name || '',
      memberFlatNo: payment.member?.flatNo || '',
      amount: payment.amount,
      mode: payment.mode,
      notes: payment.notes || '',
      paymentDate: toISODateString(payment.paymentDate),
      ledgerDate: toISODateString(payment.ledgerDate),
      coverageStartDate: toISODateString(payment.coverageStartDate),
      coverageEndDate: toISODateString(payment.coverageEndDate),
      paidMonths: payment.paidMonths || 1,
      category: payment.category || 'Maintenance',
    });
    setShowModal('editPayment');
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.patch(`/payments/${editingPayment.id}`, {
        amount: editingPayment.amount,
        mode: editingPayment.mode,
        notes: editingPayment.notes,
        paymentDate: editingPayment.paymentDate || null,
        ledgerDate: editingPayment.ledgerDate || null,
        coverageStartDate: editingPayment.coverageStartDate || null,
        coverageEndDate: editingPayment.coverageEndDate || null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowModal(null);
      setEditingPayment(null);
      fetchData();
      showToast('Payment updated successfully', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error updating payment', 'error');
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const members = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const member: any = {};
        headers.forEach((header, index) => {
          member[header] = values[index];
        });
        return member;
      });

      try {
        await axios.post('/members/bulk', { members }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchData();
        showToast('Bulk import successful', 'success');
      } catch (err) {
        showToast('Error during bulk import. Check CSV format.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const headers = ['name', 'email', 'mobile', 'flatNo', 'outstandingDues', 'address'];
    const rows = [
      ['John Doe', 'john@example.com', '9876543210', 'A-101', '500', 'GKR Nagar'],
      ['Jane Smith', 'jane@example.com', '9876543211', 'B-202', '0', 'GKR Nagar']
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'member_import_template.csv';
    a.click();
  };

  const downloadDuesList = () => {
    const membersWithDues = upcomingMembers.filter((m: any) => {
      const details = getCalculatedDuesDetails(m, duesCalcMode);
      return details.amount > 0;
    });

    if (membersWithDues.length === 0) {
      showToast("No members with outstanding dues to download.", 'error');
      return;
    }

    const headers = ["Flat No", "Member Name", "Email", "Mobile", "Paid Until", "Outstanding Dues", "Calculation Mode", "Status"];
    
    const rows = membersWithDues.map((m: any) => {
      const details = getCalculatedDuesDetails(m, duesCalcMode);
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const isOverdue = m.paidUntil ? new Date(m.paidUntil) < currentMonthStart : true;
      const statusLabel = isOverdue ? "Overdue" : "Due This Month";
      const paidUntilStr = m.paidUntil ? new Date(m.paidUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'No Record';
      
      return [
        m.flatNo || '',
        m.name || '',
        m.email || '',
        m.mobile || '',
        paidUntilStr,
        details.amount.toFixed(2),
        details.modeLabel,
        statusLabel
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dues_list_${duesCalcMode.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFinancialsAsCSV = () => {
    if (!financials) return;
    
    let csvContent = "Category,Type,Amount\n";
    
    // Income
    (financials.profitAndLoss?.income || []).forEach((i: any) => {
      csvContent += `"${i.category}","Income","${i.amount}"\n`;
    });
    csvContent += `"Total Income","","${financials.profitAndLoss?.totalIncome || 0}"\n\n`;
    
    // Expenses
    (financials.profitAndLoss?.expenses || []).forEach((e: any) => {
      csvContent += `"${e.category}","Expense","${e.amount}"\n`;
    });
    csvContent += `"Total Expenses","","${financials.profitAndLoss?.totalExpenses || 0}"\n\n`;
    csvContent += `"Net Profit","","${financials.profitAndLoss?.netProfit || 0}"\n\n`;
    
    // Balance Sheet
    csvContent += "Balance Sheet Item,,Amount\n";
    csvContent += `"Cash in Hand",,"${financials.balanceSheet?.assets?.cashInHand || 0}"\n`;
    csvContent += `"Bank Balance",,"${financials.balanceSheet?.assets?.bankBalance || 0}"\n`;
    csvContent += `"Dues Receivable",,"${financials.balanceSheet?.assets?.duesReceivable || 0}"\n`;
    csvContent += `"Corpus Funds (Liabilities)",,"${financials.balanceSheet?.liabilities?.corpusFunds || 0}"\n`;
    const bsNetProfit = financials.balanceSheet?.netProfit !== undefined ? financials.balanceSheet.netProfit : (financials.profitAndLoss?.netProfit || 0);
    if (bsNetProfit > 0) {
      csvContent += `"Profit & Loss A/c (Profit - Liabilities)",,"${bsNetProfit}"\n`;
    } else if (bsNetProfit < 0) {
      csvContent += `"Profit & Loss A/c (Loss - Assets)",,"${Math.abs(bsNetProfit)}"\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const myBalance = user?.id ? (cashBalances.find((b: any) => b.userId === user.id)?.balance || 0) : 0;

  const exportMembers = () => {
    const headers = ['Name', 'Flat No', 'Email', 'Mobile', 'Status', 'Outstanding Dues'];
    const rows = members.map((m: any) => [m.name, m.flatNo, m.email, m.mobile, m.status, m.outstandingDues]);
    exportTableToCSV(`members_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const exportPayments = () => {
    const headers = ['Receipt No', 'Member Name', 'Flat No', 'Amount', 'Mode', 'Date', 'Period', 'Status'];
    const rows = payments.map((p: any) => [
      p.receiptNumber, p.member?.name || '', p.member?.flatNo || '', p.amount, 
      p.mode, new Date(p.paymentDate).toLocaleDateString(), p.periodLabel || '', p.status
    ]);
    exportTableToCSV(`payments_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
        <div style={{ textAlign: 'center' }}>
          <Building size={48} className="animate-pulse" style={{ marginBottom: '1rem', color: 'var(--primary)' }} />
          <p>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': {
        const totalCashInHand = summary.totalCashInHand || 0;
        const netBalance = summary.netBalance || 0;
        const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899'];
        const pct = (curr: number, prev: number) => prev === 0 ? null : Math.round(((curr - prev) / prev) * 100);
        const thisMonthIncomePct = pct(summary.thisMonthIncome || 0, summary.lastMonthIncome || 0);
        const thisMonthExpensePct = pct(summary.thisMonthExpenses || 0, summary.lastMonthExpenses || 0);

        const KpiCard = ({ title, value, subtitle, color, trend, icon: Icon }: any) => (
          <div className="card stat-card" style={{ borderLeft: `4px solid ${color}`, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div className="stat-title">{title}</div>
                <div className="stat-value" style={{ color }}>{value}</div>
                {subtitle && <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>{subtitle}</div>}
              </div>
              <div style={{ backgroundColor: `${color}22`, borderRadius: '0.75rem', padding: '0.6rem' }}>
                <Icon size={22} style={{ color }} />
              </div>
            </div>
            {trend !== null && trend !== undefined && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem' }}>
                {trend >= 0
                  ? <TrendingUp size={13} style={{ color: '#10b981' }} />
                  : <TrendingUp size={13} style={{ color: '#ef4444', transform: 'scaleY(-1)' }} />}
                <span style={{ color: trend >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{Math.abs(trend)}%</span>
                <span style={{ color: 'var(--text-secondary)' }}>vs last month</span>
              </div>
            )}
          </div>
        );

        return (
          <>
            {/* ─── Row 1: KPI Cards ─────────────────────── */}
            <div className="stat-grid">
              <KpiCard title="Total Collection" value={`₹${(summary.totalIncome || 0).toLocaleString()}`}
                subtitle={`This month: ₹${(summary.thisMonthIncome || 0).toLocaleString()}`}
                color="#10b981" trend={thisMonthIncomePct} icon={TrendingUp} />
              <KpiCard title="Total Expenses" value={`₹${(summary.totalExpenses || 0).toLocaleString()}`}
                subtitle={`This month: ₹${(summary.thisMonthExpenses || 0).toLocaleString()}`}
                color="#ef4444" trend={thisMonthExpensePct !== null ? -thisMonthExpensePct! : null} icon={Receipt} />
              <KpiCard title="Net Balance" value={`₹${netBalance.toLocaleString()}`}
                subtitle={`Collection – Expenses`}
                color={netBalance >= 0 ? '#6366f1' : '#f59e0b'} trend={null} icon={Building} />
              <KpiCard title="Cash In Hand" value={`₹${totalCashInHand.toLocaleString()}`}
                subtitle={`Your share: ₹${myBalance.toLocaleString()}`}
                color="#f59e0b" trend={null} icon={Users2} />
            </div>

            {/* ─── Row 2: Reconciliation Strip ─────────── */}
            <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
              <h4 style={{ marginBottom: '1.25rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Financial Reconciliation
              </h4>

              {/* Top row: the 4 primary KPI values */}
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Total Collected', val: summary.totalIncome || 0, sub: 'All payment modes', color: '#10b981' },
                  { label: 'Total Expenses', val: summary.totalExpenses || 0, sub: 'All recorded expenses', color: '#ef4444' },
                  { label: 'Net Balance', val: netBalance, sub: 'Collected − Expenses', color: netBalance >= 0 ? '#6366f1' : '#f59e0b' },
                  { label: 'Cash In Hand', val: totalCashInHand, sub: 'Physical cash available', color: '#f59e0b' },
                ].map((item, i) => (
                  <div key={i} style={{ textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '1rem', border: `1px solid ${item.color}44` }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: item.color }}>₹{item.val.toLocaleString()}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Cash In Hand breakdown */}
              <div style={{ backgroundColor: 'var(--bg-secondary)', borderRadius: '0.75rem', padding: '1rem 1.25rem', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Cash In Hand — How It's Calculated
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cash Collected</span>
                    <span style={{ fontWeight: 700, color: '#10b981' }}>+ ₹{(summary.totalCashCollected || 0).toLocaleString()}</span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 300 }}>−</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cash Expenses</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{(summary.totalSocietyExpensesPaidCash || 0).toLocaleString()}</span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 300 }}>−</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Bank Deposited</span>
                    <span style={{ fontWeight: 700, color: '#ef4444' }}>₹{(summary.totalDeposited || 0).toLocaleString()}</span>
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem', fontWeight: 300 }}>=</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Cash In Hand</span>
                    <span style={{ fontWeight: 800, fontSize: '1rem', color: '#f59e0b' }}>₹{totalCashInHand.toLocaleString()}</span>
                  </span>
                  {(summary.totalNonCashCollected || 0) > 0 && (
                    <>
                      <span style={{ marginLeft: '1rem', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Non-Cash (UPI/Bank/Cheque)</span>
                        <span style={{ fontWeight: 600, color: '#6366f1' }}>₹{(summary.totalNonCashCollected || 0).toLocaleString()}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Outstanding dues alert */}
              {(summary.totalOutstanding || 0) > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: '0.75rem', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <span style={{ fontSize: '0.875rem', color: '#f59e0b' }}>
                    ⚠️ <strong>{summary.membersWithDues || 0} member{(summary.membersWithDues || 0) !== 1 ? 's' : ''}</strong> have outstanding dues of <strong>₹{(summary.totalOutstanding || 0).toLocaleString()}</strong>
                  </span>
                  <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => setActiveTab('members')}>
                    View Members →
                  </button>
                </div>
              )}
            </div>

            {/* ─── Row 3: Charts ───────────────────────── */}
            <div className="responsive-grid-dashboard responsive-grid">
              {/* 6-month trend */}
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>6-Month Income vs Expense Trend</h3>
                <div style={{ width: '100%', minWidth: 0, height: 260, overflow: 'hidden' }}>
                  <ResponsiveContainer width="100%" height={260} debounce={50}>
                    <LineChart data={summary.monthlyTrends || []} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="month" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} />
                      <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '0.5rem' }}
                        formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
                      <Legend iconType="circle" iconSize={8} />
                      <Line type="monotone" dataKey="income" name="Collection" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Expense by category pie */}
              <div className="card">
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem' }}>Expenses by Category</h3>
                {(summary.expenseByCategory || []).length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 0', fontSize: '0.875rem' }}>No expenses recorded yet</div>
                ) : (
                  <div style={{ width: '100%', minWidth: 0, height: 220, overflow: 'hidden' }}>
                    <ResponsiveContainer width="100%" height={220} debounce={50}>
                      <PieChart>
                        <Pie data={summary.expenseByCategory || []} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                          {(summary.expenseByCategory || []).map((_: any, index: number) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }}
                          formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, '']} />
                        <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Row 4: Recent Activity + Cash Holders ── */}
            <div className="responsive-grid-dashboard responsive-grid">
              {/* Recent payments */}
              <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Recent Collections</h3>
                {(summary.recentPayments || []).length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No payments recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {(summary.recentPayments || []).map((p: any) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.memberName}</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Flat {p.flatNo}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#10b981' }}>₹{Number(p.amount).toLocaleString()}</div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                            {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} · {p.mode}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Cash in hand per admin */}
              <div className="card">
                <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem' }}>Cash In Hand — Holders</h3>
                {cashBalances.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No cash balance data available.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {cashBalances.map((admin: any) => (
                      <div key={admin.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem', border: admin.userId === user?.id ? '1px solid var(--primary)' : '1px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>
                            {admin.userName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{admin.userName}</div>
                            {admin.userId === user?.id && <div style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>You</div>}
                          </div>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f59e0b' }}>₹{admin.balance.toLocaleString()}</div>
                      </div>
                    ))}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.6rem', marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total</span>
                      <span style={{ fontWeight: 700, color: '#f59e0b' }}>₹{totalCashInHand.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      }
      case 'helpdesk':
        return <Helpdesk token={token} />;
      case 'members': {
        const filteredMembers = members.filter((m: any) => {
          if (m.status === 'VACANT') return false;
          const query = memberSearchQuery.toLowerCase().trim();
          if (!query) return true;
          return (
            String(m.name || '').toLowerCase().includes(query) ||
            String(m.flatNo || '').toLowerCase().includes(query) ||
            String(m.mobile || '').toLowerCase().includes(query) ||
            String(m.email || '').toLowerCase().includes(query)
          );
        });

        const vacantWithDues = members.filter((m: any) => {
          if (m.status !== 'VACANT') return false;
          const details = getCalculatedDuesDetails(m, duesCalcMode);
          return details.amount > 0;
        });

        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1, minWidth: '320px' }}>
                <h3 style={{ margin: 0, whiteSpace: 'nowrap' }}>Society Members</h3>
                <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    placeholder="Search name, flat, mobile..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                      borderRadius: '0.5rem',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      fontSize: '0.8125rem',
                      color: 'var(--text-primary)',
                      outline: 'none',
                      height: '38px',
                    }}
                  />
                  {memberSearchQuery && (
                    <button
                      onClick={() => setMemberSearchQuery('')}
                      style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.1rem', padding: 0 }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
              <div className="action-button-group">
                <button className="btn btn-secondary" onClick={exportMembers} title="Export to CSV">
                  <Download size={18} /> Export Excel
                </button>
                <button className="btn btn-secondary" onClick={downloadTemplate} title="Download CSV Template">
                  <Download size={18} /> Template
                </button>
                <div style={{ position: 'relative' }}>
                  <button className="btn btn-secondary" onClick={() => document.getElementById('bulk-import')?.click()}>
                    <Upload size={18} /> Bulk Import
                  </button>
                  <input
                    id="bulk-import"
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={handleBulkUpload}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal('member')}><Plus size={18} /> Add Member</button>
              </div>
            </div>
            <div className="table-container">
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Flat No</th>
                    <th>Contact Info</th>
                    <th>Dues</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '0.25rem' }}>No matching members found</div>
                        <div style={{ fontSize: '0.8125rem', opacity: 0.7 }}>Try widening your search terms or clearing the search query</div>
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((m: any) => {
                      const details = getCalculatedDuesDetails(m, duesCalcMode);
                      const dueAmount = details.amount;
                      return (
                        <tr key={m.id}>
                          <td>
                            <strong>{m.name}</strong>
                            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                              {m.photoUrl && (
                                <span onClick={() => setSelectedDoc({url: m.photoUrl, type: 'Profile Photo'})} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--primary)', cursor: 'pointer', border: '1px solid rgba(37,99,235,0.2)' }} title="Click to view profile photo">
                                  <Image size={10} /> Photo
                                </span>
                              )}
                              {m.idProofUrl && (
                                <span onClick={() => setSelectedDoc({url: m.idProofUrl, type: 'ID Proof'})} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--success)', cursor: 'pointer', border: '1px solid rgba(16,185,129,0.2)' }} title="Click to view ID proof">
                                  <FileText size={10} /> ID Proof
                                </span>
                              )}
                            </div>
                          </td>
                          <td><code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>{m.flatNo}</code></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                            <div style={{ marginBottom: '0.2rem' }}>
                              {m.email || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No email</span>}
                            </div>
                            {m.mobile}
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: dueAmount > 0 ? 'var(--error)' : 'var(--success)' }}>
                              ₹{dueAmount.toLocaleString()}
                            </span>
                            {details.hasFee && duesCalcMode !== 'DB' && dueAmount > 0 && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '0.15rem' }}>
                                {details.unpaidPeriods} {details.periodName} @ {details.rateLabel}
                              </div>
                            )}
                            {!details.hasFee && duesCalcMode !== 'DB' && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--error)', fontWeight: 'normal', marginTop: '0.15rem' }}>
                                No FY fee
                              </div>
                            )}
                          </td>
                          <td><span className={`badge ${m.status === 'ACTIVE' ? 'badge-success' : 'badge-error'}`}>{m.status}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                onClick={() => { setSelectedMember(m); setShowModal('member-history'); }}
                                title="View Payment History"
                              >
                                <Eye size={14} /> History
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '0.5rem' }} onClick={() => handleEditClick(m)} title="Edit Member">
                                <Edit size={16} />
                              </button>
                              {m.status !== 'VACANT' && (
                                <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '0.5rem', color: 'var(--error)' }} onClick={() => handleVacantMember(m.id, m.name, m.flatNo)} title="Mark Flat as Vacant">
                                  <LogOut size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {vacantWithDues.length > 0 && (
              <div style={{ marginTop: '3rem', borderTop: '1px dashed var(--border-color)', paddingTop: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <XCircle size={18} style={{ color: 'var(--error)' }} />
                  <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Vacated Members with Pending Dues</h3>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  These members have vacated their flats but still have outstanding dues that need to be collected.
                </p>
                <div className="table-container">
                  <table style={{ tableLayout: 'fixed', width: '100%' }}>
                    <colgroup>
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '10%' }} />
                      <col style={{ width: '22%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '22%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Flat No</th>
                        <th>Contact Info</th>
                        <th>Dues</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vacantWithDues.map((m: any) => {
                        const details = getCalculatedDuesDetails(m, duesCalcMode);
                        const dueAmount = details.amount;
                        return (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.name}</strong>
                              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                                {m.photoUrl && (
                                  <span onClick={() => setSelectedDoc({url: m.photoUrl, type: 'Profile Photo'})} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--primary)', cursor: 'pointer', border: '1px solid rgba(37,99,235,0.2)' }} title="Click to view profile photo">
                                    <Image size={10} /> Photo
                                  </span>
                                )}
                                {m.idProofUrl && (
                                  <span onClick={() => setSelectedDoc({url: m.idProofUrl, type: 'ID Proof'})} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', fontWeight: 600, padding: '0.15rem 0.4rem', borderRadius: '0.25rem', backgroundColor: 'rgba(16,185,129,0.08)', color: 'var(--success)', cursor: 'pointer', border: '1px solid rgba(16,185,129,0.2)' }} title="Click to view ID proof">
                                    <FileText size={10} /> ID Proof
                                  </span>
                                )}
                              </div>
                            </td>
                            <td><code style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.2rem 0.4rem', borderRadius: '0.25rem' }}>{m.flatNo}</code></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                              <div style={{ marginBottom: '0.2rem' }}>
                                {m.email || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>No email</span>}
                              </div>
                              {m.mobile}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600, color: 'var(--error)' }}>
                                ₹{dueAmount.toLocaleString()}
                              </span>
                            </td>
                            <td><span className="badge badge-error">{m.status}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                  onClick={() => { setSelectedMember(m); setShowModal('member-history'); }}
                                  title="View Payment History"
                                >
                                  <Eye size={14} /> History
                                </button>
                                <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '0.5rem' }} onClick={() => handleEditClick(m)} title="Edit Member">
                                  <Edit size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'payments':
        return (
          <div className="card">
            <div className="section-header-row">
              <h3>Payment History</h3>
              <div className="action-button-group">
                <button className="btn btn-secondary" onClick={exportPayments}>
                  <Download size={18} /> Export Excel
                </button>
                <button className="btn btn-primary" onClick={() => setShowModal('payment')}>
                  <Plus size={18} /> Record Payment
                </button>
              </div>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Date</th>
                    <th>FY</th>
                    <th>Coverage</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id}>
                      <td><code style={{ fontSize: '0.8125rem' }}>{p.receiptNumber}</code></td>
                      <td><strong>{p.member?.name}</strong></td>
                      <td style={{ fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                      <td><span className={`badge ${p.mode === 'CASH' ? 'badge-warning' : 'badge-success'}`}>{p.mode}</span></td>
                      <td style={{ fontSize: '0.8125rem' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                      <td style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {p.coverageStartDate ? getFinancialYear(new Date(p.coverageStartDate)) : (p.periodLabel === 'Initial Onboarding Fee' ? 'Onboarding' : getFinancialYear(new Date(p.paymentDate)))}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {p.coverageStartDate && p.coverageEndDate ? (
                          `${formatLocalDate(p.coverageStartDate)} - ${formatLocalDate(p.coverageEndDate)}`
                        ) : (
                          p.periodLabel || '-'
                        )}
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-error'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => { setSelectedPayment(p); setShowModal('receipt'); }} title="View Receipt">
                            <Eye size={16} />
                          </button>
                          {p.status !== 'CANCELLED' && (
                            <>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--primary)' }} onClick={() => handleOpenEditPayment(p)} title="Edit Payment">
                                <Edit size={16} />
                              </button>
                              <button className="btn btn-secondary" style={{ padding: '0.4rem', color: 'var(--error)' }} onClick={() => handleCancelPayment(p.id)} title="Cancel Payment">
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'ledger-reconciliation': {
        return (
          <div className="card">
            <div className="section-header-row">
              <div>
                <h3>Ledger Payment Dates</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                  Compare the date payment was received from a member vs the date recorded in the ledger.
                </p>
              </div>
            </div>


            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Receipt No</th>
                    <th>Member</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>Received Date (Member)</th>
                    <th>Recorded Date (Ledger)</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No payment records found
                      </td>
                    </tr>
                  ) : (
                    payments.map((p: any) => {
                      const recDate = p.paymentDate ? new Date(p.paymentDate) : null;
                      const ledDate = p.ledgerDate ? new Date(p.ledgerDate) : null;

                      return (
                        <tr key={p.id}>
                          <td><code style={{ fontSize: '0.8125rem' }}>{p.receiptNumber}</code></td>
                          <td><strong>{p.member?.name}</strong> <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({p.member?.flatNo})</span></td>
                          <td style={{ fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                          <td><span className={`badge ${p.mode === 'CASH' ? 'badge-warning' : 'badge-success'}`}>{p.mode}</span></td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {recDate ? recDate.toLocaleDateString() : '-'}
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {ledDate ? ledDate.toLocaleDateString() : (
                              <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not recorded</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-error'}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.notes || ''}>
                            {p.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'expenses':
        return <ExpenseManagement token={token} expenses={expenses} vendors={vendors} expenseCategories={expenseCategories} members={members} onRefresh={fetchData} />;
      case 'reports': {
        const incomeItems = financials?.profitAndLoss?.income || [];
        const expenseItems = financials?.profitAndLoss?.expenses || [];
        const totalIncome = financials?.profitAndLoss?.totalIncome || 0;
        const totalExpenses = financials?.profitAndLoss?.totalExpenses || 0;
        const netProfit = financials?.profitAndLoss?.netProfit || 0;

        const dateRangeStr = (reportFilters.startDate && reportFilters.endDate)
          ? `${new Date(reportFilters.startDate).toLocaleDateString('en-GB')} to ${new Date(reportFilters.endDate).toLocaleDateString('en-GB')}`
          : (reportFilters.month && reportFilters.year)
          ? `${new Date(parseInt(reportFilters.year), parseInt(reportFilters.month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`
          : reportFilters.year ? `1-Jan-${reportFilters.year} to 31-Dec-${reportFilters.year}` : `1-Apr-${new Date().getFullYear()-1} to 31-Mar-${new Date().getFullYear()}`;

        const asAtDate = reportFilters.endDate ? new Date(reportFilters.endDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');

        // Custom mapping functions
        const mapExpenditures = (items: any[], surplusAmt: number) => {
          let matched = {
            consumable: 0, honorarium: 0, salary: 0, repairs: 0, specificShow: 0,
            entertainment: 0, printing: 0, newspapers: 0, postage: 0, lawns: 0,
            rent: 0, municipalTaxes: 0, insurance: 0, lossOnSale: 0, depreciation: 0,
            auditFees: 0, misc: 0
          };
          items.forEach(item => {
            const cat = (item.category || '').toLowerCase();
            if (cat.includes('consumable') || cat.includes('material') || cat.includes('supply') || cat.includes('inventory')) {
              matched.consumable += item.amount;
            } else if (cat.includes('honorarium')) {
              matched.honorarium += item.amount;
            } else if (cat.includes('salary') || cat.includes('wage') || cat.includes('staff')) {
              matched.salary += item.amount;
            } else if (cat.includes('lawn') || cat.includes('garden') || cat.includes('landscaping')) {
              matched.lawns += item.amount;
            } else if (cat.includes('repair') || cat.includes('maintenance') || cat.includes('upkeep')) {
              matched.repairs += item.amount;
            } else if (cat.includes('specific show') || cat.includes('event') || cat.includes('cultural') || cat.includes('festival')) {
              matched.specificShow += item.amount;
            } else if (cat.includes('entertainment') || cat.includes('recreation')) {
              matched.entertainment += item.amount;
            } else if (cat.includes('print') || cat.includes('stationery') || cat.includes('paper')) {
              matched.printing += item.amount;
            } else if (cat.includes('newspaper') || cat.includes('magazine') || cat.includes('periodical')) {
              matched.newspapers += item.amount;
            } else if (cat.includes('postage') || cat.includes('courier') || cat.includes('mail')) {
              matched.postage += item.amount;
            } else if (cat.includes('rent') || cat.includes('lease')) {
              matched.rent += item.amount;
            } else if (cat.includes('tax') || cat.includes('municipal') || cat.includes('property tax')) {
              matched.municipalTaxes += item.amount;
            } else if (cat.includes('insurance')) {
              matched.insurance += item.amount;
            } else if (cat.includes('loss on sale') || cat.includes('asset loss')) {
              matched.lossOnSale += item.amount;
            } else if (cat.includes('depreciation') || cat.includes('depr')) {
              matched.depreciation += item.amount;
            } else if (cat.includes('audit') || cat.includes('accountant') || cat.includes('accounting fee')) {
              matched.auditFees += item.amount;
            } else {
              matched.misc += item.amount;
            }
          });
          const rows = [
            { label: 'To Consumable Materials', amount: matched.consumable },
            { label: 'To Honorarium', amount: matched.honorarium },
            { label: 'To Salary and Wages', amount: matched.salary },
            { label: 'To Repairs', amount: matched.repairs },
            { label: 'To Expenses Paid on Specific Show (Any cultural events)', amount: matched.specificShow },
            { label: 'To Entertainment Expenses', amount: matched.entertainment },
            { label: 'To Printing and Stationery', amount: matched.printing },
            { label: 'To News Papers and Periodicals', amount: matched.newspapers },
            { label: 'To Postage', amount: matched.postage },
            { label: 'To Upkeep of Lawns', amount: matched.lawns },
            { label: 'To Rent', amount: matched.rent },
            { label: 'To Municipal Taxes', amount: matched.municipalTaxes },
            { label: 'To Insurance', amount: matched.insurance },
            { label: 'To Loss on sale of Fixed Asset', amount: matched.lossOnSale },
            { label: 'To Depreciation on Fixed Assets', amount: matched.depreciation },
            { label: 'To Audit Fees', amount: matched.auditFees },
            { label: 'To Miscellaneous Expenses', amount: matched.misc },
          ];
          if (surplusAmt > 0) {
            rows.push({ label: 'To Surplus * (Excess of Income over Expenditure)', amount: surplusAmt });
          } else {
            rows.push({ label: 'To Surplus * (Excess of Income over Expenditure)', amount: 0 });
          }
          return rows;
        };

        const mapIncomes = (items: any[], deficitAmt: number) => {
          let matched = {
            subscriptions: 0, grants: 0, entranceFees: 0, donations: 0, interest: 0,
            dividends: 0, specificShowCollection: 0, profitOnSale: 0, lockerRent: 0,
            cloakRoomRent: 0, hallRent: 0, newspapersSale: 0, misc: 0
          };
          items.forEach(item => {
            const cat = (item.category || '').toLowerCase();
            if (cat.includes('subscription') || cat.includes('maintenance') || cat.includes('monthly') || cat.includes('quarterly') || cat.includes('half-yearly') || cat.includes('annual') || cat.includes('due') || cat.includes('outstanding')) {
              matched.subscriptions += item.amount;
            } else if (cat.includes('grant') || cat.includes('subsidy')) {
              matched.grants += item.amount;
            } else if (cat.includes('entrance') || cat.includes('admission') || cat.includes('onboarding')) {
              matched.entranceFees += item.amount;
            } else if (cat.includes('donation') || cat.includes('gift')) {
              matched.donations += item.amount;
            } else if (cat.includes('interest') || cat.includes('deposit')) {
              matched.interest += item.amount;
            } else if (cat.includes('dividend')) {
              matched.dividends += item.amount;
            } else if (cat.includes('event income') || cat.includes('show collection') || cat.includes('ticket')) {
              matched.specificShowCollection += item.amount;
            } else if (cat.includes('profit on sale') || cat.includes('asset profit')) {
              matched.profitOnSale += item.amount;
            } else if (cat.includes('locker')) {
              matched.lockerRent += item.amount;
            } else if (cat.includes('cloak')) {
              matched.cloakRoomRent += item.amount;
            } else if (cat.includes('hall') || cat.includes('clubhouse') || cat.includes('venue')) {
              matched.hallRent += item.amount;
            } else if (cat.includes('sale of newspaper') || cat.includes('scrap')) {
              matched.newspapersSale += item.amount;
            } else {
              matched.misc += item.amount;
            }
          });
          const rows = [
            { label: 'By Subscriptions', amount: matched.subscriptions },
            { label: 'By Grants Received (for General Purposes)', amount: matched.grants },
            { label: 'By Entrance Fees (To the extent not capitalized)', amount: matched.entranceFees },
            { label: 'By General Donations', amount: matched.donations },
            { label: 'By Interest on deposits', amount: matched.interest },
            { label: 'By Dividends', amount: matched.dividends },
            { label: 'By Collection for Specific Show (Any Cultural events)', amount: matched.specificShowCollection },
            { label: 'By Profit on Sale of Fixed Assets', amount: matched.profitOnSale },
            { label: 'By Locker\'s Rent', amount: matched.lockerRent },
            { label: 'By Cloak Room Rent Received', amount: matched.cloakRoomRent },
            { label: 'By Hall Rent Received', amount: matched.hallRent },
            { label: 'By Receipts from Sale of Newspapers and Magazines', amount: matched.newspapersSale },
            { label: 'By Miscellaneous Incomes', amount: matched.misc },
          ];
          if (deficitAmt > 0) {
            rows.push({ label: 'By Deficit * (Excess of Expenditure over Income)', amount: deficitAmt });
          } else {
            rows.push({ label: 'By Deficit * (Excess of Expenditure over Income)', amount: 0 });
          }
          return rows;
        };

        const expenditures = mapExpenditures(expenseItems, netProfit);
        const incomes = mapIncomes(incomeItems, netProfit < 0 ? Math.abs(netProfit) : 0);

        // Pad incomes so it has the same length as expenditures
        const paddedIncomes = [...incomes];
        while (paddedIncomes.length < expenditures.length) {
          paddedIncomes.splice(paddedIncomes.length - 1, 0, { label: '', amount: null as any });
        }

        const pnlTotal = Math.max(
          expenditures.reduce((sum, r) => sum + (r.amount || 0), 0),
          paddedIncomes.reduce((sum, r) => sum + (r.amount || 0), 0)
        );

        const bsNetProfit = financials?.balanceSheet?.netProfit !== undefined
          ? financials?.balanceSheet?.netProfit
          : netProfit;

        const bsLiabRows = [
          { label: 'Capital:', amount: null, isHeader: true },
          { label: '  Opening Balance', amount: financials?.balanceSheet?.liabilities?.corpusFunds || 0 },
          { label: '  Add: Net Profit', amount: bsNetProfit > 0 ? bsNetProfit : null },
          { label: '  (Less: Net Loss)', amount: bsNetProfit < 0 ? Math.abs(bsNetProfit) : null },
          { label: '  Less: Drawings', amount: 0 },
          { label: 'Long-term Liabilities:', amount: null, isHeader: true },
          { label: '  Loan', amount: 0 },
          { label: 'Current liabilities:', amount: null, isHeader: true },
          { label: '  Income received-in-advance', amount: 0 },
          { label: '  Sundry Creditors', amount: 0 },
          { label: '  Outstanding Expenses', amount: 0 },
          { label: '  Bills Payable', amount: 0 },
          { label: '  Bank Overdraft', amount: 0 },
        ];

        const bsAssetRows = [
          { label: 'Fixed Assets:', amount: null, isHeader: true },
          { label: '  Good will', amount: 0 },
          { label: '  Land', amount: 0 },
          { label: '  Building', amount: 0 },
          { label: '  Plant & Machinery', amount: 0 },
          { label: '  Furniture & Fixtures', amount: 0 },
          { label: 'Investment:', amount: 0 },
          { label: 'Current Assets:', amount: null, isHeader: true },
          { label: '  Closing stock', amount: 0 },
          { label: '  Accrued income', amount: 0 },
          { label: '  Prepaid expenses', amount: 0 },
          { label: '  Sundry Debtors', amount: financials?.balanceSheet?.assets?.duesReceivable || 0 },
          { label: '  Bills Receivable', amount: 0 },
          { label: '  Cash at Bank', amount: financials?.balanceSheet?.assets?.bankBalance || 0 },
          { label: '  Cash in Hand', amount: financials?.balanceSheet?.assets?.cashInHand || 0 },
        ];

        // Pad Liabilities to match Assets length
        const paddedLiabRows = [...bsLiabRows];
        while (paddedLiabRows.length < bsAssetRows.length) {
          paddedLiabRows.push({ label: '', amount: null });
        }

        const totalLiabs = paddedLiabRows.reduce((sum, r) => {
          if (r.amount === null) return sum;
          if (r.label.includes('Less:') || r.label.includes('(Less:')) {
            return sum - r.amount;
          }
          return sum + r.amount;
        }, 0);
        const totalAssets = bsAssetRows.reduce((sum, r) => sum + (r.amount || 0), 0);
        const bsTotalVal = Math.max(totalLiabs, totalAssets);

        const isPeriodEmpty = incomeItems.length === 0 && expenseItems.length === 0;
        const isBalanced = Math.abs(totalLiabs - totalAssets) < 0.01;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header section */}
            <div className="card" style={{ padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Financial Reports</h3>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Generate and analyze financial statements</span>
                </div>
                <button className="btn btn-secondary" onClick={exportFinancialsAsCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                  <Download size={16} /> Export as Excel
                </button>
              </div>
              
              {/* Filter controls */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Month</label>
                  <select value={reportFilters.month} onChange={e => setReportFilters({...reportFilters, month: e.target.value, startDate: '', endDate: ''})} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', minWidth: '130px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                    <option value="">All Months</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Year</label>
                  <input type="number" value={reportFilters.year} onChange={e => setReportFilters({...reportFilters, year: e.target.value, startDate: '', endDate: ''})} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', width: '90px', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div style={{ padding: '0 0.5rem 0.5rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>OR</div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Start Date</label>
                  <input type="date" value={reportFilters.startDate} onChange={e => setReportFilters({...reportFilters, startDate: e.target.value, month: '', year: ''})} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>End Date</label>
                  <input type="date" value={reportFilters.endDate} onChange={e => setReportFilters({...reportFilters, endDate: e.target.value, month: '', year: ''})} style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                </div>
                <button className="btn btn-primary" onClick={fetchFinancials} style={{ padding: '0.5rem 1.25rem', borderRadius: '0.375rem', fontWeight: 600 }}>Apply Filter</button>
              </div>

              {/* Quick Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period Income</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>₹{totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period Expenses</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>₹{totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Period Surplus / Deficit</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                    {netProfit >= 0 ? '₹' : '-₹'}{Math.abs(netProfit).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                </div>
                <div style={{ padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Balance Sheet Status</span>
                  <div>
                    {isBalanced ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#10b981', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                        ✔️ Balanced
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#f59e0b', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                        ⚠️ Diff: ₹{Math.abs(totalLiabs - totalAssets).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tab selection */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', gap: '1.5rem' }}>
              <button 
                onClick={() => setActiveReportTab('pnl')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: activeReportTab === 'pnl' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeReportTab === 'pnl' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
              >
                Income & Expenditure Statement
              </button>
              <button 
                onClick={() => setActiveReportTab('balanceSheet')}
                style={{ 
                  padding: '0.75rem 0.5rem', 
                  background: 'none', 
                  border: 'none', 
                  borderBottom: activeReportTab === 'balanceSheet' ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeReportTab === 'balanceSheet' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  transition: 'all 0.2s'
                }}
              >
                Balance Sheet
              </button>
            </div>

            {/* Report Content */}
            {activeReportTab === 'pnl' ? (
              isPeriodEmpty ? (
                /* Empty state */
                <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '1rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(59, 130, 246, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                    <FileText size={30} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>No Transactions Found</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
                    There are no recorded incomes or expenses for the selected period: <strong>{dateRangeStr}</strong>.
                  </p>
                </div>
              ) : (
                /* Income & Expenditure Statement table */
                <div className="card report-card" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Building size={24} style={{ color: 'var(--primary)' }} />
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{user?.tenantName || 'Society Name'}</h2>
                    </div>
                    {user?.tenantAddress && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', maxWidth: '400px', margin: '0 auto' }}>{user.tenantAddress}</div>}
                    <div style={{ display: 'inline-block', padding: '0.35rem 1rem', backgroundColor: 'var(--primary)', color: '#fff', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                      Income & Expenditure Statement
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>For the Period: {dateRangeStr}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '0.875rem', marginBottom: '0.25rem', padding: '0 0.5rem', color: 'var(--text-primary)' }}>
                    <span>Dr.</span>
                    <span>Cr.</span>
                  </div>

                  <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'transparent' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                          <th style={{ width: '35%', textAlign: 'left', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Expenditure</th>
                          <th style={{ width: '15%', textAlign: 'right', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid var(--border-color)' }}>₹</th>
                          <th style={{ width: '35%', textAlign: 'left', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '1.5rem' }}>Income</th>
                          <th style={{ width: '15%', textAlign: 'right', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>₹</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenditures.map((expRow, idx) => {
                          const incRow = paddedIncomes[idx];
                          return (
                            <tr key={`row-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              {/* Expenditure */}
                              <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: expRow.label.includes('*') ? 'italic' : 'normal' }}>
                                {expRow.label}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)', borderRight: '1px solid var(--border-color)', fontWeight: expRow.amount ? 500 : 'normal' }}>
                                {expRow.amount !== null && expRow.amount !== undefined && (expRow.amount > 0 || !expRow.label.includes('*')) ? `₹${expRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                              </td>
                              
                              {/* Income */}
                              <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', paddingLeft: '1.5rem', fontStyle: incRow.label.includes('*') ? 'italic' : 'normal' }}>
                                {incRow.label}
                              </td>
                              <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: incRow.amount ? 500 : 'normal' }}>
                                {incRow.amount !== null && incRow.amount !== undefined && (incRow.amount > 0 || !incRow.label.includes('*')) ? `₹${incRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 700, borderBottom: '4px double var(--text-primary)' }}>
                          <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Total</td>
                          <td style={{ padding: '1.25rem 1rem', textAlign: 'right', borderRight: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>₹{pnlTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td style={{ padding: '1.25rem 1rem', paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Total</td>
                          <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-primary)' }}>₹{pnlTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )
            ) : (
              /* Balance Sheet table */
              <div className="card report-card" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Landmark size={24} style={{ color: 'var(--primary)' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{user?.tenantName || 'Society Name'}</h2>
                  </div>
                  {user?.tenantAddress && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', maxWidth: '400px', margin: '0 auto' }}>{user.tenantAddress}</div>}
                  <div style={{ display: 'inline-block', padding: '0.35rem 1rem', backgroundColor: 'var(--accent)', color: '#fff', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                    Balance Sheet
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '0.25rem' }}>As At: {asAtDate}</div>
                </div>

                <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '0.75rem', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'transparent' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                        <th style={{ width: '35%', textAlign: 'left', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Liabilities</th>
                        <th style={{ width: '15%', textAlign: 'right', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', borderRight: '1px solid var(--border-color)' }}>Rs.</th>
                        <th style={{ width: '35%', textAlign: 'left', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', paddingLeft: '1.5rem' }}>Assets</th>
                        <th style={{ width: '15%', textAlign: 'right', padding: '1rem 1rem', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Rs.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paddedLiabRows.map((liabRow, idx) => {
                        const assetRow = bsAssetRows[idx];
                        return (
                          <tr key={`bs-row-${idx}`} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            {/* Liability */}
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: liabRow.isHeader ? 700 : 'normal' }}>
                              {liabRow.label}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)', borderRight: '1px solid var(--border-color)', fontWeight: liabRow.amount ? 500 : 'normal' }}>
                              {liabRow.amount !== null && liabRow.amount !== undefined ? `₹${liabRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                            </td>
                            
                            {/* Asset */}
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.85rem', color: 'var(--text-primary)', paddingLeft: '1.5rem', fontWeight: assetRow.isHeader ? 700 : 'normal' }}>
                              {assetRow.label}
                            </td>
                            <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: assetRow.amount ? 500 : 'normal' }}>
                              {assetRow.amount !== null && assetRow.amount !== undefined ? `₹${assetRow.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: '2px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontWeight: 700, borderBottom: '4px double var(--text-primary)' }}>
                        <td style={{ padding: '1.25rem 1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Total</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', borderRight: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>₹{bsTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td style={{ padding: '1.25rem 1rem', paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Total</td>
                        <td style={{ padding: '1.25rem 1rem', textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-primary)' }}>₹{bsTotalVal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      }
      case 'logs':
        return (
          <div className="card">
            <h3 style={{ marginBottom: '1.5rem' }}>Audit Logs</h3>
            <div className="table-container">
              <table style={{ tableLayout: 'fixed', width: '100%' }}>
                <colgroup>
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '50%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log: any) => {
                    // Resolve member UUID in details to readable name
                    let details = log.details || '';
                    members.forEach((m: any) => {
                      if (details.includes(m.id)) {
                        details = details.replace(m.id, `${m.name} (Flat ${m.flatNo})`);
                      }
                    });
                    const ts = log.timestamp || log.createdAt;
                    const date = ts ? new Date(ts) : null;
                    const displayDate = date && !isNaN(date.getTime())
                      ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : '—';
                    return (
                      <tr key={log.id}>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{displayDate}</td>
                        <td><strong>{log.performedBy}</strong></td>
                        <td><span className="badge badge-warning" style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{log.actionType}</span></td>
                        <td style={{ fontSize: '0.875rem', wordBreak: 'break-word' }}>{details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'vendors':
        return <VendorManagement token={token} vendors={vendors} onRefresh={fetchData} serviceTypes={serviceTypes} />;
      case 'profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AdminProfileEdit token={token} user={user} updateUser={updateUser} />
          </div>
        );
      case 'settings':
        return (
          <div style={{ display: 'flex', gap: '2rem', minHeight: '70vh', alignItems: 'stretch' }} className="settings-hub-container">
            {/* Sidebar Navigation */}
            <div style={{
              width: '260px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '1rem',
              padding: '1.25rem',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              height: 'fit-content',
              position: 'sticky',
              top: '2rem'
            }}>
              <div style={{ marginBottom: '1rem', padding: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Settings Hub</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', margin: 0 }}>Configure society preferences</p>
              </div>

              {[
                { id: 'pricing', label: 'Pricing & Fees', icon: <DollarSign size={16} /> },
                { id: 'reminders', label: 'Auto-Reminders', icon: <Bell size={16} /> },
                { id: 'discount', label: 'Early Bird Discount', icon: <Percent size={16} /> },
                { id: 'late-fee', label: 'Late Fee', icon: <Clock size={16} /> },
                { id: 'financial-year', label: 'Financial Year Setup', icon: <Calendar size={16} /> },
                { id: 'masters', label: 'System Masters', icon: <Wrench size={16} /> }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveSettingsTab(t.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.875rem 1rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    background: activeSettingsTab === t.id ? 'var(--primary)' : 'transparent',
                    color: activeSettingsTab === t.id ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: activeSettingsTab === t.id ? 600 : 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left',
                    width: '100%',
                    boxShadow: activeSettingsTab === t.id ? '0 4px 12px rgba(37, 99, 235, 0.2)' : 'none'
                  }}
                  className="settings-tab-btn"
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {activeSettingsTab === 'pricing' && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Society Settings (Pricing Master)</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Define the base rates and pre-calculated discounts for payment plans.</p>
                    </div>
                  </div>

                  <div className="responsive-form-grid" style={{ gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Base Monthly Amount (₹)</label>
                      <input type="text" value={maintenanceAmountInput} onChange={e => setMaintenanceAmountInput(e.target.value)} placeholder="0" style={{ padding: '0.75rem', borderRadius: '0.5rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Quarterly Amount (₹)</label>
                      <input type="text" value={quarterlyAmountInput} onChange={e => setQuarterlyAmountInput(e.target.value)} placeholder="Optional discounted price" style={{ padding: '0.75rem', borderRadius: '0.5rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Half-Yearly Amount (₹)</label>
                      <input type="text" value={halfYearlyAmountInput} onChange={e => setHalfYearlyAmountInput(e.target.value)} placeholder="Optional discounted price" style={{ padding: '0.75rem', borderRadius: '0.5rem' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Annual Amount (₹)</label>
                      <input type="text" value={annualAmountInput} onChange={e => setAnnualAmountInput(e.target.value)} placeholder="Optional discounted price" style={{ padding: '0.75rem', borderRadius: '0.5rem' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={async () => {
                      try {
                        const cleanAmt = maintenanceAmountInput.trim();
                        const cleanQ = quarterlyAmountInput.trim();
                        const cleanH = halfYearlyAmountInput.trim();
                        const cleanA = annualAmountInput.trim();

                        await axios.patch('/tenants/settings', { 
                          maintenanceAmount: cleanAmt === '' ? 0 : (parseFloat(cleanAmt) || 0),
                          quarterlyAmount: cleanQ === '' ? null : (parseFloat(cleanQ) || null),
                          halfYearlyAmount: cleanH === '' ? null : (parseFloat(cleanH) || null),
                          annualAmount: cleanA === '' ? null : (parseFloat(cleanA) || null)
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        
                        await fetchData();
                        showToast('Pricing settings updated successfully', 'success');
                      } catch (err: any) {
                        showToast(err.response?.data?.message || 'Error updating settings', 'error');
                      }
                    }}>
                      <Save size={16} /> Save Pricing Settings
                    </button>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'reminders' && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                      <Bell size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Auto-Reminder Settings</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Automate reminder emails and alerts for pending dues.</p>
                    </div>
                  </div>

                  {/* Monthly reminder settings */}
                  <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ marginRight: '1.5rem' }}>
                        <label style={{ fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          Monthly Maintenance Reminder
                        </label>
                        <span style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                          Trigger payment reminder notifications for active members automatically at specified intervals during the month.
                        </span>
                      </div>
                      <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={enableMonthlyReminder} 
                          onChange={e => setEnableMonthlyReminder(e.target.checked)} 
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="slider round" style={{
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: enableMonthlyReminder ? 'var(--primary)' : '#ccc',
                          transition: '0.4s', borderRadius: '24px'
                        }}>
                          <span style={{
                            position: 'absolute', content: '""', height: '18px', width: '18px', left: enableMonthlyReminder ? '24px' : '4px', bottom: '3px',
                            backgroundColor: 'white', transition: '0.4s', borderRadius: '50%'
                          }} />
                        </span>
                      </label>
                    </div>
                    
                    {enableMonthlyReminder && (
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', animation: 'slideDown 0.25s ease-out' }}>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Frequency (Times)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="10"
                            value={monthlyReminderCountInput} 
                            onChange={e => setMonthlyReminderCountInput(e.target.value)} 
                            style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>Max times to notify in the billing month.</span>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Interval (Days)</label>
                          <input 
                            type="number" 
                            min="1"
                            value={monthlyReminderIntervalInput} 
                            onChange={e => setMonthlyReminderIntervalInput(e.target.value)} 
                            style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                          />
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'block' }}>Days between reminders.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overdue reminder settings */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                      <div style={{ marginRight: '1.5rem' }}>
                        <label style={{ fontWeight: 600, fontSize: '1rem' }}>Overdue Dues Reminder</label>
                        <span style={{ display: 'block', fontSize: '0.825rem', color: 'var(--text-secondary)', marginTop: '0.25rem', lineHeight: '1.4' }}>
                          If a member has unpaid outstanding dues, automatically send notifications periodically until dues are cleared.
                        </span>
                      </div>
                      <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '46px', height: '24px', flexShrink: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={enableOverdueReminder} 
                          onChange={e => setEnableOverdueReminder(e.target.checked)} 
                          style={{ opacity: 0, width: 0, height: 0 }}
                        />
                        <span className="slider round" style={{
                          position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                          backgroundColor: enableOverdueReminder ? 'var(--primary)' : '#ccc',
                          transition: '0.4s', borderRadius: '24px'
                        }}>
                          <span style={{
                            position: 'absolute', content: '""', height: '18px', width: '18px', left: enableOverdueReminder ? '24px' : '4px', bottom: '3px',
                            backgroundColor: 'white', transition: '0.4s', borderRadius: '50%'
                          }} />
                        </span>
                      </label>
                    </div>
                    
                    {enableOverdueReminder && (
                      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', animation: 'slideDown 0.25s ease-out' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Interval (Days)</label>
                        <input 
                          type="number" 
                          min="1"
                          style={{ maxWidth: '200px', padding: '0.75rem', borderRadius: '0.5rem' }}
                          value={overdueReminderIntervalInput} 
                          onChange={e => setOverdueReminderIntervalInput(e.target.value)} 
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                          Days between reminders. For consecutive unpaid months, monthly email summary alerts are sent.
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={async () => {
                      try {
                        const countVal = parseInt(monthlyReminderCountInput, 10) || 1;
                        const intervalVal = parseInt(monthlyReminderIntervalInput, 10) || 7;
                        const overdueVal = parseInt(overdueReminderIntervalInput, 10) || 7;

                        await axios.patch('/tenants/settings', { 
                          enableMonthlyReminder,
                          monthlyReminderCount: countVal,
                          monthlyReminderInterval: intervalVal,
                          enableOverdueReminder,
                          overdueReminderInterval: overdueVal
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        
                        await fetchData();
                        showToast('Reminder settings updated successfully', 'success');
                      } catch (err: any) {
                        showToast(err.response?.data?.message || 'Error updating reminder settings', 'error');
                      }
                    }}>
                      <Save size={16} /> Save Reminder Settings
                    </button>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'discount' && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                      <Percent size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Early Payment Discount (Optional)</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Provide a discount to members paying before a selected cut-off date.</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Discount Cut-off Date</label>
                      <input 
                        type="date" 
                        value={discountDateInput} 
                        onChange={e => setDiscountDateInput(e.target.value)} 
                        style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Payments under the 'Maintenance' category received on or before this date automatically get the discount applied.
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Discount Amount (₹)</label>
                      <input 
                        type="text" 
                        value={discountAmountInput} 
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) {
                            setDiscountAmountInput(val);
                          }
                        }} 
                        placeholder="e.g. 100" 
                        style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Flat amount deducted from the final calculated payment total.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={async () => {
                      try {
                        const discountAmt = discountAmountInput.trim() === '' ? 0 : parseFloat(discountAmountInput);
                        await axios.patch('/tenants/settings', { 
                          discountDate: discountDateInput || null,
                          discountAmount: discountAmt
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        
                        await fetchData();
                        showToast('Discount settings updated successfully', 'success');
                      } catch (err: any) {
                        showToast(err.response?.data?.message || 'Error updating discount settings', 'error');
                      }
                    }}>
                      <Save size={16} /> Save Discount Settings
                    </button>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'late-fee' && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    <div style={{ padding: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Late Fee Settings (Optional)</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configure late fees for maintenance payments received after a specific cut-off date.</p>
                    </div>
                  </div>

                  {summary.lateFeeDate && summary.lateFeeAmount ? (
                    <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>✓</div>
                      <div>
                        <strong>Active Settings:</strong> Cut-off Day is the <strong>{getDayFromDateString(summary.lateFeeDate)}th</strong> of every month with a late fee of <strong>₹{summary.lateFeeAmount}</strong>.
                      </div>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '1rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f59e0b', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>!</div>
                      <div>
                        No active late fee settings configured. Late fees will not be calculated.
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Late Fee Cut-off Date</label>
                      <input 
                        type="date" 
                        value={lateFeeDateInput} 
                        onChange={e => setLateFeeDateInput(e.target.value)} 
                        style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Payments under the 'Maintenance' category received after this date automatically incur a late fee.
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Late Fee Amount per Month (₹)</label>
                      <input 
                        type="text" 
                        value={lateFeeAmountInput} 
                        onChange={e => {
                          const val = e.target.value;
                          if (/^\d*\.?\d*$/.test(val)) {
                            setLateFeeAmountInput(val);
                          }
                        }} 
                        placeholder="e.g. 100" 
                        style={{ padding: '0.75rem', borderRadius: '0.5rem' }}
                      />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                        Flat fee charged monthly. For custom coverage dates (e.g. 2026 to 2027), this is multiplied by the number of covered months.
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)', marginTop: '2rem' }}>
                    <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={async () => {
                      try {
                        const lateFeeAmt = lateFeeAmountInput.trim() === '' ? 0 : parseFloat(lateFeeAmountInput);
                        await axios.patch('/tenants/settings', { 
                          lateFeeDate: lateFeeDateInput || null,
                          lateFeeAmount: lateFeeAmt
                        }, { headers: { Authorization: `Bearer ${token}` } });
                        
                        await fetchData();
                        showToast('Late fee settings updated successfully', 'success');
                      } catch (err: any) {
                        showToast(err.response?.data?.message || 'Error updating late fee settings', 'error');
                      }
                    }}>
                      <Save size={16} /> Save Late Fee Settings
                    </button>
                  </div>
                </div>
              )}

              {activeSettingsTab === 'financial-year' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <FinancialYearCostSetup token={token} />
                </div>
              )}

              {activeSettingsTab === 'masters' && (
                <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <MastersManagement token={token} onRefresh={fetchData} />
                </div>
              )}
            </div>
          </div>
        );
      case 'staff':
        return <StaffManagement token={token} currentUserId={user?.id} designations={designations} staff={staff} onRefresh={fetchData} />;
      case 'upcoming': {
        // ── Sort helper ──────────────────────────────────────────────────────
        const handleDuesSort = (field: 'flatNo' | 'name' | 'outstandingDues') => {
          if (duesSortField === field) {
            setDuesSortDir(d => d === 'asc' ? 'desc' : 'asc');
          } else {
            setDuesSortField(field);
            setDuesSortDir('asc');
          }
        };
        const SortIcon = ({ field }: { field: 'flatNo' | 'name' | 'outstandingDues' }) => {
          const active = duesSortField === field;
          return (
            <span style={{ marginLeft: '0.35rem', fontSize: '0.7rem', opacity: active ? 1 : 0.35, display: 'inline-flex', flexDirection: 'column', lineHeight: 1, verticalAlign: 'middle' }}>
              <span style={{ color: active && duesSortDir === 'asc' ? 'var(--primary)' : 'inherit' }}>▲</span>
              <span style={{ color: active && duesSortDir === 'desc' ? 'var(--primary)' : 'inherit' }}>▼</span>
            </span>
          );
        };

        // ── Compute FY years with outstanding dues for a member ──────────────
        const getStartYearFromFy = (fy: string) => {
          const m = fy.trim().match(/^(\d{4})/);
          return m ? parseInt(m[1], 10) : 0;
        };
        const getOutstandingFYs = (m: any): string[] => {
          if (duesCalcMode !== 'DB' || !m.outstandingDues || m.outstandingDues <= 0) return [];
          const regStart = getStartYearFromFy(m.registrationYear || '');
          if (!regStart) return [];
          const useCommon = m.useCommonMaintenance !== undefined ? m.useCommonMaintenance : true;
          const unpaidFYs: string[] = [];
          const uniqueYears = Array.from(new Set(maintenanceCosts.map((c: any) => c.financialYear as string)))
            .filter((fy: string) => getStartYearFromFy(fy) >= regStart);
          for (const fy of uniqueYears) {
            const costResType = useCommon ? 'COMMON' : (m.residenceType || 'COMMON');
            const costBhk     = useCommon ? 'COMMON' : (m.bhk || 'COMMON');
            const cost = maintenanceCosts.find((c: any) =>
              c.financialYear === fy && c.residenceType === costResType && c.bhk === costBhk
            );
            if (cost && cost.amount > 0) unpaidFYs.push(fy);
          }
          return unpaidFYs;
        };

        // ── Sort members ─────────────────────────────────────────────────────
        const sortedUpcoming = [...upcomingMembers].sort((a: any, b: any) => {
          let aVal: any, bVal: any;
          if (duesSortField === 'flatNo') {
            aVal = isNaN(Number(a.flatNo)) ? a.flatNo : Number(a.flatNo);
            bVal = isNaN(Number(b.flatNo)) ? b.flatNo : Number(b.flatNo);
          } else if (duesSortField === 'name') {
            aVal = (a.name || '').toLowerCase();
            bVal = (b.name || '').toLowerCase();
          } else {
            const dA = getCalculatedDuesDetails(a, duesCalcMode);
            const dB = getCalculatedDuesDetails(b, duesCalcMode);
            aVal = dA.amount;
            bVal = dB.amount;
          }
          if (aVal < bVal) return duesSortDir === 'asc' ? -1 : 1;
          if (aVal > bVal) return duesSortDir === 'asc' ? 1 : -1;
          return 0;
        });

        const totalCalculatedDues = sortedUpcoming.reduce((sum: number, m: any) => {
          const details = getCalculatedDuesDetails(m, duesCalcMode);
          return sum + details.amount;
        }, 0);

        const thSortStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

        return (
          <div className="card">
            <div className="section-header-row">
              <div>
                <h3 style={{ fontSize: '1.125rem', margin: 0 }}>Upcoming &amp; Overdue Payments</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                  Monitor and manage member maintenance dues
                </p>
              </div>
              <div className="action-button-group" style={{ alignItems: 'center' }}>
                {maintenanceCosts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      Calculate Dues By:
                    </label>
                    <select
                      value={duesCalcMode}
                      onChange={(e) => setDuesCalcMode(e.target.value)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="DB">Outstanding Dues (DB)</option>
                      <option value="MONTHLY">Monthly Basis</option>
                      <option value="QUARTERLY">Quarterly Basis</option>
                      <option value="HALF_YEARLY">Half-Yearly Basis</option>
                      <option value="ANNUAL">Annual Basis</option>
                    </select>
                  </div>
                )}
                <button className="btn btn-secondary" onClick={downloadDuesList} title="Download List of Members with Dues">
                  <Download size={18} /> Download Dues List
                </button>
                <button className="btn btn-primary" onClick={() => setShowModal('payment')}>
                  <Plus size={18} /> Record Payment
                </button>
              </div>
            </div>

            {duesCalcMode !== 'DB' && (
              <div style={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.08)', 
                border: '1px solid rgba(59, 130, 246, 0.2)', 
                padding: '0.75rem 1rem', 
                borderRadius: '0.5rem', 
                marginBottom: '1rem', 
                fontSize: '0.85rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ color: 'var(--text-primary)' }}>
                  Showing dynamically calculated dues based on <strong>{duesCalcMode.replace('_', ' ')}</strong> cycle using the configured annual fees.
                </span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                  Total: ₹{totalCalculatedDues.toLocaleString()}
                </span>
              </div>
            )}

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={thSortStyle} onClick={() => handleDuesSort('flatNo')}>
                      FLAT NO <SortIcon field="flatNo" />
                    </th>
                    <th style={thSortStyle} onClick={() => handleDuesSort('name')}>
                      MEMBER <SortIcon field="name" />
                    </th>
                    <th>PAID UNTIL</th>
                    <th style={thSortStyle} onClick={() => handleDuesSort('outstandingDues')}>
                      OUTSTANDING DUES <SortIcon field="outstandingDues" />
                    </th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUpcoming.map((m: any) => {
                    const details = getCalculatedDuesDetails(m, duesCalcMode);
                    const dueAmount = details.amount;
                    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    const isOverdue = m.paidUntil ? new Date(m.paidUntil) < currentMonthStart : true;
                    const isPaid = dueAmount === 0;
                    const regYear = m.registrationYear || '';
                    const outstandingFYs = getOutstandingFYs(m);
                    return (
                      <tr key={m.id}>
                        <td><strong>{m.flatNo}</strong></td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{m.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {m.mobile} {regYear && `• FY ${regYear}`}
                          </div>
                        </td>
                        <td>
                          {m.paidUntil ? new Date(m.paidUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'No Record'}
                        </td>
                        <td style={{ fontWeight: 600, color: (dueAmount || 0) > 0 ? 'var(--error)' : 'var(--success)' }}>
                          ₹{(dueAmount || 0).toLocaleString()}
                          {/* FY year tags — shown only in DB mode when dues > 0 */}
                          {duesCalcMode === 'DB' && outstandingFYs.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                              {outstandingFYs.map(fy => (
                                <span key={fy} style={{
                                  display: 'inline-block',
                                  fontSize: '0.65rem',
                                  fontWeight: 600,
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '0.25rem',
                                  backgroundColor: 'rgba(239,68,68,0.1)',
                                  color: 'var(--error)',
                                  border: '1px solid rgba(239,68,68,0.25)',
                                  letterSpacing: '0.02em'
                                }}>
                                  FY {fy}
                                </span>
                              ))}
                            </div>
                          )}
                          {details.hasFee && duesCalcMode !== 'DB' && dueAmount > 0 && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal', marginTop: '0.2rem' }}>
                              {details.unpaidPeriods} {details.periodName} @ {details.rateLabel}
                            </div>
                          )}
                          {!details.hasFee && duesCalcMode !== 'DB' && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--error)', fontWeight: 'normal', marginTop: '0.2rem' }}>
                              Annual fee not configured for FY {regYear}
                            </div>
                          )}
                        </td>
                        <td>
                          {isPaid ? (
                            <span className="badge badge-success">Paid</span>
                          ) : isOverdue ? (
                            <span className="badge badge-error">Overdue</span>
                          ) : (
                            <span className="badge badge-warning">Due This Month</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedUpcoming.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No upcoming or overdue payments! All members are paid up.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'events':
        return <EventManagement token={token} />;
      case 'notifications':
        return <NotificationManagement token={token} members={members} />;
      default:
        return null;
    }
  };

  // Role helpers — admin has no designation; treasurer has designation 'Treasurer' or email treasurer@sunrise.com
  const isTreasurer = user?.designation === 'Treasurer' || user?.email?.toLowerCase() === 'treasurer@sunrise.com';
  const isAdmin = !user?.designation && !isTreasurer;

  // Build nav tabs based on role
  const allAdminTabs = [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
      { id: 'members', icon: Users, label: 'Members' },
      { id: 'payments', icon: Receipt, label: 'Payments' },
      { id: 'ledger-reconciliation', icon: FileText, label: 'Ledger Dates' },
      { id: 'upcoming', icon: Calendar, label: 'Upcoming Dues' },
      { id: 'expenses', icon: Landmark, label: 'Expenses' },
      ...(summary.enableForums ? [{ id: 'helpdesk', icon: LifeBuoy, label: 'Helpdesk' }] : []),
      { id: 'vendors', icon: Users2, label: 'Vendors' },
      { id: 'events', icon: Calendar, label: 'Society Events' },
      { id: 'notifications', icon: Bell, label: 'Raise Notifications' },
      { id: 'settings', icon: Settings, label: 'Settings' },
      { id: 'staff', icon: UserCheck, label: 'Office Bearers' },
      { id: 'logs', icon: History, label: 'Audit Logs' },
      { id: 'reports', icon: BarChart2, label: 'Reports' },
    ];

  // For other office bearers, filter out payments and expenses
  const otherBearerTabs = allAdminTabs.filter(tab => tab.id !== 'payments' && tab.id !== 'expenses');

  const navTabs = isAdmin || isTreasurer ? allAdminTabs : otherBearerTabs;
  const hasSidebar = true; // All tenant admin logins display the sidebar

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column' }}>

        {/* ── Sticky Top Header ──────────────────────────────── */}
        <header className="sticky-header">
          {/* Left: logo + title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {hasSidebar && (
              <button
                onClick={() => setIsSidebarOpen(v => !v)}
                className="mobile-only-btn"
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <Menu size={22} />
              </button>
            )}
            <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.45rem', borderRadius: '0.5rem' }}>
              <Building size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', lineHeight: 1.2 }}>
                {isAdmin ? 'Admin Dashboard' : isTreasurer ? 'Treasurer Dashboard' : 'Society Dashboard'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                {user?.tenantName}{user?.designation ? ` · ${user.designation}` : ''}
              </div>
            </div>
          </div>

          {/* Right: action buttons + user info + logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.25rem' }} className="desktop-only">
              Welcome, <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong>
            </span>
            {/* Transfer Cash — Treasurer only */}
            {isTreasurer && (
              <button className="btn btn-secondary" onClick={() => setShowModal('transfer')} style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                <Send size={15} /> <span className="desktop-only">Transfer Cash</span>
              </button>
            )}
            {/* Record Payment — Treasurer only */}
            {isTreasurer && (
              <button className="btn btn-primary" onClick={() => setShowModal('payment')} style={{ whiteSpace: 'nowrap', padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                <Plus size={15} /> <span className="desktop-only">Record Payment</span>
              </button>
            )}
            <NotificationPanel token={token} />
            <button onClick={logout} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.4rem 0.7rem', cursor: 'pointer', color: 'var(--error)', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
              <LogOut size={15} /> <span className="desktop-only">Logout</span>
            </button>
          </div>
        </header>

        {/* ── Body: Sidebar + Main ────────────────────────────── */}
        <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

          {/* Sidebar — only for admin and treasurer */}
          {hasSidebar && (
            <>
              {/* Mobile backdrop */}
              {isSidebarOpen && (
                <div
                  onClick={() => setIsSidebarOpen(false)}
                  style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 150 }}
                  className="mobile-only"
                />
              )}
              <aside className={`tenant-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
                  {navTabs.map((item) => (
                    <a
                      key={item.id}
                      href="#"
                      className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
                      onClick={(e) => { e.preventDefault(); setActiveTab(item.id); setIsSidebarOpen(false); }}
                    >
                      <item.icon size={18} /> {item.label}
                    </a>
                  ))}
                </nav>

                {/* Sidebar footer — user info */}
                <div 
                  style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem', cursor: 'pointer' }}
                  onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}
                  title="Edit Profile & Password"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem', borderRadius: '0.5rem', backgroundColor: activeTab === 'profile' ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-secondary)', transition: 'background-color 0.2s' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{user?.designation || 'Admin'}</div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>Edit</div>
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* Main content area */}
          <main className="tenant-main">
            {/* Pending cash handover banners */}
            {pendingTransfers.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                {pendingTransfers.map((t: any) => (
                  <div key={t.id} style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid var(--warning)',
                    borderRadius: '0.75rem',
                    padding: '1rem 1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ color: 'var(--warning)' }}><ArrowDownLeft size={24} /></div>
                      <div>
                        <div style={{ fontWeight: 600 }}>Cash Handover Request</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          {t.fromAdmin?.name} wants to handover <strong>₹{t.amount.toLocaleString()}</strong> to you.
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem' }} onClick={() => handleApproveTransfer(t.id)}>
                      Accept & Update Balance
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {renderContent()}
            </div>
          </main>
        </div>
      {showModal && (
        <div className="modal-overlay">
          <div className="card" style={{ 
            width: '100%', 
            maxWidth: (showModal === 'member' || showModal === 'edit-member' || showModal === 'member-history') ? '850px' : '600px', 
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            {showModal === 'member' && (
              <>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Add New Member</h2>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Register a new resident and set up their portal access</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.4rem', borderRadius: '50%', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitMember}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    
                    {/* Section 1: Member Personal Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>01. General Details</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div className="responsive-form-grid">
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Full Name *</label>
                          <input type="text" required value={newMember.name} onChange={(e) => setNewMember({ ...newMember, name: e.target.value })} placeholder="e.g. Ramesh Kumar" style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Flat / Unit No *</label>
                          <input type="text" required value={newMember.flatNo} onChange={(e) => setNewMember({ ...newMember, flatNo: e.target.value })} placeholder="e.g. A-402" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Residence Type *</label>
                          <select 
                            value={newMember.residenceType} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewMember({ 
                                ...newMember, 
                                residenceType: val,
                                bhk: val === 'COMMON' ? 'COMMON' : '1'
                              });
                            }}
                          >
                            <option value="COMMON">Common Value</option>
                            <option value="FLAT">Flat</option>
                            <option value="VILLA">Villa</option>
                          </select>
                        </div>
                        {newMember.residenceType !== 'COMMON' && (
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>BHK *</label>
                            <select 
                              value={newMember.bhk} 
                              onChange={(e) => setNewMember({ ...newMember, bhk: e.target.value })}
                            >
                              <option value="1">1 BHK</option>
                              <option value="2">2 BHK</option>
                              <option value="3">3 BHK</option>
                              <option value="4">4 BHK</option>
                              <option value="other">Other / Custom</option>
                            </select>
                          </div>
                        )}
                        {newMember.residenceType !== 'COMMON' && newMember.bhk === 'other' && (
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Custom BHK *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. 5, Duplex" 
                              value={newMember.customBhk} 
                              onChange={(e) => setNewMember({ ...newMember, customBhk: e.target.value })} 
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                          <input 
                            type="checkbox" 
                            id="newUseCommonMaintenance" 
                            checked={newMember.useCommonMaintenance} 
                            onChange={(e) => setNewMember({ ...newMember, useCommonMaintenance: e.target.checked })} 
                            style={{ width: 'auto', margin: 0 }}
                          />
                          <label htmlFor="newUseCommonMaintenance" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                            Enable Common Maintenance
                          </label>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Default Payment Tenure *</label>
                          <select value={newMember.defaultTenure} onChange={(e) => setNewMember({ ...newMember, defaultTenure: e.target.value })}>
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="HALF_YEARLY">Half-Yearly</option>
                            <option value="ANNUAL">Annual</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Membership Active From</label>
                          <input type="date" value={newMember.paidUntil} onChange={(e) => setNewMember({ ...newMember, paidUntil: e.target.value })} />
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Next payment cycle will start from this date.</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Old Pending Dues (₹)</label>
                          <input type="number" min="0" value={newMember.outstandingDues} onChange={(e) => setNewMember({ ...newMember, outstandingDues: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Registration Year *</label>
                          <select value={newMember.registrationYear} onChange={(e) => setNewMember({ ...newMember, registrationYear: e.target.value })}>
                            {getGroupedFYOptions().map(group => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map(fy => (
                                  <option key={fy} value={fy}>{fy}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Contact Info & Credentials */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>02. Contact & Access</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }} className="member-contact-grid-layout">
                        
                        {/* Primary Contact Card */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <UserCheck size={16} style={{ color: 'var(--primary)' }} /> Primary Contact (Compulsory)
                          </h4>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Primary Number *</label>
                            <input type="text" required value={newMember.mobile} onChange={(e) => setNewMember({ ...newMember, mobile: e.target.value })} placeholder="10-digit mobile number" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Primary Email (Optional)</label>
                            <input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} placeholder="email@domain.com" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Set Primary Login Password (Optional)</label>
                            <input
                              type="password"
                              placeholder="Min 6 characters"
                              value={newMember.password}
                              onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                              style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Setting a password enables member portal login for the primary contact via mobile or email.</p>
                          </div>
                        </div>

                        {/* Secondary Contact Card */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={16} style={{ color: 'var(--success)' }} /> Secondary Contact (Optional)
                          </h4>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Secondary Number (Optional)</label>
                            <input type="text" value={newMember.secondaryMobile || ''} onChange={(e) => setNewMember({ ...newMember, secondaryMobile: e.target.value })} placeholder="10-digit mobile number" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Secondary Email (Optional)</label>
                            <input type="email" value={newMember.secondaryEmail || ''} onChange={(e) => setNewMember({ ...newMember, secondaryEmail: e.target.value })} placeholder="email@domain.com" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Set Secondary Login Password (Optional)</label>
                            <input
                              type="password"
                              placeholder="Min 6 characters"
                              value={newMember.secondaryPassword || ''}
                              onChange={(e) => setNewMember({ ...newMember, secondaryPassword: e.target.value })}
                              style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Setting a password enables member portal login for the secondary contact via mobile or email.</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Section 3: Document Uploads */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>03. Document Uploads</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div style={{ display: 'block' }}>
                        {/* ID Proof */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                              <FileText size={14} style={{ color: 'var(--primary)' }} /> ID Proof (Aadhar/PAN)
                            </label>
                            
                            {/* Type selector toggle */}
                            {!newMember.idProofUrl && (
                              <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.15rem', borderRadius: '0.35rem' }}>
                                <button type="button" onClick={() => setIdProofType('PHOTO')} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 600, border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: idProofType === 'PHOTO' ? 'var(--bg-primary)' : 'transparent', color: idProofType === 'PHOTO' ? 'var(--primary)' : 'var(--text-secondary)' }}>IMAGE</button>
                                <button type="button" onClick={() => setIdProofType('PDF')} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 600, border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: idProofType === 'PDF' ? 'var(--bg-primary)' : 'transparent', color: idProofType === 'PDF' ? 'var(--primary)' : 'var(--text-secondary)' }}>PDF</button>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            {newMember.idProofUrl ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {newMember.idProofUrl.toLowerCase().endsWith('.pdf') ? <FileText size={18} style={{ color: '#ef4444' }} /> : <Image size={18} style={{ color: 'var(--primary)' }} />}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Uploaded ID Document</span>
                                </div>
                                <button type="button" onClick={() => setNewMember({...newMember, idProofUrl: ''})} style={{ fontSize: '0.7rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                              </div>
                            ) : (
                              <div style={{ flex: 1 }}>
                                <input
                                  type="file"
                                  accept={idProofType === 'PHOTO' ? 'image/*' : '.pdf'}
                                  id="id-upload"
                                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'idProof')}
                                  disabled={uploading}
                                  style={{ display: 'none' }}
                                />
                                <label htmlFor="id-upload" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  <Upload size={14} /> Upload {idProofType === 'PHOTO' ? 'Image/Photo' : 'PDF Document'}
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                        {uploading && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>⏳ Uploading document, please wait...</div>}
                      </div>
                    </div>

                    {/* Section 4: Initial Payment */}
                    <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.03)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px dashed rgba(37, 99, 235, 0.25)' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Landmark size={15} /> Initial Setup / Corpus Fund
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Record any one-time joining fees collected right now.</p>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Initial Payment (₹)</label>
                          <input type="number" min="0" placeholder="Optional" value={newMember.initialPaymentAmount || ''} onChange={(e) => setNewMember({ ...newMember, initialPaymentAmount: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Payment Mode</label>
                          <select value={newMember.initialPaymentMode} onChange={(e) => setNewMember({ ...newMember, initialPaymentMode: e.target.value })}>
                            <option value="CASH">Cash</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="UPI">UPI / QR</option>
                            <option value="CHEQUE">Cheque</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Payment Date</label>
                          <input type="date" value={newMember.initialPaymentDate} onChange={(e) => setNewMember({ ...newMember, initialPaymentDate: e.target.value })} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Payment Notes</label>
                          <input type="text" placeholder="e.g. Corpus Fund, Setup Fee" value={newMember.initialPaymentNotes} onChange={(e) => setNewMember({ ...newMember, initialPaymentNotes: e.target.value })} />
                        </div>
                      </div>
                    </div>

                  </div>
                  
                  {/* Modal Footer Actions */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={uploading}>Add Member</button>
                  </div>
                </form>
              </>
            )}

            {showModal === 'member-history' && selectedMember && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Payment History</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {selectedMember.name} &mdash; Flat {selectedMember.flatNo}
                    </p>
                  </div>
                  <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>

                {/* Summary cards */}
                <div className="responsive-3-grid">
                  {[
                    { label: 'Total Paid', value: `₹${payments.filter((p: any) => p.memberId === selectedMember.id && p.status === 'PAID').reduce((s: number, p: any) => s + p.amount, 0).toLocaleString()}`, color: 'var(--success)' },
                    { label: 'Outstanding', value: `₹${selectedMember.outstandingDues?.toLocaleString()}`, color: selectedMember.outstandingDues > 0 ? 'var(--error)' : 'var(--success)' },
                    { label: 'Receipts', value: payments.filter((p: any) => p.memberId === selectedMember.id).length, color: 'var(--primary)' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Payment history table */}
                <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt No</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                        <th>FY</th>
                        <th>Coverage</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.filter((p: any) => p.memberId === selectedMember.id).length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No payment records found</td></tr>
                      ) : (
                        payments
                          .filter((p: any) => p.memberId === selectedMember.id)
                          .map((p: any) => (
                            <tr key={p.id}>
                              <td><code style={{ fontSize: '0.8125rem' }}>{p.receiptNumber}</code></td>
                              <td style={{ fontSize: '0.875rem' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                              <td style={{ fontWeight: 600 }}>₹{p.amount.toLocaleString()}</td>
                              <td><span className={`badge ${p.mode === 'CASH' ? 'badge-warning' : 'badge-success'}`}>{p.mode}</span></td>
                              <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                {p.coverageStartDate ? getFinancialYear(new Date(p.coverageStartDate)) : (p.periodLabel === 'Initial Onboarding Fee' ? 'Onboarding' : getFinancialYear(new Date(p.paymentDate)))}
                              </td>
                              <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {p.coverageStartDate && p.coverageEndDate ? (
                                  `${formatLocalDate(p.coverageStartDate)} - ${formatLocalDate(p.coverageEndDate)}`
                                ) : (
                                  p.periodLabel || '-'
                                )}
                              </td>
                              <td><span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-error'}`}>{p.status}</span></td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="btn btn-secondary" style={{ padding: '0.35rem 0.6rem', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                  onClick={() => { setSelectedPayment(p); setShowModal('receipt'); }}>
                                  <Eye size={13} /> View
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {showModal === 'receipt' && selectedPayment && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>Payment Receipt</h2>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '0.5rem' }}><Printer size={18} /></button>
                    <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                  </div>
                </div>

                <div id="receipt-content" style={{
                  backgroundColor: 'white',
                  color: '#1e293b',
                  padding: '2rem',
                  borderRadius: '0.5rem',
                  position: 'relative',
                  border: '1px solid #e2e8f0',
                  minHeight: '400px'
                }}>
                  {selectedPayment.status === 'CANCELLED' && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%) rotate(-30deg)',
                      fontSize: '4rem',
                      fontWeight: 800,
                      color: 'rgba(239, 68, 68, 0.15)',
                      pointerEvents: 'none',
                      zIndex: 10,
                      border: '8px solid rgba(239, 68, 68, 0.15)',
                      padding: '1rem',
                      borderRadius: '1rem'
                    }}>CANCELLED</div>
                  )}

                  <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid #3b82f6', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>{user?.tenantName}</div>
                    <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Maintenance Fee Receipt</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receipt Number</div>
                      <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedPayment.receiptNumber}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</div>
                      <div style={{ fontWeight: 700 }}>{new Date(selectedPayment.paymentDate).toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Received From</div>
                    <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedPayment.member?.name}</div>
                    <div style={{ color: '#475569' }}>Flat No: {selectedPayment.member?.flatNo}</div>
                  </div>

                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: '#64748b' }}>Payment Mode</span>
                      <span style={{ fontWeight: 600 }}>{selectedPayment.mode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total Amount</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>₹{selectedPayment.amount.toLocaleString()}</span>
                    </div>
                  </div>

                  {selectedPayment.notes && (
                    <div style={{ marginBottom: '2rem' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notes</div>
                      <div style={{ fontSize: '0.875rem', color: '#475569' }}>{selectedPayment.notes}</div>
                    </div>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '2rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Generated on {new Date().toLocaleString()}<br />
                      By {selectedPayment.collectedBy?.name || 'System'}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ borderBottom: '1px solid #e2e8f0', width: '150px', marginBottom: '0.5rem' }}></div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Authorized Signatory</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button className="btn btn-primary" onClick={() => {
                    const content = document.getElementById('receipt-content');
                    if (content) {
                      const printWindow = window.open('', '_blank');
                      printWindow?.document.write('<html><head><title>Receipt</title><style>body { font-family: sans-serif; }</style></head><body>');
                      printWindow?.document.write(content.innerHTML);
                      printWindow?.document.write('</body></html>');
                      printWindow?.document.close();
                      printWindow?.print();
                    }
                  }}>
                    <Download size={18} /> Download PDF
                  </button>
                </div>
              </>
            )}

            {showModal === 'edit-member' && editingMember && (
              <>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                      <Users size={22} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Member Details</h2>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.1rem' }}>Modify flat occupant profile, credentials, and documentation</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', padding: '0.4rem', borderRadius: '50%', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleUpdateMember}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                    
                    {/* Section 1: Member Personal Details */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>01. General Details</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div className="responsive-form-grid">
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Full Name *</label>
                          <input type="text" required value={editingMember.name} onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })} placeholder="e.g. Ramesh Kumar" style={{ width: '100%' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Flat / Unit No *</label>
                          <input type="text" required value={editingMember.flatNo} onChange={(e) => setEditingMember({ ...editingMember, flatNo: e.target.value })} placeholder="e.g. A-402" />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Residence Type *</label>
                          <select 
                            value={editingMember.residenceType || 'COMMON'} 
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditingMember({ 
                                ...editingMember, 
                                residenceType: val,
                                bhk: val === 'COMMON' ? 'COMMON' : '1'
                              });
                            }}
                          >
                            <option value="COMMON">Common Value</option>
                            <option value="FLAT">Flat</option>
                            <option value="VILLA">Villa</option>
                          </select>
                        </div>
                        {(editingMember.residenceType || 'COMMON') !== 'COMMON' && (
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>BHK *</label>
                            <select 
                              value={editingMember.bhk || '1'} 
                              onChange={(e) => setEditingMember({ ...editingMember, bhk: e.target.value })}
                            >
                              <option value="1">1 BHK</option>
                              <option value="2">2 BHK</option>
                              <option value="3">3 BHK</option>
                              <option value="4">4 BHK</option>
                              <option value="other">Other / Custom</option>
                            </select>
                          </div>
                        )}
                        {(editingMember.residenceType || 'COMMON') !== 'COMMON' && editingMember.bhk === 'other' && (
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Custom BHK *</label>
                            <input 
                              type="text" 
                              required 
                              placeholder="e.g. 5, Duplex" 
                              value={editingMember.customBhk || ''} 
                              onChange={(e) => setEditingMember({ ...editingMember, customBhk: e.target.value })} 
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                          <input 
                            type="checkbox" 
                            id="editUseCommonMaintenance" 
                            checked={editingMember.useCommonMaintenance !== undefined ? editingMember.useCommonMaintenance : true} 
                            onChange={(e) => setEditingMember({ ...editingMember, useCommonMaintenance: e.target.checked })} 
                            style={{ width: 'auto', margin: 0 }}
                          />
                          <label htmlFor="editUseCommonMaintenance" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
                            Enable Common Maintenance
                          </label>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Status *</label>
                          <select value={editingMember.status} onChange={(e) => setEditingMember({ ...editingMember, status: e.target.value })}>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Paid Until (Period Covered)</label>
                          <input type="date" value={editingMember.paidUntil || ''} onChange={(e) => setEditingMember({ ...editingMember, paidUntil: e.target.value })} />
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Next payment cycle will start after this date.</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Outstanding Dues (₹)</label>
                          <input type="text" inputMode="numeric" pattern="[0-9]*" value={editingMember.outstandingDues === 0 && editingMember._duesRaw === '' ? '' : (editingMember._duesRaw !== undefined ? editingMember._duesRaw : editingMember.outstandingDues)} onChange={(e) => { const raw = e.target.value.replace(/[^0-9]/g, ''); setEditingMember({ ...editingMember, _duesRaw: raw, outstandingDues: raw === '' ? 0 : parseInt(raw, 10) }); }} placeholder="0" />
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Current unpaid balance/dues for this member.</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Registration Year *</label>
                          <select value={editingMember.registrationYear || ''} onChange={(e) => setEditingMember({ ...editingMember, registrationYear: e.target.value })}>
                            <option value="">-- Select Financial Year --</option>
                            {getGroupedFYOptions().map(group => (
                              <optgroup key={group.label} label={group.label}>
                                {group.options.map(fy => (
                                  <option key={fy} value={fy}>{fy}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Contact Info & Credentials */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>02. Contact & Access</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }} className="member-contact-grid-layout">
                        
                        {/* Primary Contact Card */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <UserCheck size={16} style={{ color: 'var(--primary)' }} /> Primary Contact (Compulsory)
                          </h4>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Primary Number *</label>
                            <input type="text" required value={editingMember.mobile} onChange={(e) => setEditingMember({ ...editingMember, mobile: e.target.value })} placeholder="10-digit mobile number" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Primary Email (Optional)</label>
                            <input type="email" value={editingMember.email || ''} onChange={(e) => setEditingMember({ ...editingMember, email: e.target.value })} placeholder="email@domain.com" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>
                              {editingMember.userId ? 'Change Primary Login Password (Optional)' : 'Set Primary Login Password (Optional)'}
                            </label>
                            <input
                              type="password"
                              placeholder={editingMember.userId ? "Leave blank to keep current" : "Min 6 characters"}
                              value={editingMember.password || ''}
                              onChange={(e) => setEditingMember({ ...editingMember, password: e.target.value })}
                              style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {editingMember.userId 
                                ? 'Password will be updated only if you enter a new one.' 
                                : 'Setting a password enables portal login for primary contact.'}
                            </p>
                          </div>
                        </div>

                        {/* Secondary Contact Card */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <User size={16} style={{ color: 'var(--success)' }} /> Secondary Contact (Optional)
                          </h4>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Secondary Number (Optional)</label>
                            <input type="text" value={editingMember.secondaryMobile || ''} onChange={(e) => setEditingMember({ ...editingMember, secondaryMobile: e.target.value })} placeholder="10-digit mobile number" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>Secondary Email (Optional)</label>
                            <input type="email" value={editingMember.secondaryEmail || ''} onChange={(e) => setEditingMember({ ...editingMember, secondaryEmail: e.target.value })} placeholder="email@domain.com" style={{ width: '100%' }} />
                          </div>
                          <div>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block', color: 'var(--text-primary)' }}>
                              {editingMember.secondaryUserId ? 'Change Secondary Login Password (Optional)' : 'Set Secondary Login Password (Optional)'}
                            </label>
                            <input
                              type="password"
                              placeholder={editingMember.secondaryUserId ? "Leave blank to keep current" : "Min 6 characters"}
                              value={editingMember.secondaryPassword || ''}
                              onChange={(e) => setEditingMember({ ...editingMember, secondaryPassword: e.target.value })}
                              style={{ width: '100%' }}
                            />
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                              {editingMember.secondaryUserId 
                                ? 'Password will be updated only if you enter a new one.' 
                                : 'Setting a password enables portal login for secondary contact.'}
                            </p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Section 3: Document Uploads */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--primary)' }}>03. Document Uploads</span>
                        <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }}></div>
                      </div>
                      <div style={{ display: 'block' }}>
                        {/* ID Proof */}
                        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                              <FileText size={14} style={{ color: 'var(--primary)' }} /> ID Proof (Aadhar/PAN)
                            </label>
                            
                            {/* Type selector toggle */}
                            {!editingMember.idProofUrl && (
                              <div style={{ display: 'flex', gap: '0.2rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.15rem', borderRadius: '0.35rem' }}>
                                <button type="button" onClick={() => setEditIdProofType('PHOTO')} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 600, border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: editIdProofType === 'PHOTO' ? 'var(--bg-primary)' : 'transparent', color: editIdProofType === 'PHOTO' ? 'var(--primary)' : 'var(--text-secondary)' }}>IMAGE</button>
                                <button type="button" onClick={() => setEditIdProofType('PDF')} style={{ padding: '0.15rem 0.4rem', fontSize: '0.65rem', fontWeight: 600, border: 'none', borderRadius: '0.25rem', cursor: 'pointer', backgroundColor: editIdProofType === 'PDF' ? 'var(--bg-primary)' : 'transparent', color: editIdProofType === 'PDF' ? 'var(--primary)' : 'var(--text-secondary)' }}>PDF</button>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                            {editingMember.idProofUrl ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {editingMember.idProofUrl.toLowerCase().endsWith('.pdf') ? <FileText size={18} style={{ color: '#ef4444' }} /> : <Image size={18} style={{ color: 'var(--primary)' }} />}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-primary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Uploaded ID Document</span>
                                </div>
                                <button type="button" onClick={() => setEditingMember({...editingMember, idProofUrl: ''})} style={{ fontSize: '0.7rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                              </div>
                            ) : (
                              <div style={{ flex: 1 }}>
                                <input
                                  type="file"
                                  accept={editIdProofType === 'PHOTO' ? 'image/*' : '.pdf'}
                                  id="edit-id-upload"
                                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'idProof')}
                                  disabled={uploading}
                                  style={{ display: 'none' }}
                                />
                                <label htmlFor="edit-id-upload" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.625rem', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8125rem', backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                  <Upload size={14} /> Upload {editIdProofType === 'PHOTO' ? 'Image/Photo' : 'PDF Document'}
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                        {uploading && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>⏳ Uploading document, please wait...</div>}
                      </div>
                    </div>

                  </div>
                  
                  {/* Modal Footer Actions */}
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={uploading}>Update Member</button>
                  </div>
                </form>
              </>
            )}

            {showModal === 'payment' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>Record Payment</h2>
                  <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>
                <form onSubmit={handleSubmitPayment}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    
                    <div className="grid-2">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Select Member</label>
                        <select required value={newPayment.memberId} onChange={(e) => {
                          setNewPayment({ 
                            ...newPayment, 
                            memberId: e.target.value, 
                            amount: getPricing(newPayment.paidMonths, newPayment.category, newPayment.paymentDate, newPayment.coverageStartDate || '', newPayment.coverageEndDate || '') 
                          });
                        }}>
                          <option value="">-- Choose Member --</option>
                          {members.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.flatNo} - {m.name} (Due: ₹{m.outstandingDues})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Category</label>
                        <select required value={newPayment.category} onChange={(e) => {
                          const cat = e.target.value;
                          const amt = getPricing(newPayment.paidMonths, cat, newPayment.paymentDate, newPayment.coverageStartDate || '', newPayment.coverageEndDate || '');
                          setNewPayment({ 
                            ...newPayment, 
                            category: cat,
                            amount: cat === 'Maintenance' ? amt : 0
                          });
                        }}>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Event Fee">Event Fee</option>
                          <option value="Corpus Fund">Corpus Fund</option>
                          <option value="Water Dues">Water Dues</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-2">
                      {newPayment.category === 'Maintenance' ? (
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Period</label>
                          <select required value={newPayment.paidMonths} onChange={(e) => {
                            const months = parseInt(e.target.value);
                            const label = e.target.options[e.target.selectedIndex].text;
                            let updatedEndDate = newPayment.coverageEndDate;
                            
                            if (months > 0 && newPayment.coverageStartDate) {
                              const start = new Date(newPayment.coverageStartDate);
                              const end = new Date(start.setMonth(start.getMonth() + months));
                              end.setDate(end.getDate() - 1);
                              updatedEndDate = end.toISOString().split('T')[0];
                            } else if (months === 0) {
                              updatedEndDate = '';
                            }
                            
                            setNewPayment({ 
                              ...newPayment, 
                              paidMonths: months, 
                              periodLabel: label, 
                              amount: getPricing(months, newPayment.category, newPayment.paymentDate, newPayment.coverageStartDate || '', updatedEndDate || ''),
                              coverageEndDate: updatedEndDate
                            });
                          }}>
                            <option value={0}>Click to select</option>
                            <option value={1}>Monthly</option>
                            <option value={3}>Quarterly</option>
                            <option value={6}>Half-Yearly</option>
                            <option value={12}>Annual</option>
                          </select>
                        </div>
                      ) : (
                        <div style={{ visibility: 'hidden', height: 0, overflow: 'hidden' }}>
                        </div>
                      )}
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Mode</label>
                        <select value={newPayment.mode} onChange={(e) => setNewPayment({ ...newPayment, mode: e.target.value })}>
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="UPI">UPI / QR</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>
                          Amount Received (₹)
                        </label>
                        <input 
                          type="text" 
                          required 
                          value={newPayment.category === 'Maintenance' && newPayment.paidMonths === 0 ? 'Click to select' : (newPayment.amount === 0 ? '' : newPayment.amount)} 
                          disabled={newPayment.category === 'Maintenance' && newPayment.paidMonths === 0}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val)) {
                              setNewPayment({ ...newPayment, amount: val === '' ? 0 : parseFloat(val) });
                            }
                          }} 
                          style={{
                            backgroundColor: newPayment.category === 'Maintenance' && newPayment.paidMonths === 0 ? 'var(--bg-secondary)' : 'transparent',
                            color: newPayment.category === 'Maintenance' && newPayment.paidMonths === 0 ? 'var(--text-secondary)' : 'var(--text-primary)',
                            cursor: newPayment.category === 'Maintenance' && newPayment.paidMonths === 0 ? 'not-allowed' : 'text'
                          }}
                        />
                        {newPayment.category === 'Maintenance' && newPayment.paidMonths > 0 && summary.discountDate && summary.discountAmount && newPayment.paymentDate && (() => {
                          const deadline = new Date(summary.discountDate);
                          const pDate = new Date(newPayment.paymentDate);
                          deadline.setHours(23, 59, 59, 999);
                          pDate.setHours(0, 0, 0, 0);
                          if (pDate <= deadline) {
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', fontWeight: 500 }}>
                                ✓ Early payment discount of ₹{summary.discountAmount} applied!
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {newPayment.category === 'Maintenance' && newPayment.paidMonths > 0 && summary.lateFeeDate && summary.lateFeeAmount && newPayment.paymentDate && (() => {
                          const cutOffDay = getDayFromDateString(summary.lateFeeDate);
                          const paymentDay = getDayFromDateString(newPayment.paymentDate);
                          
                          if (paymentDay > cutOffDay) {
                            const monthsCount = getMonthsCount(newPayment.paidMonths, newPayment.coverageStartDate || '', newPayment.coverageEndDate || '');
                            
                            let baseAmount = 0;
                            if (monthsCount === 3 && summary.quarterlyAmount) {
                              baseAmount = summary.quarterlyAmount;
                            } else if (monthsCount === 6 && summary.halfYearlyAmount) {
                              baseAmount = summary.halfYearlyAmount;
                            } else if (monthsCount === 12 && summary.annualAmount) {
                              baseAmount = summary.annualAmount;
                            } else {
                              baseAmount = (summary.maintenanceAmount || 0) * monthsCount;
                            }
                            
                            if (summary.discountDate && summary.discountAmount && newPayment.paymentDate) {
                              const discountDeadline = new Date(summary.discountDate);
                              const paymentDateVal = new Date(newPayment.paymentDate);
                              discountDeadline.setHours(23, 59, 59, 999);
                              paymentDateVal.setHours(0, 0, 0, 0);
                              if (paymentDateVal <= discountDeadline) {
                                baseAmount = Math.max(0, baseAmount - summary.discountAmount);
                              }
                            }
                            
                            const charge = Math.max(0, newPayment.amount - baseAmount);
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 500 }}>
                                ⚠️ Late fee of ₹{charge} charged ({monthsCount} months * ₹{summary.lateFeeAmount}/month default)
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Date Received from Member</label>
                        <input 
                          type="date" 
                          required 
                          value={newPayment.paymentDate} 
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setNewPayment({ 
                              ...newPayment, 
                              paymentDate: newDate,
                              amount: newPayment.category === 'Maintenance' ? getPricing(newPayment.paidMonths, newPayment.category, newDate, newPayment.coverageStartDate || '', newPayment.coverageEndDate || '') : newPayment.amount
                            });
                          }} 
                        />
                      </div>
                    </div>

                    <div className="grid-2">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Date Recorded in Ledger</label>
                        <input 
                          type="date" 
                          required 
                          value={newPayment.ledgerDate} 
                          onChange={(e) => {
                            setNewPayment({ 
                              ...newPayment, 
                              ledgerDate: e.target.value
                            });
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Reference / Notes</label>
                        <input type="text" placeholder="e.g. Receipt No, Transaction ID" value={newPayment.notes} onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })} />
                      </div>
                    </div>

                    {newPayment.category === 'Maintenance' && (
                      <div className="grid-2" style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--border-color)' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <h4 style={{ fontSize: '0.875rem', marginBottom: '0.2rem', color: 'var(--primary)' }}>Advanced: Custom Coverage Dates</h4>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Leave blank to auto-calculate based on current paid-until date.</p>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Coverage Start (Optional)</label>
                          <input type="date" value={newPayment.coverageStartDate || ''} onChange={(e) => {
                            const startDate = e.target.value;
                            let updatedEndDate = newPayment.coverageEndDate;
                            
                            if (startDate) {
                              const start = new Date(startDate);
                              const end = new Date(start.setMonth(start.getMonth() + newPayment.paidMonths));
                              end.setDate(end.getDate() - 1);
                              updatedEndDate = end.toISOString().split('T')[0];
                            }
                            
                            const amt = getPricing(newPayment.paidMonths, newPayment.category, newPayment.paymentDate, startDate, updatedEndDate);
                            setNewPayment({ 
                              ...newPayment, 
                              coverageStartDate: startDate, 
                              coverageEndDate: updatedEndDate,
                              amount: newPayment.category === 'Maintenance' ? amt : newPayment.amount
                            });
                          }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Coverage End (Optional)</label>
                          <input type="date" value={newPayment.coverageEndDate || ''} onChange={(e) => {
                            const endDate = e.target.value;
                            const amt = getPricing(newPayment.paidMonths, newPayment.category, newPayment.paymentDate, newPayment.coverageStartDate || '', endDate);
                            setNewPayment({ 
                              ...newPayment, 
                              coverageEndDate: endDate,
                              amount: newPayment.category === 'Maintenance' ? amt : newPayment.amount
                            });
                          }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Record Payment</button>
                  </div>
                </form>
              </>
            )}
            {showModal === 'editPayment' && editingPayment && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>Edit Payment — {editingPayment.receiptNumber}</h2>
                  <button onClick={() => { setShowModal(null); setEditingPayment(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>
                <form onSubmit={handleUpdatePayment}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Member</label>
                      <input type="text" disabled value={`${editingPayment.memberFlatNo} - ${editingPayment.memberName}`} style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }} />
                    </div>
                    <div className="grid-2">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Mode</label>
                        <select value={editingPayment.mode} onChange={(e) => setEditingPayment({ ...editingPayment, mode: e.target.value })}>
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="UPI">UPI / QR</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Amount Received (₹)</label>
                        <input 
                          type="text" 
                          required 
                          value={editingPayment.amount === 0 ? '' : editingPayment.amount} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^\d*\.?\d*$/.test(val)) {
                              setEditingPayment({ ...editingPayment, amount: val === '' ? 0 : parseFloat(val) });
                            }
                          }} 
                        />
                        {editingPayment.category === 'Maintenance' && summary.lateFeeDate && summary.lateFeeAmount && editingPayment.paymentDate && (() => {
                          const cutOffDay = getDayFromDateString(summary.lateFeeDate);
                          const paymentDay = getDayFromDateString(editingPayment.paymentDate);
                          
                          if (paymentDay > cutOffDay) {
                            const monthsCount = getMonthsCount(editingPayment.paidMonths, editingPayment.coverageStartDate || '', editingPayment.coverageEndDate || '');
                            
                            let baseAmount = 0;
                            if (monthsCount === 3 && summary.quarterlyAmount) {
                              baseAmount = summary.quarterlyAmount;
                            } else if (monthsCount === 6 && summary.halfYearlyAmount) {
                              baseAmount = summary.halfYearlyAmount;
                            } else if (monthsCount === 12 && summary.annualAmount) {
                              baseAmount = summary.annualAmount;
                            } else {
                              baseAmount = (summary.maintenanceAmount || 0) * monthsCount;
                            }
                            
                            if (summary.discountDate && summary.discountAmount && editingPayment.paymentDate) {
                              const discountDeadline = new Date(summary.discountDate);
                              const paymentDateVal = new Date(editingPayment.paymentDate);
                              discountDeadline.setHours(23, 59, 59, 999);
                              paymentDateVal.setHours(0, 0, 0, 0);
                              if (paymentDateVal <= discountDeadline) {
                                baseAmount = Math.max(0, baseAmount - summary.discountAmount);
                              }
                            }
                            
                            const charge = Math.max(0, editingPayment.amount - baseAmount);
                            return (
                              <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem', fontWeight: 500 }}>
                                ⚠️ Late fee of ₹{charge} charged ({monthsCount} months * ₹{summary.lateFeeAmount}/month default)
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    <div className="grid-2">
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Date Received from Member</label>
                        <input 
                          type="date" 
                          required 
                          value={editingPayment.paymentDate} 
                          onChange={(e) => {
                            const newDate = e.target.value;
                            setEditingPayment({ 
                              ...editingPayment, 
                              paymentDate: newDate,
                              amount: editingPayment.category === 'Maintenance' ? getPricing(editingPayment.paidMonths, editingPayment.category, newDate, editingPayment.coverageStartDate || '', editingPayment.coverageEndDate || '') : editingPayment.amount
                            });
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Payment Date Recorded in Ledger</label>
                        <input type="date" required value={editingPayment.ledgerDate || ''} onChange={(e) => setEditingPayment({ ...editingPayment, ledgerDate: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Reference / Notes</label>
                      <input type="text" value={editingPayment.notes} onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })} />
                    </div>
                    <div className="grid-2" style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.5rem', border: '1px dashed var(--border-color)' }}>
                      <div style={{ gridColumn: 'span 2' }}>
                        <h4 style={{ fontSize: '0.875rem', marginBottom: '0.2rem', color: 'var(--primary)' }}>Custom Coverage Dates</h4>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Coverage Start (Optional)</label>
                        <input 
                          type="date" 
                          value={editingPayment.coverageStartDate} 
                          onChange={(e) => {
                            const startDate = e.target.value;
                            const amt = getPricing(editingPayment.paidMonths, editingPayment.category, editingPayment.paymentDate, startDate, editingPayment.coverageEndDate || '');
                            setEditingPayment({ 
                              ...editingPayment, 
                              coverageStartDate: startDate, 
                              amount: editingPayment.category === 'Maintenance' ? amt : editingPayment.amount
                            });
                          }} 
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Coverage End (Optional)</label>
                        <input 
                          type="date" 
                          value={editingPayment.coverageEndDate} 
                          onChange={(e) => {
                            const endDate = e.target.value;
                            const amt = getPricing(editingPayment.paidMonths, editingPayment.category, editingPayment.paymentDate, editingPayment.coverageStartDate || '', endDate);
                            setEditingPayment({ 
                              ...editingPayment, 
                              coverageEndDate: endDate, 
                              amount: editingPayment.category === 'Maintenance' ? amt : editingPayment.amount
                            });
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(null); setEditingPayment(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Save Changes</button>
                  </div>
                </form>
              </>
            )}
            {showModal === 'transfer' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>Transfer / Handover Cash</h2>
                  <button onClick={() => setShowModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
                </div>
                <form onSubmit={handleSubmitTransfer}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Your Current Cash Balance</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>₹{myBalance.toLocaleString()}</div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Transfer Type</label>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="radio" checked={newTransfer.type === 'HANDOVER'} onChange={() => setNewTransfer({ ...newTransfer, type: 'HANDOVER' })} />
                          <span style={{ fontSize: '0.875rem' }}>Handover to Admin</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                          <input type="radio" checked={newTransfer.type === 'DEPOSIT'} onChange={() => setNewTransfer({ ...newTransfer, type: 'DEPOSIT' })} />
                          <span style={{ fontSize: '0.875rem' }}>Deposit to Bank</span>
                        </label>
                      </div>
                    </div>

                    {newTransfer.type === 'HANDOVER' && (
                      <div>
                        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Select Recipient Admin</label>
                        <select required value={newTransfer.toAdminId} onChange={(e) => setNewTransfer({ ...newTransfer, toAdminId: e.target.value })}>
                          <option value="">-- Select Treasurer --</option>
                          {cashBalances.filter((b: any) => b.userId !== user.id).map((b: any) => (
                            <option key={b.userId} value={b.userId}>{b.userName}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Amount (₹)</label>
                      <input type="number" required max={myBalance} value={newTransfer.amount} onChange={(e) => setNewTransfer({ ...newTransfer, amount: parseFloat(e.target.value) || 0 })} />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>Notes</label>
                      <input type="text" placeholder="e.g. For weekly bank deposit" value={newTransfer.referenceNote} onChange={(e) => setNewTransfer({ ...newTransfer, referenceNote: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={newTransfer.amount <= 0 || newTransfer.amount > myBalance}>Initiate Transfer</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
      {selectedDoc && <DocumentViewer url={selectedDoc.url} type={selectedDoc.type} onClose={() => setSelectedDoc(null)} />}
    </div>
  );
};

export default TenantAdminDashboard;
