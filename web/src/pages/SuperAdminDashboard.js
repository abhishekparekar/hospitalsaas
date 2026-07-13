import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { seedDoctorData } from '../services/seedData';

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportTickets, setSupportTickets] = useState([]);
  
  // Register simulated doctor state
  const [simEmail, setSimEmail] = useState('');
  const [simPassword, setSimPassword] = useState('');
  const [simSlug, setSimSlug] = useState('');
  const [simSuccess, setSimSuccess] = useState(false);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const snap = await getDocs(collection(db, 'tenants'));
        setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      }
    };

    const unsubTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
      setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
      setLoading(false);
    });

    fetchTenants();

    return () => {
      unsubTickets();
    };
  }, [simSuccess]);

  const handleSimSeed = async (e) => {
    e.preventDefault();
    if (!simSlug.trim()) return;
    const cleanSlug = simSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      // Create user auth
      const res = await createUserWithEmailAndPassword(auth, simEmail, simPassword);
      const uid = res.user.uid;

      // Seed
      await seedDoctorData(uid, cleanSlug);

      setSimSuccess(true);
      setSimEmail('');
      setSimPassword('');
      setSimSlug('');
      setTimeout(() => setSimSuccess(false), 3000);
    } catch (err) {
      alert('Simulation seeding failed: ' + err.message);
    }
  };

  const handleStatusChange = async (tid, newStatus) => {
    try {
      await updateDoc(doc(db, 'tenants', tid), { status: newStatus });
      setTenants(tenants.map(t => t.id === tid ? { ...t, status: newStatus } : t));
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleTicketStatus = async (ticketId, nextStatus) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: nextStatus });
    } catch (err) {
      alert('Failed to update ticket status');
    }
  };

  const impersonateTenant = (tid) => {
    localStorage.setItem('impersonate_tenant_id', tid);
    window.location.href = '/admin/dashboard';
  };

  const isExpiringSoon = (expiryTimestamp) => {
    if (!expiryTimestamp) return false;
    const expiry = expiryTimestamp.seconds * 1000;
    const diff = expiry - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
        <span className="animate-pulse">Opening Platform HQ Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 sm:p-16 space-y-12">
      <header className="flex justify-between items-center border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">iCoded HQ Control Board</h1>
          <p className="text-xs text-slate-400">Platform-wide statistics and client tenant accounts management</p>
        </div>
        <Link to="/" className="text-sm font-semibold text-emerald-400 hover:underline">← Back to Portal Home</Link>
      </header>

      {/* Stats summary */}
      <div className="grid sm:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <span className="text-slate-500 text-xs font-bold uppercase">Total Tenants</span>
          <span className="text-3xl font-black text-white block mt-2">{tenants.length}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <span className="text-slate-500 text-xs font-bold uppercase">Active Sites</span>
          <span className="text-3xl font-black text-emerald-400 block mt-2">
            {tenants.filter(t => t.status === 'active').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <span className="text-slate-500 text-xs font-bold uppercase">Suspended Sites</span>
          <span className="text-3xl font-black text-rose-500 block mt-2">
            {tenants.filter(t => t.status === 'suspended').length}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <span className="text-slate-500 text-xs font-bold uppercase">Estimated ARR</span>
          <span className="text-3xl font-black text-white block mt-2">
            ₹{tenants.filter(t => t.status === 'active').length * 7999}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Register client panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white">1-Click Client Onboarding</h3>
            <p className="text-xs text-slate-400 mt-1">Registers doctor and seeds realistic profile data instantly</p>
          </div>

          {simSuccess && (
            <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 p-3 rounded-lg text-xs font-bold">
              Account created! Seed values injected to Firestore.
            </div>
          )}

          <form onSubmit={handleSimSeed} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">DOCTOR SLUG NAME</label>
              <input 
                type="text" 
                value={simSlug}
                onChange={e => setSimSlug(e.target.value)}
                required
                placeholder="dr-patil-csn"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">CLIENT LOGIN EMAIL</label>
              <input 
                type="email" 
                value={simEmail}
                onChange={e => setSimEmail(e.target.value)}
                required
                placeholder="client@gmail.com"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 block mb-1">TEMPORARY PASSWORD</label>
              <input 
                type="password" 
                value={simPassword}
                onChange={e => setSimPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-850 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded text-xs transition">
              Onboard & Seed Database
            </button>
          </form>
        </div>

        {/* Tenant list table */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-8">
          <div>
            <h3 className="text-lg font-bold text-white">Active Tenants</h3>
            <p className="text-xs text-slate-400">Suspend, activate, or impersonate client dashboard sessions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-left">
                  <th className="py-3">Slug</th>
                  <th className="py-3">Billing Plan</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Expiry</th>
                  <th className="py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-slate-300">
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td className="py-3 font-semibold text-white">
                      <a href={`/${t.tenant_slug}`} target="_blank" rel="noreferrer" className="hover:underline text-emerald-400">
                        {t.tenant_slug}
                      </a>
                    </td>
                    <td className="py-3 uppercase">{t.plan}</td>
                    <td className="py-3">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${t.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3">
                      {isExpiringSoon(t.plan_expiry) ? (
                        <span className="text-amber-500 font-bold bg-amber-950/60 px-1 py-0.5 border border-amber-900 rounded text-[10px]">⚠️ EXPIRING SOON</span>
                      ) : (
                        <span className="text-slate-400">{t.plan_expiry ? new Date(t.plan_expiry.seconds * 1000).toLocaleDateString() : 'N/A'}</span>
                      )}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button 
                        onClick={() => impersonateTenant(t.id)} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-semibold transition"
                      >
                        Impersonate
                      </button>
                      {t.status === 'active' ? (
                        <button onClick={() => handleStatusChange(t.id, 'suspended')} className="bg-rose-950/80 border border-rose-900 text-rose-400 px-2 py-1 rounded hover:bg-rose-900/40 font-semibold transition">
                          Suspend
                        </button>
                      ) : (
                        <button onClick={() => handleStatusChange(t.id, 'active')} className="bg-emerald-950/80 border border-emerald-900 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-900/40 font-semibold transition">
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mt-12 border-t border-slate-900 pt-12">
        {/* Support Tickets Queue */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white">Client Support Ticket Queue</h3>
          {supportTickets.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">No client tickets logged.</p>
          ) : (
            <div className="divide-y divide-slate-850 text-xs">
              {supportTickets.map(tk => (
                <div key={tk.id} className="py-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block text-sm">{tk.subject}</span>
                      <span className="text-[10px] text-slate-400">From: {tk.doctor_name} ({tk.email})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tk.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'}`}>
                        {tk.status}
                      </span>
                      {tk.status === 'pending' && (
                        <button 
                          onClick={() => handleTicketStatus(tk.id, 'resolved')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-bold text-[10px] transition"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-300 bg-slate-950 p-3 border border-slate-850 rounded leading-relaxed">{tk.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expiry alerts and Plan Distribution stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-lg font-bold text-white">Expiry Warning Alerts (Next 30 Days)</h3>
          {tenants.filter(t => isExpiringSoon(t.plan_expiry)).length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">No tenants expiring soon.</p>
          ) : (
            <div className="space-y-3">
              {tenants.filter(t => isExpiringSoon(t.plan_expiry)).map(t => (
                <div key={t.id} className="bg-amber-950/20 border border-amber-900 p-4 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-amber-400 block">{t.tenant_slug}</span>
                    <span className="text-[10px] text-slate-500">Plan: {t.plan?.toUpperCase()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-white block">Expires: {new Date(t.plan_expiry.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 pt-6 space-y-3">
            <h4 className="font-bold text-white text-sm">Plan Tier Distribution Stats</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Basic</span>
                <span className="text-lg font-extrabold text-white">{tenants.filter(t => t.plan === 'basic').length}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Professional</span>
                <span className="text-lg font-extrabold text-emerald-400">{tenants.filter(t => t.plan === 'professional').length}</span>
              </div>
              <div className="bg-slate-950 border border-slate-850 p-3 rounded-lg">
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Pro+ Custom</span>
                <span className="text-lg font-extrabold text-blue-500">{tenants.filter(t => t.plan === 'pro_plus').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
