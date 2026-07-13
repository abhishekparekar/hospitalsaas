import React, { useState, useEffect } from 'react';

import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, onSnapshot, doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

const PLAN_PRICES = { basic: 4999, professional: 7999, pro_plus: 12999 };
const PLAN_LABELS = { basic: 'Basic', professional: 'Professional', pro_plus: 'Pro+ Custom' };

export default function SuperAdminDashboard() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supportTickets, setSupportTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('Doctors');
  const [simEmail, setSimEmail] = useState('');
  const [simPassword, setSimPassword] = useState('');
  const [simSlug, setSimSlug] = useState('');
  const [simPlan, setSimPlan] = useState('professional');
  const [simSuccess, setSimSuccess] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Authentication states for unified /superadmin login
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    let unsubTickets = () => {};
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const superAdminEmails = ['icoded@gmail.com', 'superadmin@clinicpage.in', 'admin@clinicpage.in'];
          const isSuperAdmin = superAdminEmails.includes(user.email?.toLowerCase());

          let matched = false;
          if (isSuperAdmin) {
            matched = true;
            try {
              await setDoc(doc(db, 'users', user.uid), {
                role: 'superadmin',
                email: user.email.toLowerCase(),
                name: 'Platform Super Admin'
              }, { merge: true });
            } catch (e) {
              console.warn("Could not write superadmin mapping:", e.message);
            }
          } else {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists() && userSnap.data().role === 'superadmin') {
              matched = true;
            }
          }

          if (matched) {
            setIsAuthenticated(true);
            
            const snap = await getDocs(collection(db, 'tenants'));
            setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            
            unsubTickets = onSnapshot(collection(db, 'support_tickets'), (snap) => {
              setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.created_at?.seconds - a.created_at?.seconds));
            });
          } else {
            await signOut(auth);
            setIsAuthenticated(false);
          }
        } catch (err) {
          console.error(err);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setCheckingAuth(false);
      setLoading(false);
    });

    return () => {
      unsubAuth();
      unsubTickets();
    };
  }, [simSuccess, isAuthenticated]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      const superAdminEmails = ['icoded@gmail.com', 'superadmin@clinicpage.in', 'admin@clinicpage.in'];
      const isSuperAdmin = superAdminEmails.includes(email.toLowerCase());

      let matched = false;
      if (isSuperAdmin) {
        matched = true;
        try {
          await setDoc(doc(db, 'users', uid), {
            role: 'superadmin',
            email: email.toLowerCase(),
            name: 'Platform Super Admin'
          }, { merge: true });
        } catch (e) {
          console.warn("Could not write superadmin mapping:", e.message);
        }
      } else {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().role === 'superadmin') {
          matched = true;
        }
      }

      if (matched) {
        setIsAuthenticated(true);
      } else {
        await signOut(auth);
        setError('Access denied. You do not have super admin privileges.');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setIsAuthenticated(false);
    sessionStorage.removeItem('sa_auth');
    sessionStorage.removeItem('user_role');
  };

  const handleSimSeed = async (e) => {
    e.preventDefault();
    if (!simSlug.trim()) return;
    const cleanSlug = simSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      const res = await createUserWithEmailAndPassword(auth, simEmail, simPassword);
      // 1. Create the tenant configuration document
      const tenantRef = doc(db, 'tenants', res.user.uid);
      await setDoc(tenantRef, {
        tenant_slug: cleanSlug,
        status: 'active',
        plan: simPlan,
        plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        owner_uid: res.user.uid,
        contact_email: simEmail,
        contact_phone: '',
        whatsapp_notify_enabled: false,
        callmebot_api_key: '',
        website_published: true,
        user_type: 'doctor'
      });

      // 2. Create the doctor's profile document with derived values
      const profileRef = doc(db, 'tenants', res.user.uid, 'profile', 'info');
      const derivedDoctorName = 'Dr. ' + simEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const derivedClinicName = cleanSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Clinic';
      
      await setDoc(profileRef, {
        doctor_name: derivedDoctorName,
        salutation: "Dr.",
        photo_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
        speciality: "Physician",
        tagline: "",
        degrees: [],
        registration_number: "",
        experience_years: 0,
        languages: ["English"],
        affiliations: [],
        bio: "",
        clinic_name: derivedClinicName,
        clinic_address: "",
        map_embed_url: "",
        phone: "",
        whatsapp_number: "",
        email: simEmail,
        theme_color: "#1e40af"
      });

      // 3. Create default timings config
      const timingsRef = doc(db, 'tenants', res.user.uid, 'timings', 'info');
      await setDoc(timingsRef, {
        mon: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
        tue: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
        wed: { open: "09:00", close: "13:00", second_open: null, second_close: null, closed: false },
        thu: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
        fri: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
        sat: { open: "09:00", close: "14:00", second_open: null, second_close: null, closed: false },
        sun: { open: null, close: null, second_open: null, second_close: null, closed: true },
        notice: "",
        appointment_duration_mins: 15
      });

      // 4. Create role metadata in the users collection (optional, catch error if permissions block it)
      try {
        const userDocRef = doc(db, 'users', res.user.uid);
        await setDoc(userDocRef, {
          role: 'doctor',
          tenant_id: res.user.uid,
          name: derivedDoctorName
        });
      } catch (err) {
        console.warn("Could not save to users collection:", err.message);
      }
      setCreatedCredentials({ email: simEmail, password: simPassword, slug: cleanSlug, plan: simPlan });
      setSimSuccess(true);
      setSimEmail(''); setSimPassword(''); setSimSlug(''); setSimPlan('professional');
      setTimeout(() => setSimSuccess(false), 8000);
    } catch (err) {
      alert('Doctor creation failed: ' + err.message);
    }
  };

  const handleStatusChange = async (tid, newStatus) => {
    try {
      await updateDoc(doc(db, 'tenants', tid), { status: newStatus });
      setTenants(tenants.map(t => t.id === tid ? { ...t, status: newStatus } : t));
    } catch (err) { alert('Update failed'); }
  };

  const handleTicketStatus = async (ticketId, nextStatus) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), { status: nextStatus });
    } catch (err) { alert('Failed to update ticket'); }
  };

  const impersonateTenant = (tid) => {
    localStorage.setItem('impersonate_tenant_id', tid);
    window.location.href = '/admin/dashboard';
  };

  const isExpiringSoon = (ts) => {
    if (!ts) return false;
    const diff = ts.seconds * 1000 - Date.now();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };
  const isExpired = (ts) => ts && ts.seconds * 1000 < Date.now();

  const totalRevenue = tenants.reduce((s, t) => s + (PLAN_PRICES[t.plan] || 0), 0);
  const activeCount = tenants.filter(t => t.status === 'active').length;
  const suspendedCount = tenants.filter(t => t.status === 'suspended').length;
  const expiringCount = tenants.filter(t => isExpiringSoon(t.plan_expiry)).length;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
        <span className="animate-pulse text-sm font-semibold">Checking credentials...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl space-y-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 p-2.5 rounded-xl font-black text-lg">SA</div>
            <span className="text-xl font-bold tracking-tight text-white">Super Admin Control</span>
          </div>

          {error && (
            <div className="bg-red-950/60 border border-red-800 text-red-400 p-3 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">SUPER ADMIN EMAIL</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="admin@clinicpage.in"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-12 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold transition focus:outline-none uppercase"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button disabled={loginLoading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black py-3 rounded-lg text-sm transition">
              {loginLoading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
      <span className="animate-pulse text-lg font-semibold">Loading HQ Control Board...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black text-sm">SA</div>
          <div>
            <h1 className="text-lg font-black text-white">iCoded HQ Control Board</h1>
            <p className="text-[10px] text-slate-500">Super Admin · Platform-wide Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-5 text-xs font-bold text-slate-400">
            <span>{tenants.length} Tenants</span>
            <span className="text-emerald-400">{activeCount} Active</span>
            {expiringCount > 0 && <span className="text-amber-400">{expiringCount} Expiring</span>}
          </div>
          <button 
            onClick={handleLogout} 
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 bg-slate-800 px-3 py-2 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
        <aside className="w-full lg:w-60 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            {[['Clients', tenants.length, 'text-white'], ['Active', activeCount, 'text-emerald-400'], ['Suspended', suspendedCount, 'text-rose-400'], ['Expiring', expiringCount, 'text-amber-400']].map(([label, val, color]) => (
              <div key={label} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-center">
                <span className={`text-2xl font-black block ${color}`}>{val}</span>
                <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
              </div>
            ))}
          </div>
          <nav className="flex flex-row lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 lg:space-y-1 w-full">
            {['Doctors', 'Revenue', 'Support'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 lg:flex-shrink-1 w-auto lg:w-full text-left px-4 py-3 rounded-lg text-sm font-semibold transition flex items-center justify-between gap-4 ${activeTab === tab ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <span>{tab}</span>
                {tab === 'Support' && supportTickets.filter(t => t.status === 'pending').length > 0 && (
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${activeTab === 'Support' ? 'bg-slate-950/40 text-slate-950' : 'bg-rose-500 text-white'}`}>
                    {supportTickets.filter(t => t.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-grow p-6 sm:p-10 space-y-10 overflow-y-auto">

          {activeTab === 'Doctors' && (
            <div className="space-y-8">
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white">Create Doctor Account</h3>
                    <p className="text-xs text-slate-400 mt-1">Registers auth, seeds clinic data to Firestore</p>
                  </div>
                  {simSuccess && createdCredentials && (
                    <div className="bg-emerald-950/60 border border-emerald-800 p-4 rounded-xl space-y-2">
                      <p className="text-emerald-400 font-black text-xs uppercase">? Account Created! Share credentials:</p>
                      <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 font-mono text-xs">
                        <p><span className="text-emerald-400">Email:</span> <span className="text-white">{createdCredentials.email}</span></p>
                        <p><span className="text-emerald-400">Password:</span> <span className="text-white">{createdCredentials.password}</span></p>
                        <p><span className="text-emerald-400">Site:</span> <span className="text-white">clinicpage.in/{createdCredentials.slug}</span></p>
                        <p><span className="text-emerald-400">Plan:</span> <span className="text-white uppercase">{PLAN_LABELS[createdCredentials.plan]}</span></p>
                      </div>
                    </div>
                  )}
                  <form onSubmit={handleSimSeed} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">CLINIC URL SLUG</label>
                      <div className="flex">
                        <span className="bg-slate-950 border border-r-0 border-slate-800 text-slate-500 px-2 py-2 text-[10px] rounded-l select-none flex items-center">clinicpage.in/</span>
                        <input type="text" value={simSlug} onChange={e => setSimSlug(e.target.value)} required placeholder="dr-patil-csn"
                          className="flex-grow bg-slate-950 border border-slate-800 rounded-r px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">LOGIN EMAIL</label>
                      <input type="email" value={simEmail} onChange={e => setSimEmail(e.target.value)} required placeholder="doctor@gmail.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">INITIAL PASSWORD</label>
                      <input type="text" value={simPassword} onChange={e => setSimPassword(e.target.value)} required placeholder="Min 6 characters"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">SUBSCRIPTION PLAN</label>
                      <select value={simPlan} onChange={e => setSimPlan(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500">
                        <option value="basic">Basic — ?4,999/yr</option>
                        <option value="professional">Professional — ?7,999/yr</option>
                        <option value="pro_plus">Pro+ Custom — ?12,999/yr</option>
                      </select>
                    </div>
                    <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded text-xs transition">
                      Create Doctor Account
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">All Doctor Accounts</h3>
                    <span className="text-xs text-slate-400">{tenants.length} total</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-left">
                          <th className="py-3">Clinic Slug</th>
                          <th className="py-3">Plan</th>
                          <th className="py-3">Status</th>
                          <th className="py-3">Expiry</th>
                          <th className="py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-slate-300">
                        {tenants.map(t => (
                          <tr key={t.id} className="hover:bg-slate-850/30 transition">
                            <td className="py-3 font-semibold">
                              <a href={`/${t.tenant_slug}`} target="_blank" rel="noreferrer" className="hover:underline text-emerald-400">{t.tenant_slug}</a>
                            </td>
                            <td className="py-3 font-bold text-slate-300">{PLAN_LABELS[t.plan] || t.plan}</td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded font-black text-[10px] uppercase ${t.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'}`}>{t.status}</span>
                              {isExpired(t.plan_expiry) && <span className="ml-1 bg-red-950 text-red-400 border border-red-900 text-[9px] px-1 py-0.5 rounded font-black uppercase">Expired</span>}
                            </td>
                            <td className="py-3">
                              {isExpiringSoon(t.plan_expiry)
                                ? <span className="text-amber-400 font-bold bg-amber-950/60 px-1 py-0.5 border border-amber-900 rounded text-[10px]">? Expiring</span>
                                : <span className="text-slate-400">{t.plan_expiry ? new Date(t.plan_expiry.seconds * 1000).toLocaleDateString() : 'N/A'}</span>}
                            </td>
                            <td className="py-3 text-right space-x-1.5">
                              <button onClick={() => impersonateTenant(t.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-semibold transition">Login As</button>
                              {t.status === 'active'
                                ? <button onClick={() => handleStatusChange(t.id, 'suspended')} className="bg-rose-950/80 border border-rose-900 text-rose-400 px-2 py-1 rounded hover:bg-rose-900/40 font-semibold transition">Suspend</button>
                                : <button onClick={() => handleStatusChange(t.id, 'active')} className="bg-emerald-950/80 border border-emerald-900 text-emerald-400 px-2 py-1 rounded hover:bg-emerald-900/40 font-semibold transition">Activate</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Revenue' && (
            <div className="space-y-8">
              <h2 className="text-xl font-black text-white">Revenue Overview</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  ['Estimated ARR', `?${totalRevenue.toLocaleString('en-IN')}`, 'text-white'],
                  ['Monthly (MRR)', `?${Math.round(totalRevenue / 12).toLocaleString('en-IN')}`, 'text-emerald-400'],
                  ['Active Paying', activeCount, 'text-white'],
                  ['Avg / Client', `?${tenants.length > 0 ? Math.round(totalRevenue / tenants.length).toLocaleString('en-IN') : 0}`, 'text-white'],
                ].map(([label, val, color]) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <span className="text-slate-500 text-xs font-bold uppercase block">{label}</span>
                    <span className={`text-3xl font-black block mt-2 ${color}`}>{val}</span>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-6">
                <h3 className="text-base font-bold text-white">Plan Tier Distribution</h3>
                <div className="space-y-4">
                  {Object.entries(PLAN_LABELS).map(([key, label]) => {
                    const count = tenants.filter(t => t.plan === key).length;
                    const pct = tenants.length > 0 ? (count / tenants.length) * 100 : 0;
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{label}</span>
                          <span className="text-slate-400">{count} clients · ?{(count * PLAN_PRICES[key]).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${key === 'basic' ? 'bg-blue-500' : key === 'professional' ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
                <h3 className="text-base font-bold text-white">Expiry Alerts (Next 30 Days)</h3>
                {tenants.filter(t => isExpiringSoon(t.plan_expiry)).length === 0
                  ? <p className="text-xs text-slate-500">No tenants expiring in the next 30 days.</p>
                  : tenants.filter(t => isExpiringSoon(t.plan_expiry)).map(t => (
                    <div key={t.id} className="bg-amber-950/20 border border-amber-900 p-4 rounded-xl flex justify-between items-center text-xs">
                      <div><span className="font-bold text-amber-400 block">{t.tenant_slug}</span><span className="text-[10px] text-slate-500">{PLAN_LABELS[t.plan]}</span></div>
                      <span className="text-white">Expires: {new Date(t.plan_expiry.seconds * 1000).toLocaleDateString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'Support' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-white">Client Support Tickets</h2>
                <div className="flex items-center space-x-3">
                  <span className="bg-amber-950 text-amber-400 text-xs font-bold px-3 py-1 rounded-full border border-amber-900">{supportTickets.filter(t => t.status === 'pending').length} pending</span>
                  <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{supportTickets.length} total</span>
                </div>
              </div>
              {supportTickets.length === 0
                ? <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center"><p className="text-slate-500">No support tickets logged.</p></div>
                : <div className="space-y-4">
                  {supportTickets.map(tk => (
                    <div key={tk.id} className={`bg-slate-900 border rounded-2xl p-6 ${tk.status === 'pending' ? 'border-amber-900/50' : 'border-slate-800'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-white">{tk.subject}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tk.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'}`}>{tk.status}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">From: {tk.doctor_name} · {tk.email}</p>
                          <p className="text-slate-300 text-sm leading-relaxed bg-slate-950/40 p-3 rounded-lg">{tk.message}</p>
                        </div>
                        {tk.status === 'pending' && (
                          <button onClick={() => handleTicketStatus(tk.id, 'resolved')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition min-w-fit">? Resolve</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
