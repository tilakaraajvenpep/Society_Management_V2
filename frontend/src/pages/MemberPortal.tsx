import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, LifeBuoy, LogOut, Plus, Send, 
  MessageSquare, Clock, Building, User, CreditCard, 
  History, Menu, X, Printer, FileText, Camera, Lock,
  ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import axios from 'axios';
import NotificationPanel from '../components/NotificationPanel';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../components/Toast';

const MemberHelpdesk = ({ token }: { token: string | null }) => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'MEDIUM' });
  const [comment, setComment] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data);
    } catch (err) {
      console.error("Error fetching tickets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingImage(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await axios.post('/upload/ticket', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
        imageUrl = uploadRes.data.imageUrl;
      }

      await axios.post('/tickets', { ...newTicket, imageUrl }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewTicket({ subject: '', description: '', priority: 'MEDIUM' });
      setImageFile(null);
      setShowNewModal(false);
      fetchTickets();
    } catch (err) {
      console.error(err);
      showToast("Error raising ticket", 'error');
    } finally {
      setUploadingImage(false);
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

  const getStatusBadge = (s: string) => {
    switch(s) {
      case 'OPEN': return <span className="badge badge-error">Open</span>;
      case 'IN_PROGRESS': return <span className="badge" style={{ backgroundColor: '#f59e0b', color: '#fff' }}>In Progress</span>;
      case 'RESOLVED': return <span className="badge badge-success">Resolved</span>;
      case 'CLOSED': return <span className="badge" style={{ backgroundColor: 'var(--text-secondary)', color: '#fff' }}>Closed</span>;
      default: return <span className="badge">{s}</span>;
    }
  };

  return (
    <div className={`helpdesk-container ${selectedTicket ? 'has-selected' : ''}`}>
      {/* Ticket List */}
      <div className="card ticket-list-panel" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={18} /> {t('helpdesk.my_tickets')}
          </h3>
          <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }} onClick={() => setShowNewModal(true)}>
            <Plus size={16} /> {t('helpdesk.new_ticket')}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
          ) : tickets.length === 0 ? (
            <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <LifeBuoy size={40} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p>{t('helpdesk.no_tickets')}</p>
              <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={() => setShowNewModal(true)}>{t('helpdesk.raise_ticket')}</button>
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
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)' }}>#{t.id.slice(-6)}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{new Date(t.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>{t.subject}</div>
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

      {/* Ticket Details */}
      {selectedTicket ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{selectedTicket.subject}</h3>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={14} /> Raised on {new Date(selectedTicket.createdAt).toLocaleString()}
                <span>•</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
            </div>
            <button className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={() => setSelectedTicket(null)}>
              <X size={20} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>{t('helpdesk.description')}</div>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.925rem', marginBottom: selectedTicket.imageUrl ? '1rem' : 0 }}>{selectedTicket.description}</p>
              {selectedTicket.imageUrl && (
                <div style={{ marginTop: '1rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Attached Image</div>
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

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(selectedTicket.comments || []).map((c: any) => {
                const isAdmin = !!c.userId;
                return (
                  <div key={c.id} style={{ 
                    alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAdmin ? 'flex-start' : 'flex-end'
                  }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <strong>{isAdmin ? 'Admin' : 'You'}</strong>
                      <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ 
                      padding: '0.75rem 1rem', 
                      borderRadius: '0.75rem', 
                      borderTopLeftRadius: isAdmin ? '0' : '0.75rem',
                      borderTopRightRadius: isAdmin ? '0.75rem' : '0',
                      backgroundColor: isAdmin ? 'var(--bg-tertiary)' : 'var(--primary)',
                      color: isAdmin ? 'var(--text-primary)' : '#fff',
                      fontSize: '0.875rem'
                    }}>
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedTicket.status !== 'CLOSED' && selectedTicket.status !== 'ARCHIVED' && (
            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)' }}>
              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.75rem' }}>
                <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('helpdesk.add_reply')} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" disabled={!comment.trim()}><Send size={18} /></button>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
          <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
          <p>{t('helpdesk.select_ticket')}</p>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3>{t('helpdesk.raise_ticket')}</h3>
              <button onClick={() => setShowNewModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }} disabled={uploadingImage}>&times;</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('helpdesk.subject')}</label>
                <input required value={newTicket.subject} onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})} placeholder="Brief title of the issue" disabled={uploadingImage} />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('helpdesk.priority')}</label>
                <select value={newTicket.priority} onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})} disabled={uploadingImage}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('helpdesk.description')}</label>
                <textarea 
                  required 
                  value={newTicket.description} 
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} 
                  placeholder="Provide more details about your concern..."
                  rows={4}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  disabled={uploadingImage}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('helpdesk.attachment')}</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', fontSize: '0.875rem' }}
                  disabled={uploadingImage}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowNewModal(false)} disabled={uploadingImage}>{t('action.cancel')}</button>
                <button type="submit" className="btn btn-primary" disabled={uploadingImage}>
                  {uploadingImage ? `${t('action.loading')}` : t('helpdesk.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


const MemberPayments = ({ memberInfo, user }: { memberInfo: any, user: any }) => {
  const { t } = useLanguage();
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);


  const viewReceipt = (p: any) => {
    setSelectedPayment({
      ...p,
      member: {
        name: memberInfo.name,
        flatNo: memberInfo.flatNo
      }
    });
    setShowReceipt(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="card">
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={20} /> {t('payments.history')}
        </h3>
        
        {!memberInfo?.payments || memberInfo.payments.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <CreditCard size={40} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
            <p>{t('payments.no_records')}</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('payments.date').toUpperCase()}</th>
                  <th style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('payments.receipt_no').toUpperCase()}</th>
                  <th style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('payments.period').toUpperCase()}</th>
                  <th style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('payments.amount').toUpperCase()}</th>
                  <th style={{ padding: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{t('members.actions').toUpperCase()}</th>
                </tr>
              </thead>
              <tbody>
                {memberInfo.payments.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>{p.receiptNumber || `RCP-${p.id.slice(-6).toUpperCase()}`}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{p.periodLabel || `${p.paidMonths} Month(s)`}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 700 }}>₹{p.amount.toLocaleString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => viewReceipt(p)}>
                        <FileText size={14} /> {t('action.view')} {t('payments.receipt')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showReceipt && selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem' }}>{t('payments.receipt')}</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '0.5rem' }}><Printer size={18} /></button>
                <button onClick={() => setShowReceipt(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
              </div>
            </div>

            <div id="receipt-content" style={{
              backgroundColor: 'white',
              color: '#1e293b',
              padding: '2rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              minHeight: '400px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{user?.tenantName}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('payments.receipt')} - {user?.tenantName}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('payments.receipt_no')}</div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedPayment.receiptNumber || `RCP-${selectedPayment.id.slice(-6).toUpperCase()}`}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('payments.date')}</div>
                  <div style={{ fontWeight: 700 }}>{new Date(selectedPayment.paymentDate).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Received From</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{selectedPayment.member?.name}</div>
                <div style={{ color: '#475569' }}>Flat No: {selectedPayment.member?.flatNo}</div>
              </div>

              {(() => {
                const lateFee = selectedPayment.lateFee || 0;
                const discount = selectedPayment.discount || 0;
                const baseAmount = selectedPayment.amount - lateFee + discount;
                return (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: '#64748b' }}>{t('payments.period')}</span>
                      <span style={{ fontWeight: 600 }}>{selectedPayment.periodLabel || `${selectedPayment.paidMonths} Month(s)`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: '#64748b' }}>{t('payments.mode')}</span>
                      <span style={{ fontWeight: 600 }}>{selectedPayment.mode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>{t('payments.base_amount')}</span>
                      <span style={{ fontWeight: 600 }}>₹{baseAmount.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981' }}>{t('payments.early_discount')}</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    {lateFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#dc2626' }}>{t('payments.late_fee')}</span>
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>+₹{lateFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>{t('payments.total')}</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₹{selectedPayment.amount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {selectedPayment.notes && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>{selectedPayment.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemberReceipts = ({ memberInfo, user }: { memberInfo: any, user: any }) => {
  const { t } = useLanguage();
  const [showReceipt, setShowReceipt] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const viewReceipt = (p: any) => {
    setSelectedPayment({
      ...p,
      member: {
        name: memberInfo.name,
        flatNo: memberInfo.flatNo
      }
    });
    setShowReceipt(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{t('nav.receipts')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{t('action.view')} & {t('action.print')} {t('payments.receipt').toLowerCase()}.</p>
        </div>
      </div>

      {!memberInfo?.payments || memberInfo.payments.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px solid var(--border-color)' }}>
          <FileText size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--text-secondary)', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No Receipts Available</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '300px', margin: '0 auto' }}>Once society payments are recorded against your flat, your receipts will be generated here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {memberInfo.payments.map((p: any) => {
            const receiptNo = p.receiptNumber || `RCP-${p.id.slice(-6).toUpperCase()}`;
            return (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', transition: 'transform 0.2s ease, box-shadow 0.2s ease', cursor: 'default', border: '1px solid var(--border-color)' }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.transform = 'translateY(-2px)';
                     e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.transform = 'none';
                     e.currentTarget.style.boxShadow = 'none';
                   }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>{receiptNo}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '2rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 600 }}>{t('status.paid')}</span>
                  </div>
                  <h4 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>₹{p.amount.toLocaleString()}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('payments.period')}:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{p.periodLabel || `${p.paidMonths} Month(s)`}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('payments.date')}:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{new Date(p.paymentDate).toLocaleDateString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{t('payments.mode')}:</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{p.mode}</strong>
                    </div>
                  </div>
                </div>
                
                <button className="btn btn-secondary" style={{ width: '100%', padding: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.8125rem', fontWeight: 600 }} onClick={() => viewReceipt(p)}>
                  <Printer size={16} /> {t('action.view')} & {t('action.print')} {t('payments.receipt')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {showReceipt && selectedPayment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Payment Receipt</h2>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => window.print()} style={{ padding: '0.5rem' }}><Printer size={18} /></button>
                <button onClick={() => setShowReceipt(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
              </div>
            </div>

            <div id="receipt-content" style={{
              backgroundColor: 'white',
              color: '#1e293b',
              padding: '2rem',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              minHeight: '400px'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{user?.tenantName}</div>
                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Maintenance Fee Receipt</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receipt Number</div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedPayment.receiptNumber || `RCP-${selectedPayment.id.slice(-6).toUpperCase()}`}</div>
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

              {(() => {
                const lateFee = selectedPayment.lateFee || 0;
                const discount = selectedPayment.discount || 0;
                const baseAmount = selectedPayment.amount - lateFee + discount;
                return (
                  <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '0.75rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: '#64748b' }}>Payment Period</span>
                      <span style={{ fontWeight: 600 }}>{selectedPayment.periodLabel || `${selectedPayment.paidMonths} Month(s)`}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <span style={{ color: '#64748b' }}>Payment Mode</span>
                      <span style={{ fontWeight: 600 }}>{selectedPayment.mode}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b' }}>Base Amount</span>
                      <span style={{ fontWeight: 600 }}>₹{baseAmount.toLocaleString()}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#10b981' }}>Early Bird Discount</span>
                        <span style={{ fontWeight: 600, color: '#10b981' }}>-₹{discount.toLocaleString()}</span>
                      </div>
                    )}
                    {lateFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <span style={{ color: '#dc2626' }}>Late Fee</span>
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>+₹{lateFee.toLocaleString()}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '1.125rem', fontWeight: 700 }}>Total Amount</span>
                      <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>₹{selectedPayment.amount.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {selectedPayment.notes && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Notes</div>
                  <div style={{ fontSize: '0.875rem', color: '#475569' }}>{selectedPayment.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemberProfileTab = ({ memberInfo, setMemberInfo, token }: { memberInfo: any, setMemberInfo: any, token: string | null }) => {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const isSecondary = !!memberInfo?.isSecondaryUser;
  const [name, setName] = useState(memberInfo?.name || '');
  const [email, setEmail] = useState(isSecondary ? (memberInfo?.secondaryEmail || '') : (memberInfo?.email || ''));
  const [mobile, setMobile] = useState(isSecondary ? (memberInfo?.secondaryMobile || '') : (memberInfo?.mobile || ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoUrl, setPhotoUrl] = useState(memberInfo?.photoUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (memberInfo) {
      const sec = !!memberInfo.isSecondaryUser;
      setName(memberInfo.name || '');
      setEmail(sec ? (memberInfo.secondaryEmail || '') : (memberInfo.email || ''));
      setMobile(sec ? (memberInfo.secondaryMobile || '') : (memberInfo.mobile || ''));
      setPhotoUrl(memberInfo.photoUrl || '');
    }
  }, [memberInfo]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await axios.post('/upload/member-docs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      });
      setPhotoUrl(res.data.photoUrl);
      showToast('Profile photo uploaded successfully! Click "Save Changes" to save it.', 'success');
    } catch (err) {
      console.error('Photo upload error', err);
      showToast('Error uploading photo.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      showToast("Passwords do not match.", 'error');
      return;
    }
    if (mobile) {
      const cleanMobile = mobile.trim();
      if (cleanMobile !== "" && !/^\d{10}$/.test(cleanMobile)) {
        showToast("Mobile number must be exactly 10 digits.", 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = { name, email, mobile, photoUrl };
      if (password) payload.password = password;

      const res = await axios.patch('/members/profile', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMemberInfo((prev: any) => ({
        ...prev,
        name: res.data.name,
        email: res.data.email,
        mobile: res.data.mobile,
        photoUrl: res.data.photoUrl
      }));

      // Update global auth state
      updateUser({
        name: res.data.name,
        email: res.data.email,
        mobile: res.data.mobile
      });

      setPassword('');
      setConfirmPassword('');
      showToast("Profile updated successfully!", 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Error updating profile.", 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto' }}>
      <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.125rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} /> {t('profile.edit')}
        </h3>

        {/* Photo Upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', backgroundColor: 'var(--bg-tertiary)' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                <User size={36} />
              </div>
            )}
            {uploading && (
              <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: '0.7rem' }}>
                Uploading...
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.4rem 0.8rem', fontSize: '0.8125rem' }}>
              <Camera size={14} /> {photoUrl ? t('profile.change_photo') : t('profile.upload_photo')}
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} disabled={uploading} />
            </label>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>PNG, JPG or JPEG. Max 5MB.</span>
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('profile.full_name')}</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t('profile.full_name')} />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>
              {isSecondary ? 'Secondary Email' : 'Email Address'}
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={isSecondary ? 'Secondary Email (Optional)' : 'Email Address (Optional)'} />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>{t('profile.flat_no')}</label>
            <input value={memberInfo?.flatNo || ''} disabled style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>{t('profile.billing_cycle')}</label>
            <input value={memberInfo?.defaultTenure || ''} disabled style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'not-allowed' }} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>{t('profile.address')}</label>
          <textarea value={memberInfo?.address || ''} disabled rows={2} style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', cursor: 'not-allowed', fontSize: '0.875rem' }} />
        </div>

        {/* Changeable fields */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <h4 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)' }}>
            <Lock size={14} /> {t('profile.security')}
            {isSecondary && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>(Secondary Account)</span>}
          </h4>
          
          <div>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>
              {isSecondary ? 'Secondary Phone Number' : 'Phone Number'}
            </label>
            <input required type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter phone number" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('profile.new_password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', display: 'block' }}>{t('profile.leave_blank')}</span>
            </div>
            <div>
              <label style={{ fontSize: '0.8125rem', fontWeight: 500, marginBottom: '0.4rem', display: 'block' }}>{t('profile.confirm_password')}</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving || uploading} style={{ padding: '0.5rem 1.25rem' }}>
            {saving ? t('action.saving') : t('profile.save_changes')}
          </button>
        </div>
      </form>
    </div>
  );
};

const getFinancialYear = (dateString: string | Date) => {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = d.getMonth(); // Jan is 0, Apr is 3
  if (month >= 3) {
    const nextYr = (year + 1) % 100;
    return `${year}-${nextYr < 10 ? '0' + nextYr : nextYr}`;
  } else {
    const prevYr = year - 1;
    const currYrShort = year % 100;
    return `${prevYr}-${currYrShort < 10 ? '0' + currYrShort : currYrShort}`;
  }
};

const getStartYear = (fy: string) => {
  const match = fy.match(/^(\d{4})/);
  return match ? parseInt(match[1]) : 0;
};

const areFinancialYearsEqual = (fy1: string, fy2: string) => {
  if (!fy1 || !fy2) return false;
  return getStartYear(fy1) === getStartYear(fy2);
};

const getApplicableCostsForMember = (costs: any[], member: any) => {
  if (!member) return [];
  const regFY = member.registrationYear || (member.createdAt ? getFinancialYear(member.createdAt) : '');
  const regStartYear = getStartYear(regFY);
  if (!regStartYear) return [];

  const uniqueYears = Array.from(new Set(costs.map(c => c.financialYear)))
    .filter(fy => getStartYear(fy) >= regStartYear);

  const useCommon = member.useCommonMaintenance;
  const resType = member.residenceType || 'COMMON';
  const bhk = member.bhk || 'COMMON';

  const applicable: any[] = [];
  for (const fy of uniqueYears) {
    let costResType = 'COMMON';
    let costBhk = 'COMMON';
    if (!useCommon) {
      costResType = resType;
      costBhk = bhk;
    }

    let cost = costs.find(c =>
      c.financialYear === fy &&
      c.residenceType === costResType &&
      c.bhk === costBhk
    );

    if (cost) {
      applicable.push(cost);
    }
  }
  return applicable;
};

const getMonthsForFinancialYear = (fy: string) => {
  const startYr = getStartYear(fy);
  const endYr = startYr + 1;
  return [
    { name: 'April', monthIndex: 3, year: startYr },
    { name: 'May', monthIndex: 4, year: startYr },
    { name: 'June', monthIndex: 5, year: startYr },
    { name: 'July', monthIndex: 6, year: startYr },
    { name: 'August', monthIndex: 7, year: startYr },
    { name: 'September', monthIndex: 8, year: startYr },
    { name: 'October', monthIndex: 9, year: startYr },
    { name: 'November', monthIndex: 10, year: startYr },
    { name: 'December', monthIndex: 11, year: startYr },
    { name: 'January', monthIndex: 0, year: endYr },
    { name: 'February', monthIndex: 1, year: endYr },
    { name: 'March', monthIndex: 2, year: endYr },
  ];
};

const isMonthCoveredByPayment = (payment: any, year: number, monthIndex: number) => {
  if (payment.status === 'CANCELLED') return false;
  if (payment.periodLabel === 'Initial Onboarding Fee') return false;

  if (payment.coverageStartDate && payment.coverageEndDate) {
    const start = new Date(payment.coverageStartDate);
    const end = new Date(payment.coverageEndDate);
    
    // Check if the target month [firstDay, lastDay] overlaps with [start, end]
    const firstDayOfTarget = new Date(year, monthIndex, 1);
    const lastDayOfTarget = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    
    return start <= lastDayOfTarget && end >= firstDayOfTarget;
  }

  // Fallback: Check if payment date month matches
  const payDate = new Date(payment.paymentDate);
  return payDate.getFullYear() === year && payDate.getMonth() === monthIndex;
};

const MemberEvents = ({ token }: { token: string | null }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
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
    fetchEvents();
  }, [token]);

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Calendar size={20} style={{ color: 'var(--primary)' }} /> Society Events & Meetings
      </h3>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading events...</p>
      ) : events.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.5rem' }}>
          No upcoming events or meetings scheduled.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {events.map((event: any) => {
            const dateObj = new Date(event.eventDate);
            return (
              <div key={event.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '0.75rem', border: '1px solid var(--border-color)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem' }}>
                    {dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{event.title}</h4>
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

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const MemberPortal = () => {
  const { logout, token, user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [maintenanceCosts, setMaintenanceCosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  // Online payment state variables
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFrequency, setPaymentFrequency] = useState<'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'custom'>('monthly');
  const [customMonths, setCustomMonths] = useState(1);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isTestPaymentProcessing, setIsTestPaymentProcessing] = useState(false);
  const [manualAmount, setManualAmount] = useState('');

  const toggleYear = (yearId: string) => {
    setExpandedYears(prev => ({ ...prev, [yearId]: !prev[yearId] }));
  };

  const getCalculatedAmount = () => {
    if (!memberInfo) return { base: 0, final: 0, discount: 0, lateFee: 0, monthsCount: 1 };
    
    // Find current monthly cost
    const regFY = memberInfo.registrationYear || (memberInfo.createdAt ? getFinancialYear(memberInfo.createdAt) : '');
    const applicableCosts = getApplicableCostsForMember(maintenanceCosts, memberInfo);
    const matchedCost = applicableCosts.find((c: any) => areFinancialYearsEqual(c.financialYear, regFY));
    const monthlyCost = matchedCost ? Math.round(matchedCost.amount / 12) : Math.round(memberInfo.tenant?.maintenanceAmount || 0);

    let baseAmount = 0;
    let monthsCount = 1;

    switch (paymentFrequency) {
      case 'monthly':
        baseAmount = monthlyCost;
        monthsCount = 1;
        break;
      case 'quarterly':
        baseAmount = memberInfo.tenant?.quarterlyAmount || (monthlyCost * 3);
        monthsCount = 3;
        break;
      case 'half_yearly':
        baseAmount = memberInfo.tenant?.halfYearlyAmount || (monthlyCost * 6);
        monthsCount = 6;
        break;
      case 'annual':
        baseAmount = memberInfo.tenant?.annualAmount || (monthlyCost * 12);
        monthsCount = 12;
        break;
      case 'custom':
        baseAmount = monthlyCost * customMonths;
        monthsCount = customMonths;
        break;
    }

    // Check early bird discount - applies if today is on or before discountDate
    let discount = 0;
    if (memberInfo.tenant?.discountDate && memberInfo.tenant?.discountAmount) {
      const deadline = new Date(memberInfo.tenant.discountDate);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() <= deadline) {
        discount = memberInfo.tenant.discountAmount;
      }
    }

    // Check late fee - applies if today is past lateFeeDate
    let lateFee = 0;
    if (memberInfo.tenant?.lateFeeDate && memberInfo.tenant?.lateFeeAmount) {
      const deadline = new Date(memberInfo.tenant.lateFeeDate);
      deadline.setHours(23, 59, 59, 999);
      if (new Date() > deadline) {
        lateFee = memberInfo.tenant.lateFeeAmount * monthsCount;
      }
    }

    // If manual amount is entered, use it as the final amount (override)
    const parsedManual = parseFloat(manualAmount);
    const finalAmount = !isNaN(parsedManual) && parsedManual > 0
      ? parsedManual
      : Math.max(0, baseAmount + lateFee - discount);

    return { base: baseAmount, final: finalAmount, discount, lateFee, monthsCount };
  };

  const handleTestPaymentDone = async () => {
    const { final, discount, lateFee, monthsCount } = getCalculatedAmount();
    if (final <= 0) {
      showToast("Payment amount must be greater than 0", "error");
      return;
    }

    setIsTestPaymentProcessing(true);

    try {
      // Calculate coverage date range
      let start = memberInfo.paidUntil ? new Date(memberInfo.paidUntil) : new Date();
      if (!memberInfo.paidUntil) {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      }
      const end = new Date(start);
      end.setMonth(end.getMonth() + monthsCount);
      end.setDate(0);

      const periodLabel = paymentFrequency === 'monthly' ? 'Monthly'
        : paymentFrequency === 'quarterly' ? 'Quarterly'
        : paymentFrequency === 'half_yearly' ? 'Half-Yearly'
        : paymentFrequency === 'annual' ? 'Annual'
        : `Custom (${monthsCount} Months)`;

      const isUsingManual = !!(manualAmount && parseFloat(manualAmount) > 0);

      await axios.post('/payments/razorpay/test-payment-done', {
        amount: final,
        lateFee: isUsingManual ? 0 : lateFee,
        discount: isUsingManual ? 0 : discount,
        periodLabel,
        paidMonths: monthsCount,
        coverageStartDate: start.toISOString(),
        coverageEndDate: end.toISOString(),
        memberId: memberInfo.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast("✅ Payment recorded successfully! Treasurer has been notified.", "success");

      // Refresh member profile data
      const profileRes = await axios.get('/members/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMemberInfo(profileRes.data);
      setManualAmount('');
      setShowPaymentModal(false);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Error recording test payment", "error");
    } finally {
      setIsTestPaymentProcessing(false);
    }
  };

  const handleOnlinePayment = async () => {
    const { final, monthsCount, lateFee, discount } = getCalculatedAmount();
    if (final <= 0) {
      showToast("Payment amount must be greater than 0", "error");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Create Order in backend
      const orderRes = await axios.post('/payments/razorpay/order', { amount: final }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Load Razorpay checkout script
      const rzpLoaded = await loadRazorpay();
      if (!rzpLoaded) {
        showToast("Razorpay gateway failed to load. Please check your internet connection.", "error");
        setIsProcessingPayment(false);
        return;
      }

      // Calculate coverage date range
      let start = memberInfo.paidUntil ? new Date(memberInfo.paidUntil) : new Date();
      if (!memberInfo.paidUntil) {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
      } else {
        start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      }
      
      const end = new Date(start);
      end.setMonth(end.getMonth() + monthsCount);
      end.setDate(0); // Set to last day of previous month

      const periodLabel = paymentFrequency === 'monthly' ? 'Monthly'
        : paymentFrequency === 'quarterly' ? 'Quarterly'
        : paymentFrequency === 'half_yearly' ? 'Half-Yearly'
        : paymentFrequency === 'annual' ? 'Annual'
        : `Custom (${monthsCount} Months)`;

      const isUsingManual = !!(manualAmount && parseFloat(manualAmount) > 0);

      const options = {
        key: orderRes.data.key_id,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: user?.tenantName || "Society Management",
        description: `Maintenance - ${periodLabel}`,
        order_id: orderRes.data.id,
        handler: async (response: any) => {
          try {
            showToast("Verifying payment transaction...", "info");
            await axios.post('/payments/razorpay/verify', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              amount: final,
              lateFee: isUsingManual ? 0 : lateFee,
              discount: isUsingManual ? 0 : discount,
              periodLabel,
              paidMonths: monthsCount,
              coverageStartDate: start.toISOString(),
              coverageEndDate: end.toISOString(),
              memberId: memberInfo.id
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });

            showToast("Online Payment Successful!", "success");
            
            // Refresh member profile data
            const profileRes = await axios.get('/members/profile', {
              headers: { Authorization: `Bearer ${token}` }
            });
            setMemberInfo(profileRes.data);
            setShowPaymentModal(false);
          } catch (err: any) {
            console.error(err);
            showToast(err.response?.data?.message || "Payment verification failed", "error");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        prefill: {
          name: memberInfo.name,
          email: memberInfo.email || "",
          contact: memberInfo.mobile || ""
        },
        theme: {
          color: "#7c3aed"
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          }
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || "Error initiating online payment", "error");
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await axios.get('/members/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMemberInfo(profileRes.data);
      } catch (err) {
        console.error("Error fetching profile", err);
      }

      try {
        const costsRes = await axios.get('/maintenance-costs', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMaintenanceCosts(costsRes.data);
      } catch (err) {
        console.error("Error fetching maintenance costs", err);
      }

      setLoading(false);
    };
    if (token) {
      fetchData();
    }
  }, [token]);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': {
        const regFY = memberInfo?.registrationYear || (memberInfo?.createdAt ? getFinancialYear(memberInfo.createdAt) : '');
        const applicableCosts = getApplicableCostsForMember(maintenanceCosts, memberInfo);
        const matchedCost = applicableCosts.find((c: any) => areFinancialYearsEqual(c.financialYear, regFY));
        const annualCostLabel = matchedCost ? `₹${matchedCost.amount.toLocaleString()}` : 'Not Configured';
        const subtext = regFY ? `For FY ${regFY} (Registration Year)` : 'No registration year';

        const memberHistoryCosts = applicableCosts;

        const dueMonthsList: string[] = [];
        memberHistoryCosts.forEach((c: any) => {
          const months = getMonthsForFinancialYear(c.financialYear);
          months.forEach((month) => {
            const isMonthPaid = memberInfo?.payments?.some((p: any) => 
              isMonthCoveredByPayment(p, month.year, month.monthIndex)
            );
            if (!isMonthPaid) {
              dueMonthsList.push(`${month.name} ${month.year}`);
            }
          });
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card" style={{ borderLeft: '4px solid var(--primary)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t('member.hello')}, {user?.name}!</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{t('member.welcome')} <strong>{user?.tenantName}</strong>.</p>
                </div>
                <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '1rem', borderRadius: '1rem' }}>
                  <Building size={32} />
                </div>
              </div>
            </div>

            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: '0.5rem', backgroundColor: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
                    <CreditCard size={20} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('member.current_dues')}</span>
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: (memberInfo?.outstandingDues || 0) > 0 ? 'var(--error)' : 'var(--success)' }}>
                  ₹{Math.max(0, memberInfo?.outstandingDues || 0).toLocaleString()}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {(memberInfo?.outstandingDues || 0) > 0 ? (
                    <span>
                      Please pay at the society office or{" "}
                      <span onClick={() => setShowPaymentModal(true)} style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
                        {t('member.pay_online')}
                      </span>.
                    </span>
                  ) : (
                    t('member.no_dues')
                  )}
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}>
                    <Clock size={20} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('member.due_months')}</span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 600, maxHeight: '80px', overflowY: 'auto', color: 'var(--error)' }}>
                  {dueMonthsList.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {dueMonthsList.map((m) => (
                        <span key={m} style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                          {m}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--success)' }}>{t('member.all_paid')}</span>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {dueMonthsList.length > 0 ? `${dueMonthsList.length} ${t('member.pending_months')}` : t('member.no_pending')}
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                    <User size={20} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('member.flat_details')}</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {t('member.unit')} {memberInfo?.flatNo || 'N/A'}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {user?.tenantName}
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ padding: '0.6rem', borderRadius: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                    <History size={20} />
                  </div>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{t('member.annual_cost')}</span>
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  {annualCostLabel}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  {subtext}
                </p>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem' }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <button className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', alignItems: 'center' }} onClick={() => setActiveTab('helpdesk')}>
                  <LifeBuoy size={24} />
                  <span>Raise Helpdesk Ticket</span>
                </button>
                <button className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', alignItems: 'center' }} onClick={() => setActiveTab('payments')}>
                  <History size={24} />
                  <span>View Payment History</span>
                </button>
                <button className="btn btn-secondary" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', alignItems: 'center' }} onClick={() => setActiveTab('events')}>
                  <Calendar size={24} />
                  <span>View Society Events</span>
                </button>
                <button className="btn btn-primary" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.5rem', alignItems: 'center' }} onClick={() => setShowPaymentModal(true)}>
                  <CreditCard size={24} />
                  <span>Pay Maintenance Online</span>
                </button>
              </div>
            </div>
          </div>
        );
      }
      case 'dues-history': {
        const applicableCosts = getApplicableCostsForMember(maintenanceCosts, memberInfo);
        const memberHistoryCosts = applicableCosts;

        return (
          <div className="card">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} style={{ color: 'var(--primary)' }} /> Maintenance Dues History
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                    <th style={{ width: '40px' }}></th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>FINANCIAL YEAR</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>ANNUAL MAINTENANCE COST</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'right' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {memberHistoryCosts.map((c: any) => {
                    const isPaid = memberInfo?.payments?.some((p: any) => 
                      p.status !== 'CANCELLED' && 
                      p.periodLabel !== 'Initial Onboarding Fee' && 
                      areFinancialYearsEqual(getFinancialYear(p.paymentDate), c.financialYear)
                    );
                    const isExpanded = !!expandedYears[c.id];
                    const months = getMonthsForFinancialYear(c.financialYear);
                    const monthlyCost = Math.round(c.amount / 12);

                    return (
                      <React.Fragment key={c.id}>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }} onClick={() => toggleYear(c.id)}>
                          <td style={{ padding: '1rem', textAlign: 'center' }}>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 600 }}>FY {c.financialYear}</td>
                          <td style={{ padding: '1rem', fontSize: '0.875rem' }}>₹{c.amount.toLocaleString()}</td>
                          <td style={{ padding: '1rem', textAlign: 'right' }}>
                            {isPaid ? (
                              <span className="badge badge-success">Paid</span>
                            ) : (
                              <span className="badge badge-error">Due</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={4} style={{ padding: '1rem 2rem', backgroundColor: 'var(--bg-secondary)' }}>
                              <div style={{ marginBottom: '0.5rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                Monthly Fee Breakdown (₹{monthlyCost.toLocaleString()} / month)
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                                {months.map((month) => {
                                  const isMonthPaid = memberInfo?.payments?.some((p: any) => 
                                    isMonthCoveredByPayment(p, month.year, month.monthIndex)
                                  );
                                  return (
                                    <div key={month.name} style={{
                                      padding: '0.75rem',
                                      borderRadius: '0.5rem',
                                      backgroundColor: 'var(--bg-primary)',
                                      border: '1px solid var(--border-color)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.25rem'
                                    }}>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {month.name} {month.year}
                                      </div>
                                      <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                                        ₹{monthlyCost.toLocaleString()}
                                      </div>
                                      <div style={{ marginTop: '0.25rem' }}>
                                        {isMonthPaid ? (
                                          <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Paid</span>
                                        ) : (
                                          <span className="badge badge-error" style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem' }}>Due</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {memberHistoryCosts.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No maintenance cost history available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      }
      case 'helpdesk':
        return <MemberHelpdesk token={token} />;
      case 'payments':
        return <MemberPayments memberInfo={memberInfo} user={user} />;
      case 'receipts':
        return <MemberReceipts memberInfo={memberInfo} user={user} />;
      case 'profile':
        return <MemberProfileTab memberInfo={memberInfo} setMemberInfo={setMemberInfo} token={token} />;
      case 'events':
        return <MemberEvents token={token} />;
      default:
        return null;
    }
  };

  if (loading) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading Portal...</div>;

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Building size={20} style={{ color: 'var(--primary)' }} />
          <span style={{ fontWeight: 700 }}>{user?.tenantName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LanguageSwitcher />
          <NotificationPanel token={token} />
          <button onClick={() => setIsSidebarOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.25rem' }}>
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar Backdrop */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <Building size={24} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1.125rem' }}>{user?.tenantName}</span>
        </div>

        <nav style={{ flex: 1 }}>
          <a href="#" className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => { setActiveTab('overview'); setIsSidebarOpen(false); }}>
            <LayoutDashboard size={20} /> {t('nav.home')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'dues-history' ? 'active' : ''}`} onClick={() => { setActiveTab('dues-history'); setIsSidebarOpen(false); }}>
            <Clock size={20} /> {t('nav.dues_history')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => { setActiveTab('payments'); setIsSidebarOpen(false); }}>
            <History size={20} /> {t('nav.payment_history')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'receipts' ? 'active' : ''}`} onClick={() => { setActiveTab('receipts'); setIsSidebarOpen(false); }}>
            <FileText size={20} /> {t('nav.receipts')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'events' ? 'active' : ''}`} onClick={() => { setActiveTab('events'); setIsSidebarOpen(false); }}>
            <Calendar size={20} /> {t('nav.events')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'helpdesk' ? 'active' : ''}`} onClick={() => { setActiveTab('helpdesk'); setIsSidebarOpen(false); }}>
            <LifeBuoy size={20} /> {t('nav.helpdesk')}
          </a>
          <a href="#" className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => { setActiveTab('profile'); setIsSidebarOpen(false); }}>
            <User size={20} /> {t('nav.my_profile')}
          </a>
        </nav>

        <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', width: '100%', color: 'var(--error)', cursor: 'pointer' }}>
            <LogOut size={20} /> {t('header.logout')}
          </button>
        </div>
      </div>

      <div className="main-content">
        <header className="dashboard-header">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{t('header.resident_portal')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user?.tenantName} • {t('member.flat')} {memberInfo?.flatNo}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <LanguageSwitcher />
            <NotificationPanel token={token} />
            <div 
              onClick={() => setActiveTab('profile')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.4rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
              className="desktop-only"
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--primary)', backgroundColor: 'var(--bg-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {memberInfo?.photoUrl ? (
                  <img src={memberInfo.photoUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={16} style={{ color: 'var(--text-secondary)' }} />
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', paddingRight: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{user?.name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Flat {memberInfo?.flatNo}</span>
              </div>
            </div>
          </div>
        </header>

        {renderContent()}
      </div>

      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          {/* ===== REDESIGNED PREMIUM PAYMENT MODAL ===== */}
          <div style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            borderRadius: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-primary)',
            animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>

            {/* ── Header ── */}
            <div style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
              padding: '1.75rem 1.75rem 1.5rem',
              position: 'relative',
              flexShrink: 0
            }}>
              <button
                onClick={() => { setShowPaymentModal(false); setManualAmount(''); }}
                style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255, 255, 255, 0.15)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              >
                <X size={16} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.18)', borderRadius: '0.75rem', padding: '0.6rem', display: 'flex', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                  <CreditCard size={24} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, color: '#fff', fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Pay Maintenance</h2>
                  <p style={{ margin: '0.15rem 0 0', color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.82rem', fontWeight: 500 }}>{user?.tenantName} · Flat {memberInfo?.flatNo}</p>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem', overflowY: 'auto' }} className="custom-scrollbar">

              {/* Plan Selector */}
              <div>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>1. Select Payment Plan</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.65rem' }}>
                  {[
                    { key: 'monthly', label: 'Monthly', sub: '1 Month' },
                    { key: 'quarterly', label: 'Quarterly', sub: '3 Months' },
                    { key: 'half_yearly', label: 'Half-Yearly', sub: '6 Months' },
                    { key: 'annual', label: 'Annual', sub: '12 Months' },
                  ].map(plan => {
                    const isActive = paymentFrequency === plan.key;
                    return (
                      <button
                        key={plan.key}
                        type="button"
                        onClick={() => setPaymentFrequency(plan.key as any)}
                        style={{
                          padding: '0.85rem 0.6rem',
                          borderRadius: '0.85rem',
                          border: isActive ? '2px solid #6366f1' : '1.5px solid var(--border-color)',
                          background: isActive ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.2rem',
                          transition: 'all 0.2s',
                          boxShadow: isActive ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isActive ? '#6366f1' : 'var(--text-primary)' }}>{plan.label}</span>
                        <span style={{ fontSize: '0.72rem', color: isActive ? '#6366f1' : 'var(--text-secondary)', opacity: 0.85 }}>{plan.sub}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={() => setPaymentFrequency('custom')}
                  style={{
                    marginTop: '0.65rem',
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '0.85rem',
                    border: paymentFrequency === 'custom' ? '2px solid #6366f1' : '1.5px solid var(--border-color)',
                    background: paymentFrequency === 'custom' ? 'rgba(99, 102, 241, 0.05)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: paymentFrequency === 'custom' ? '#6366f1' : 'var(--text-primary)',
                    transition: 'all 0.2s',
                    boxShadow: paymentFrequency === 'custom' ? '0 4px 12px rgba(99, 102, 241, 0.08)' : 'none'
                  }}
                >
                  Custom Months Plan
                </button>
                {paymentFrequency === 'custom' && (
                  <div style={{ marginTop: '0.75rem', animation: 'fadeIn 0.2s ease' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Number of Months to Pay</label>
                    <select
                      value={customMonths}
                      onChange={(e) => setCustomMonths(parseInt(e.target.value))}
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem', outline: 'none' }}
                    >
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'Month' : 'Months'}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Custom Amount Override */}
              <div>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>2. Enter Custom Amount <span style={{ fontWeight: 400, textTransform: 'none', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>(Optional)</span></p>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '1.05rem', pointerEvents: 'none' }}>₹</span>
                  <input
                    type="number"
                    min="1"
                    placeholder="Leave blank to use calculated amount"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    style={{ width: '100%', paddingLeft: '2.2rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', borderRadius: '0.75rem', border: `1.5px solid ${manualAmount && parseFloat(manualAmount) > 0 ? '#6366f1' : 'var(--border-color)'}`, backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.95rem', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                  />
                </div>
                {manualAmount && parseFloat(manualAmount) > 0 && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>✓ Custom override active. You will pay ₹{parseFloat(manualAmount).toLocaleString()}</p>
                )}
              </div>

              {/* Fee Breakdown Card */}
              {(() => {
                const { base, final, discount, lateFee, monthsCount } = getCalculatedAmount();
                
                let start = memberInfo?.paidUntil ? new Date(memberInfo.paidUntil) : new Date();
                if (isNaN(start.getTime())) {
                  start = new Date();
                }
                if (!memberInfo?.paidUntil) {
                  start.setDate(1);
                  start.setHours(0, 0, 0, 0);
                } else {
                  start = new Date(start.getFullYear(), start.getMonth() + 1, 1);
                }
                if (isNaN(start.getTime())) {
                  start = new Date();
                  start.setDate(1);
                  start.setHours(0, 0, 0, 0);
                }

                const end = new Date(start);
                end.setMonth(end.getMonth() + monthsCount);
                end.setDate(0);

                const fmt = (d: Date) => {
                  if (!d || isNaN(d.getTime())) return 'N/A';
                  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                };

                const isUsingManual = !!(manualAmount && parseFloat(manualAmount) > 0);

                return (
                  <div style={{ borderRadius: '1rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', display: 'block', width: '100%', boxSizing: 'border-box' }}>
                    {/* Card Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)' }}>Payment Summary Details</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1', background: 'rgba(99, 102, 241, 0.08)', padding: '0.25rem 0.6rem', borderRadius: '2rem' }}>{fmt(start)} to {fmt(end)}</span>
                    </div>

                    {/* Text Boxes Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1.25rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Base Maintenance Rate</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={`₹${base.toLocaleString()}`} 
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'default' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Late Fee</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={lateFee > 0 && !isUsingManual ? `₹${lateFee.toLocaleString()}` : '₹0'} 
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: lateFee > 0 && !isUsingManual ? '#dc2626' : 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'default' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Early Bird Discount</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={discount > 0 && !isUsingManual ? `₹${discount.toLocaleString()}` : '₹0'} 
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: discount > 0 && !isUsingManual ? '#059669' : 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600, outline: 'none', cursor: 'default' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Total Payable Amount</label>
                        <input 
                          type="text" 
                          readOnly 
                          value={`₹${final.toLocaleString()}`} 
                          style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '0.6rem', border: '1.5px solid #6366f1', backgroundColor: 'var(--bg-primary)', color: '#6366f1', fontSize: '0.9rem', fontWeight: 700, outline: 'none', cursor: 'default' }}
                        />
                      </div>
                    </div>

                    {/* Alert banners inside Card */}
                    {lateFee > 0 && !isUsingManual && (
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
                        <span style={{ fontSize: '0.75rem', color: '#b91c1c', lineHeight: 1.4, fontWeight: 500 }}>
                          A late fee of ₹{lateFee.toLocaleString()} has been added because today is past the due date of {memberInfo?.tenant?.lateFeeDate ? new Date(memberInfo.tenant.lateFeeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}.
                        </span>
                      </div>
                    )}
                    {discount > 0 && !isUsingManual && (
                      <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '0.5rem', padding: '0.65rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>🎉</span>
                        <span style={{ fontSize: '0.75rem', color: '#065f46', lineHeight: 1.4, fontWeight: 500 }}>
                          You qualify for an early bird discount of ₹{discount.toLocaleString()}! Offer valid till {memberInfo?.tenant?.discountDate ? new Date(memberInfo.tenant.discountDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── Test Mode Button ── */}
              <div style={{ borderRadius: '1rem', border: '1.5px dashed #d97706', background: 'rgba(245, 158, 11, 0.03)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.85rem' }}>⚠️</span> TEST MODE ONLY
                </div>
                <button
                  type="button"
                  onClick={handleTestPaymentDone}
                  disabled={isTestPaymentProcessing || isProcessingPayment}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '0.6rem',
                    border: '1.5px solid #d97706',
                    background: isTestPaymentProcessing ? '#fef3c7' : '#fffbeb',
                    color: '#b45309',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: isTestPaymentProcessing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { if (!isTestPaymentProcessing) e.currentTarget.style.background = '#fef3c7'; }}
                  onMouseLeave={e => { if (!isTestPaymentProcessing) e.currentTarget.style.background = '#fffbeb'; }}
                >
                  {isTestPaymentProcessing ? '⏳ Recording test payment...' : '✓ Payment Done (Test Mode)'}
                </button>
                <p style={{ margin: 0, fontSize: '0.7rem', color: '#b45309', opacity: 0.8, textAlign: 'center' }}>Skips Razorpay — directly records payment &amp; notifies treasurer</p>
              </div>

              {/* ── Razorpay Button ── */}
              <button
                type="button"
                onClick={handleOnlinePayment}
                disabled={isProcessingPayment || isTestPaymentProcessing}
                style={{
                  width: '100%',
                  padding: '0.95rem',
                  borderRadius: '0.9rem',
                  border: 'none',
                  background: isProcessingPayment ? 'linear-gradient(135deg, #9ca3af, #d1d5db)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: isProcessingPayment ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.65rem',
                  boxShadow: isProcessingPayment ? 'none' : '0 10px 25px -5px rgba(99, 102, 241, 0.45)',
                  transition: 'all 0.2s',
                  letterSpacing: '-0.01em'
                }}
                onMouseEnter={e => { if (!isProcessingPayment) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px -5px rgba(99, 102, 241, 0.55)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = isProcessingPayment ? 'none' : '0 10px 25px -5px rgba(99, 102, 241, 0.45)'; }}
              >
                <CreditCard size={20} />
                {isProcessingPayment ? 'Processing Securely...' : 'Pay Online with Razorpay'}
              </button>

              <p style={{ margin: 0, textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', opacity: 0.85 }}>
                <span>🔒</span> Secured by Razorpay · 256-bit SSL Encryption
              </p>

            </div>{/* end body */}
          </div>{/* end modal card */}
        </div>
      )}
    </div>
  );
};

export default MemberPortal;
