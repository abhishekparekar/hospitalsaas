import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export default function DoctorAdminDashboard() {
  const [user, setUser] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  const navigate = useNavigate();

  // Sub-states for dashboard editors
  const [profileForm, setProfileForm] = useState(null);
  const [timingsForm, setTimingsForm] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [blogs, setBlogs] = useState([]);

  // Impersonation, Support, and Billing States
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);

  // Form Inputs temporary editors
  const [newService, setNewService] = useState({ title: '', description: '', icon: '🩺', order: 1, active: true });
  const [newImage, setNewImage] = useState({ image_url: '', caption: '', order: 1 });
  const [newBlog, setNewBlog] = useState({ title: '', body_markdown: '', published: true });

  useEffect(() => {
    let unsubAppt = () => {};
    let unsubServ = () => {};
    let unsubGal = () => {};
    let unsubBlogs = () => {};
    let unsubTickets = () => {};

    const impersonatedId = localStorage.getItem('impersonate_tenant_id');
    if (impersonatedId) {
      setIsImpersonated(true);
      setTenantId(impersonatedId);
      setUser({ email: 'impersonated_doctor@clinicpage.in', uid: impersonatedId });
      
      const loadImpersonated = async () => {
        const tenantRef = doc(db, 'tenants', impersonatedId);
        const tSnap = await getDoc(tenantRef);
        if (tSnap.exists()) {
          setTenant(tSnap.data());
        }

        const profRef = doc(db, 'tenants', impersonatedId, 'profile', 'info');
        const timeRef = doc(db, 'tenants', impersonatedId, 'timings', 'info');

        unsubAppt = onSnapshot(collection(db, 'tenants', impersonatedId, 'appointments'), (snap) => {
          setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
        });
        unsubServ = onSnapshot(collection(db, 'tenants', impersonatedId, 'services'), (snap) => {
          setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubGal = onSnapshot(collection(db, 'tenants', impersonatedId, 'gallery'), (snap) => {
          setGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubBlogs = onSnapshot(collection(db, 'tenants', impersonatedId, 'blogs'), (snap) => {
          setBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubTickets = onSnapshot(
          query(collection(db, 'support_tickets'), where('tenantId', '==', impersonatedId)),
          (snap) => {
            setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
          }
        );

        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) setProfileForm(profSnap.data());

        const timeSnap = await getDoc(timeRef);
        if (timeSnap.exists()) setTimingsForm(timeSnap.data());

        setLoading(false);
      };
      loadImpersonated();

      return () => {
        unsubAppt();
        unsubServ();
        unsubGal();
        unsubBlogs();
        unsubTickets();
      };
    }

    const unsub = onAuthStateChanged(auth, async (usr) => {
      if (!usr) {
        navigate('/admin');
        return;
      }
      setUser(usr);

      // Check tenant mapping:
      const q = query(collection(db, 'tenants'), where('owner_uid', '==', usr.uid));
      const querySnapshot = await getDocs(q);
      
      let tid = usr.uid;
      if (!querySnapshot.empty) {
        tid = querySnapshot.docs[0].id;
        setTenant(querySnapshot.docs[0].data());
      } else {
        // Create matching base tenant doc if they just logged in without seed
        const defaultTenantRef = doc(db, 'tenants', usr.uid);
        const tSnap = await getDoc(defaultTenantRef);
        if (tSnap.exists()) {
          setTenant(tSnap.data());
        } else {
          // Empty setup
          const initialTenantData = {
            tenant_slug: `dr-${usr.uid.substring(0, 6)}`,
            status: 'active',
            plan: 'professional',
            plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            created_at: new Date(),
            owner_uid: usr.uid,
            contact_email: usr.email,
            contact_phone: '+919999999999',
            whatsapp_notify_enabled: false
          };
          await setDoc(defaultTenantRef, initialTenantData);
          setTenant(initialTenantData);
        }
      }
      setTenantId(tid);

      // Fetch Sub-documents
      const profRef = doc(db, 'tenants', tid, 'profile', 'info');
      const timeRef = doc(db, 'tenants', tid, 'timings', 'info');

      // Setup Listeners for real-time subcollections
      unsubAppt = onSnapshot(collection(db, 'tenants', tid, 'appointments'), (snap) => {
        setAppointments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
      });
      unsubServ = onSnapshot(collection(db, 'tenants', tid, 'services'), (snap) => {
        setServices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubGal = onSnapshot(collection(db, 'tenants', tid, 'gallery'), (snap) => {
        setGallery(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubBlogs = onSnapshot(collection(db, 'tenants', tid, 'blogs'), (snap) => {
        setBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubTickets = onSnapshot(
        query(collection(db, 'support_tickets'), where('tenantId', '==', tid)),
        (snap) => {
          setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
        }
      );

      // Load values into profile and timings forms
      const profSnap = await getDoc(profRef);
      if (profSnap.exists()) {
        setProfileForm(profSnap.data());
      } else {
        const defaultProfile = {
          doctor_name: "Unnamed Doctor",
          salutation: "Dr.",
          photo_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
          speciality: "General Physician",
          tagline: "Quality care for all",
          degrees: ["MBBS"],
          registration_number: "MMC-YYYY-XXXXX",
          experience_years: 5,
          languages: ["Hindi", "English"],
          affiliations: ["Local Clinic"],
          bio: "Consulting doctor details...",
          clinic_name: "My Clinic",
          clinic_address: "Address details",
          map_embed_url: "",
          phone: "+919999999999",
          whatsapp_number: "+919999999999",
          email: usr.email,
          theme_color: "#1e40af"
        };
        await setDoc(profRef, defaultProfile);
        setProfileForm(defaultProfile);
      }

      const timeSnap = await getDoc(timeRef);
      if (timeSnap.exists()) {
        setTimingsForm(timeSnap.data());
      } else {
        const defaultTimings = {
          mon: { open: "09:00", close: "17:00", closed: false },
          tue: { open: "09:00", close: "17:00", closed: false },
          wed: { open: "09:00", close: "17:00", closed: false },
          thu: { open: "09:00", close: "17:00", closed: false },
          fri: { open: "09:00", close: "17:00", closed: false },
          sat: { open: "09:00", close: "13:00", closed: false },
          sun: { open: null, close: null, closed: true },
          notice: "",
          appointment_duration_mins: 15
        };
        await setDoc(timeRef, defaultTimings);
        setTimingsForm(defaultTimings);
      }

      setLoading(false);
    });

    return () => {
      unsub();
      unsubAppt();
      unsubServ();
      unsubGal();
      unsubBlogs();
      unsubTickets();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin');
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'profile', 'info'), profileForm);
      alert('Profile details updated successfully!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  const saveTimings = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'tenants', tenantId, 'timings', 'info'), timingsForm);
      alert('OPD Schedule updated successfully!');
    } catch (err) {
      alert('Save failed: ' + err.message);
    }
  };

  const handleAppointmentStatus = async (apptId, nextStatus) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'appointments', apptId), {
        status: nextStatus
      });
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const addService = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'services'), newService);
      setNewService({ title: '', description: '', icon: '🩺', order: 1, active: true });
    } catch (err) {
      alert('Add service failed: ' + err.message);
    }
  };

  const deleteService = async (id) => {
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'services', id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const addImage = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'gallery'), newImage);
      setNewImage({ image_url: '', caption: '', order: 1 });
    } catch (err) {
      alert('Add image failed: ' + err.message);
    }
  };

  const deleteImage = async (id) => {
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'gallery', id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const addBlog = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'blogs'), {
        ...newBlog,
        slug: newBlog.title.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        created_at: new Date()
      });
      setNewBlog({ title: '', body_markdown: '', published: true });
    } catch (err) {
      alert('Add blog failed: ' + err.message);
    }
  };

  const deleteBlog = async (id) => {
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'blogs', id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const submitSupportTicket = async (e) => {
    e.preventDefault();
    if (!supportSubject.trim() || !supportMessage.trim()) return;
    try {
      await addDoc(collection(db, 'support_tickets'), {
        tenantId,
        doctor_name: profileForm?.doctor_name || 'Doctor',
        email: user.email,
        subject: supportSubject,
        message: supportMessage,
        status: 'pending',
        created_at: new Date()
      });
      alert('Support ticket submitted successfully. iCoded staff will review this request.');
      setSupportSubject('');
      setSupportMessage('');
    } catch (err) {
      alert('Submission failed: ' + err.message);
    }
  };

  const simulatePayment = async (selectedPlan) => {
    try {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);

      const transaction = {
        id: `pay_${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amount: selectedPlan === 'professional' ? 7999 : 9999,
        plan: selectedPlan,
        status: 'charged',
        date: new Date()
      };

      const updatedHistory = tenant.payment_history ? [transaction, ...tenant.payment_history] : [transaction];

      await updateDoc(doc(db, 'tenants', tenantId), {
        status: 'active',
        plan: selectedPlan,
        plan_expiry: expiry,
        payment_history: updatedHistory
      });

      setTenant({ ...tenant, status: 'active', plan: selectedPlan, plan_expiry: expiry, payment_history: updatedHistory });
      alert(`Payment of ₹${transaction.amount} simulated successfully! Plan updated to ${selectedPlan.toUpperCase()}.`);
    } catch (err) {
      alert('Payment simulation failed: ' + err.message);
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('impersonate_tenant_id');
    navigate('/superadmin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
        <span className="animate-pulse text-lg font-semibold">Opening Clinic Control Board...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-950 text-slate-200">
      {isImpersonated && (
        <div className="bg-amber-500 text-slate-900 font-bold px-6 py-3 text-sm text-center flex justify-between items-center z-50">
          <span>⚠️ IMPERSONATION MODE: Viewing dashboard of clinic "{tenant?.tenant_slug}"</span>
          <button onClick={handleExitImpersonation} className="bg-slate-950 text-white px-3 py-1 rounded hover:bg-slate-800 transition text-xs font-black">
            Exit Impersonation Mode
          </button>
        </div>
      )}
      <div className="flex flex-col lg:flex-row flex-grow">
        {/* Sidebar */}
        <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black">CP</div>
              <span className="text-xl font-bold tracking-tight text-white">ClinicPage Dashboard</span>
            </div>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <h4 className="text-xs font-bold text-slate-400 uppercase">ACTIVE CLINIC SLUG</h4>
              {tenant && (
                <a href={`/${tenant.tenant_slug}`} target="_blank" rel="noreferrer" className="text-emerald-400 text-sm font-semibold hover:underline block mt-1 break-all">
                  clinicpage.in/{tenant.tenant_slug} ↗
                </a>
              )}
            </div>

            <nav className="space-y-1">
              {['Overview', 'Appointments', 'Profile', 'OPD Timings', 'Services', 'Gallery', 'Blogs', 'Settings', 'Billing', 'Support'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition flex items-center space-x-3 ${activeTab === tab ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
                >
                  <span>{tab}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Logged in as:<br />
              <span className="text-slate-300 font-medium break-all">{user?.email}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-slate-750 text-rose-400 hover:text-rose-300 font-bold py-2 rounded-lg text-sm transition"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow p-6 sm:p-12 overflow-y-auto">
          <header className="mb-10 flex justify-between items-center border-b border-slate-900 pb-6">
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">{activeTab}</h2>
              <p className="text-sm text-slate-400">Configure and monitor your clinic setup details</p>
            </div>
          </header>

          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Bookings</span>
                  <span className="text-4xl font-extrabold text-white block mt-2">{appointments.length}</span>
                </div>
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pending Approvals</span>
                  <span className="text-4xl font-extrabold text-amber-400 block mt-2">
                    {appointments.filter(a => a.status === 'pending').length}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Services</span>
                  <span className="text-4xl font-extrabold text-emerald-400 block mt-2">{services.length}</span>
                </div>
              </div>

              {/* Expiring warnings */}
              {tenant && (
                <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white">Subscription Billing Information</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm text-slate-300">
                    <div>
                      <span className="text-slate-500 block">CURRENT PLAN:</span>
                      <span className="font-semibold text-white uppercase text-base">{tenant.plan}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">EXPIRY DATE:</span>
                      <span className="font-semibold text-white">
                        {new Date(tenant.plan_expiry?.seconds * 1000).toDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Mini appointments table */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Upcoming Booking Requests</h3>
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-500">No appointments logged yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 border-b border-slate-800">
                          <th className="py-3">Patient</th>
                          <th className="py-3">Phone</th>
                          <th className="py-3">Date/Time</th>
                          <th className="py-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {appointments.slice(0, 5).map(appt => (
                          <tr key={appt.id}>
                            <td className="py-3 font-semibold text-white">{appt.patient_name}</td>
                            <td className="py-3">{appt.patient_phone}</td>
                            <td className="py-3">{appt.preferred_date} @ {appt.preferred_time}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${appt.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800/80' : appt.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' : 'bg-slate-800 text-slate-400'}`}>
                                {appt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* APPOINTMENTS TAB */}
          {activeTab === 'Appointments' && (
            <div className="space-y-6 bg-slate-900 border border-slate-850 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Patient Appointments Listing</h3>
              {appointments.length === 0 ? (
                <p className="text-slate-500 text-sm">No booked consultations.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-left">
                        <th className="py-4">Patient Name</th>
                        <th className="py-4">Contact Phone</th>
                        <th className="py-4">Consultation Time</th>
                        <th className="py-4">Complaint</th>
                        <th className="py-4">Status</th>
                        <th className="py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300">
                      {appointments.map(appt => (
                        <tr key={appt.id} className="hover:bg-slate-850/30">
                          <td className="py-4 font-bold text-white">{appt.patient_name}</td>
                          <td className="py-4">
                            <a href={`tel:${appt.patient_phone}`} className="hover:underline text-emerald-400">{appt.patient_phone}</a>
                          </td>
                          <td className="py-4">{appt.preferred_date} @ {appt.preferred_time}</td>
                          <td className="py-4 text-xs max-w-xs truncate">{appt.complaint || 'N/A'}</td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${appt.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800/80' : appt.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80' : appt.status === 'cancelled' ? 'bg-rose-950/80 text-rose-400 border border-rose-900/60' : 'bg-slate-800 text-slate-400'}`}>
                              {appt.status}
                            </span>
                          </td>
                          <td className="py-4 text-right space-x-2">
                            {appt.status === 'pending' && (
                              <button onClick={() => handleAppointmentStatus(appt.id, 'confirmed')} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded transition font-semibold">
                                Confirm
                              </button>
                            )}
                            {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                              <>
                                <button onClick={() => handleAppointmentStatus(appt.id, 'completed')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded transition font-semibold">
                                  Complete
                                </button>
                                <button onClick={() => handleAppointmentStatus(appt.id, 'cancelled')} className="bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900/40 text-xs px-2 py-1 rounded transition font-semibold">
                                  Cancel
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'Profile' && profileForm && (
            <form onSubmit={saveProfile} className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-3xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Edit Public Doctor Profile</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">DOCTOR FULL NAME</label>
                  <input 
                    type="text" 
                    value={profileForm.doctor_name}
                    onChange={e => setProfileForm({ ...profileForm, doctor_name: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">SPECIALITY / TITLE</label>
                  <input 
                    type="text" 
                    value={profileForm.speciality}
                    onChange={e => setProfileForm({ ...profileForm, speciality: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">CLINIC DEGREES (comma separated)</label>
                  <input 
                    type="text" 
                    value={profileForm.degrees.join(', ')}
                    onChange={e => setProfileForm({ ...profileForm, degrees: e.target.value.split(',').map(s => s.trim()) })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">MMC REGISTRATION NUMBER</label>
                  <input 
                    type="text" 
                    value={profileForm.registration_number}
                    onChange={e => setProfileForm({ ...profileForm, registration_number: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">CLINIC NAME</label>
                  <input 
                    type="text" 
                    value={profileForm.clinic_name}
                    onChange={e => setProfileForm({ ...profileForm, clinic_name: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">EXPERIENCE YEARS</label>
                  <input 
                    type="number" 
                    value={profileForm.experience_years}
                    onChange={e => setProfileForm({ ...profileForm, experience_years: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">CLINIC PHONE</label>
                  <input 
                    type="text" 
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">WHATSAPP NOTIFICATION CONTACT PHONE</label>
                  <input 
                    type="text" 
                    value={profileForm.whatsapp_number}
                    onChange={e => setProfileForm({ ...profileForm, whatsapp_number: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">GOOGLE MAP EMBED URL</label>
                  <input 
                    type="text" 
                    value={profileForm.map_embed_url}
                    onChange={e => setProfileForm({ ...profileForm, map_embed_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="https://google.com/maps/embed/..."
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">DOCTOR PHOTO URL</label>
                  <input 
                    type="text" 
                    value={profileForm.photo_url}
                    onChange={e => setProfileForm({ ...profileForm, photo_url: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">ACCENT THEME COLOR</label>
                  <select 
                    value={profileForm.theme_color}
                    onChange={e => setProfileForm({ ...profileForm, theme_color: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="#1e40af">Royal Blue</option>
                    <option value="#0f766e">OPD Teal</option>
                    <option value="#065f46">Emerald Green</option>
                    <option value="#9f1239">Rose Pink</option>
                    <option value="#581c87">Premium Purple</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-2">CLINIC ADDRESS</label>
                  <input 
                    type="text" 
                    value={profileForm.clinic_address}
                    onChange={e => setProfileForm({ ...profileForm, clinic_address: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-2">DOCTOR BIOGRAPHY</label>
                  <textarea 
                    value={profileForm.bio}
                    onChange={e => setProfileForm({ ...profileForm, bio: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 h-32 resize-none"
                  />
                </div>
              </div>
              <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-lg text-sm transition">
                Save Profile Settings
              </button>
            </form>
          )}

          {/* OPD TIMINGS TAB */}
          {activeTab === 'OPD Timings' && timingsForm && (
            <form onSubmit={saveTimings} className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-4xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Schedule OPD timings</h3>
              <div className="space-y-4">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                  const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
                  const dayData = timingsForm[day] || { closed: true };
                  return (
                    <div key={day} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-slate-950/60 p-4 border border-slate-850 rounded-xl">
                      <span className="font-bold text-white">{dayNames[day]}</span>
                      <label className="flex items-center space-x-2 text-xs">
                        <input 
                          type="checkbox" 
                          checked={!dayData.closed} 
                          onChange={(e) => {
                            const closed = !e.target.checked;
                            setTimingsForm({
                              ...timingsForm,
                              [day]: { ...dayData, closed, open: closed ? null : "09:00", close: closed ? null : "17:00" }
                            });
                          }}
                          className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-900"
                        />
                        <span>Open for Consultation</span>
                      </label>
                      {!dayData.closed && (
                        <>
                          <div className="flex space-x-2">
                            <input 
                              type="text" 
                              placeholder="09:00"
                              value={dayData.open || ''} 
                              onChange={(e) => setTimingsForm({ ...timingsForm, [day]: { ...dayData, open: e.target.value } })}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white w-20 text-center"
                            />
                            <span className="text-slate-500">to</span>
                            <input 
                              type="text" 
                              placeholder="13:00"
                              value={dayData.close || ''} 
                              onChange={(e) => setTimingsForm({ ...timingsForm, [day]: { ...dayData, close: e.target.value } })}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white w-20 text-center"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <input 
                              type="text" 
                              placeholder="17:00"
                              value={dayData.second_open || ''} 
                              onChange={(e) => setTimingsForm({ ...timingsForm, [day]: { ...dayData, second_open: e.target.value } })}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white w-20 text-center"
                            />
                            <span className="text-slate-500">to</span>
                            <input 
                              type="text" 
                              placeholder="21:00"
                              value={dayData.second_close || ''} 
                              onChange={(e) => setTimingsForm({ ...timingsForm, [day]: { ...dayData, second_close: e.target.value } })}
                              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white w-20 text-center"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">HOLIDAY NOTICE BANNER TEXT (OPTIONAL)</label>
                <input 
                  type="text" 
                  value={timingsForm.notice}
                  onChange={e => setTimingsForm({ ...timingsForm, notice: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                  placeholder="eg. Clinic closed on 15th August"
                />
              </div>
              
              <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3 rounded-lg text-sm transition">
                Save Timings Configuration
              </button>
            </form>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'Services' && (
            <div className="space-y-8 max-w-4xl">
              <form onSubmit={addService} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl grid md:grid-cols-3 gap-4">
                <div className="md:col-span-3 pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-white text-sm">Add Treatment / Service Card</h4>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">TITLE</label>
                  <input 
                    type="text" 
                    value={newService.title}
                    onChange={e => setNewService({ ...newService, title: e.target.value })}
                    required
                    placeholder="eg. Root Canal Therapy"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">ICON (Emoji or Symbol)</label>
                  <input 
                    type="text" 
                    value={newService.icon}
                    onChange={e => setNewService({ ...newService, icon: e.target.value })}
                    required
                    placeholder="🩺"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 text-center"
                  />
                </div>
                <div className="flex items-end">
                  <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2 rounded-lg text-xs transition">
                    Add Service Card
                  </button>
                </div>
                <div className="md:col-span-3">
                  <label className="text-xs font-bold text-slate-400 block mb-2">SHORT DESCRIPTION</label>
                  <textarea 
                    value={newService.description}
                    onChange={e => setNewService({ ...newService, description: e.target.value })}
                    required
                    placeholder="Describe details of the therapy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 h-16 resize-none"
                  />
                </div>
              </form>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Current Services Listing</h3>
                {services.length === 0 ? (
                  <p className="text-slate-500 text-xs">No services cataloged.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {services.map(s => (
                      <div key={s.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex justify-between items-start">
                        <div className="space-y-1">
                          <span className="text-2xl">{s.icon}</span>
                          <h4 className="font-bold text-white text-sm">{s.title}</h4>
                          <p className="text-slate-400 text-[10px] leading-relaxed max-w-xs">{s.description}</p>
                        </div>
                        <button 
                          onClick={() => deleteService(s.id)}
                          className="text-rose-500 hover:text-rose-400 p-1 border border-rose-950 bg-rose-950/20 hover:bg-rose-950/40 rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* GALLERY TAB */}
          {activeTab === 'Gallery' && (
            <div className="space-y-8 max-w-4xl">
              <form onSubmit={addImage} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl grid md:grid-cols-3 gap-4">
                <div className="md:col-span-3 pb-2 border-b border-slate-800">
                  <h4 className="font-bold text-white text-sm">Add Clinic Image</h4>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-400 block mb-2">IMAGE PUBLIC URL</label>
                  <input 
                    type="text" 
                    value={newImage.image_url}
                    onChange={e => setNewImage({ ...newImage, image_url: e.target.value })}
                    required
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">IMAGE CAPTION</label>
                  <input 
                    type="text" 
                    value={newImage.caption}
                    onChange={e => setNewImage({ ...newImage, caption: e.target.value })}
                    required
                    placeholder="eg. Reception Area"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2 rounded-lg text-xs transition">
                    Add Image to Gallery
                  </button>
                </div>
              </form>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Clinic Gallery Photos</h3>
                {gallery.length === 0 ? (
                  <p className="text-slate-500 text-xs">No photos uploaded.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {gallery.map(img => (
                      <div key={img.id} className="relative group border border-slate-850 rounded-xl overflow-hidden bg-slate-950">
                        <img src={img.image_url} alt={img.caption} className="w-full h-32 object-cover" />
                        <div className="p-2 flex justify-between items-center text-xs">
                          <span className="text-slate-400 truncate max-w-[120px]">{img.caption}</span>
                          <button onClick={() => deleteImage(img.id)} className="text-rose-500 hover:text-rose-400 font-bold">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BLOGS TAB */}
          {activeTab === 'Blogs' && (
            <div className="space-y-8 max-w-4xl">
              <form onSubmit={addBlog} className="bg-slate-900 border border-slate-850 p-6 rounded-2xl space-y-4">
                <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800">Compose New Health Tip Post</h4>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">ARTICLE TITLE</label>
                  <input 
                    type="text" 
                    value={newBlog.title}
                    onChange={e => setNewBlog({ ...newBlog, title: e.target.value })}
                    required
                    placeholder="eg. 5 Symptoms of Silent Diabetes"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">BODY CONTENT</label>
                  <textarea 
                    value={newBlog.body_markdown}
                    onChange={e => setNewBlog({ ...newBlog, body_markdown: e.target.value })}
                    required
                    placeholder="Draft your medical advice article here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 h-40 resize-none"
                  />
                </div>
                <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2 rounded-lg text-xs transition">
                  Publish Health Tip Post
                </button>
              </form>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Published Articles</h3>
                {blogs.length === 0 ? (
                  <p className="text-slate-500 text-xs">No active health tips.</p>
                ) : (
                  <div className="space-y-3">
                    {blogs.map(b => (
                      <div key={b.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-white text-sm">{b.title}</h4>
                          <span className="text-[10px] text-slate-500">Slug: {b.slug}</span>
                        </div>
                        <button onClick={() => deleteBlog(b.id)} className="text-xs font-semibold text-rose-500 hover:underline">Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'Settings' && tenant && (
            <div className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-3xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Notifications & API Configuration</h3>
              
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={tenant.whatsapp_notify_enabled}
                    onChange={async (e) => {
                      const enabled = e.target.checked;
                      await updateDoc(doc(db, 'tenants', tenantId), { whatsapp_notify_enabled: enabled });
                      setTenant({ ...tenant, whatsapp_notify_enabled: enabled });
                    }}
                    className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-900 w-5 h-5"
                  />
                  <div>
                    <span className="font-bold text-white text-sm">Enable WhatsApp Booking Alerts</span>
                    <p className="text-xs text-slate-400">Receive instant alerts when a patient triggers a consultation request.</p>
                  </div>
                </label>

                {tenant.whatsapp_notify_enabled && (
                  <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-4 pt-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">CallMeBot Configuration API</span>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">CALLMEBOT API KEY</label>
                      <input 
                        type="text"
                        value={tenant.callmebot_api_key || ''}
                        onChange={async (e) => {
                          await updateDoc(doc(db, 'tenants', tenantId), { callmebot_api_key: e.target.value });
                          setTenant({ ...tenant, callmebot_api_key: e.target.value });
                        }}
                        placeholder="Insert your CallMeBot WhatsApp API Key"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      How to get CallMeBot API key: <br />
                      1. Send whatsapp message <code className="text-emerald-400">I allow callmebot to send me messages</code> to <code className="text-emerald-400">+34 644 66 23 23</code><br />
                      2. Copy the API key received and paste it above.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BILLING TAB */}
          {activeTab === 'Billing' && tenant && (
            <div className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-3xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Billing & Subscriptions</h3>
              <div className="grid sm:grid-cols-2 gap-6 text-sm">
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-slate-500 block text-xs">CURRENT TIER</span>
                  <span className="font-extrabold text-white text-lg uppercase">{tenant.plan} Plan</span>
                </div>
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2">
                  <span className="text-slate-500 block text-xs">RENEWAL EXPIRES ON</span>
                  <span className="font-bold text-emerald-400 text-base">
                    {tenant.plan_expiry ? new Date(tenant.plan_expiry.seconds * 1000).toDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-4">
                <h4 className="font-bold text-white text-sm">Simulate Razorpay Payments</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Extend your active service license immediately. All simulated payments update your live Firestore tenant profile.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => simulatePayment('professional')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded font-bold text-xs transition"
                  >
                    Renew Professional (₹7,999/yr)
                  </button>
                  <button 
                    onClick={() => simulatePayment('pro_plus')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-xs transition"
                  >
                    Upgrade to Pro+ (₹9,999/yr)
                  </button>
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-3">
                <h4 className="font-bold text-white text-sm">Transaction billing history</h4>
                {(!tenant.payment_history || tenant.payment_history.length === 0) ? (
                  <p className="text-xs text-slate-500 font-medium">No transactions recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-850 text-xs">
                    {tenant.payment_history.map((tx, idx) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-white block">{tx.id}</span>
                          <span className="text-[10px] text-slate-500">{tx.plan?.toUpperCase()} Plan</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-emerald-400 block">₹{tx.amount}</span>
                          <span className="text-[10px] text-slate-500">Charged Success</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUPPORT TAB */}
          {activeTab === 'Support' && (
            <div className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-3xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Help & Support Center</h3>
              <form onSubmit={submitSupportTicket} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">TICKET SUBJECT</label>
                  <input 
                    type="text" 
                    value={supportSubject}
                    onChange={e => setSupportSubject(e.target.value)}
                    required
                    placeholder="eg. WhatsApp notification delay"
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-2.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">MESSAGE / QUERY DETAILS</label>
                  <textarea 
                    value={supportMessage}
                    onChange={e => setSupportMessage(e.target.value)}
                    required
                    placeholder="Describe your query in detail..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-4 py-3 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 h-28 resize-none"
                  />
                </div>
                <button className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-2 rounded text-xs transition">
                  Submit Ticket Request
                </button>
              </form>

              <div className="bg-slate-950 border border-slate-850 p-6 rounded-xl space-y-3 mt-6">
                <h4 className="font-bold text-white text-sm">Past Support Queries</h4>
                {supportTickets.length === 0 ? (
                  <p className="text-xs text-slate-500 font-medium">No tickets submitted.</p>
                ) : (
                  <div className="divide-y divide-slate-850 text-xs">
                    {supportTickets.map(tk => (
                      <div key={tk.id} className="py-3 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white text-sm">{tk.subject}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${tk.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'}`}>
                            {tk.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] leading-relaxed">{tk.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
