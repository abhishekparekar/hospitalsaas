import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
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
  const [userRole, setUserRole] = useState('doctor');
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

  // Patients and Messages States
  const [patients, setPatients] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientModalOpen, setPatientModalOpen] = useState(false);
  const [editPatientForm, setEditPatientForm] = useState(null);

  // Impersonation, Support, and Billing States
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportTickets, setSupportTickets] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Staff management state
  const [staff, setStaff] = useState([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState('');
  const [staffSuccess, setStaffSuccess] = useState('');

  const allowedTabs = useMemo(() => {
    return userRole === 'staff'
      ? ['Overview', 'Appointments', 'Patients', 'Messages', 'Support']
      : ['Overview', 'Appointments', 'Patients', 'Messages', 'Profile', 'OPD Timings', 'Services', 'Gallery', 'Blogs', 'Staff', 'Settings', 'Billing', 'Support'];
  }, [userRole]);

  // Form Inputs temporary editors
  const [newService, setNewService] = useState({ title: '', description: '', icon: 'ðŸ©º', order: 1, active: true });
  const [newImage, setNewImage] = useState({ image_url: '', caption: '', order: 1 });
  const [newBlog, setNewBlog] = useState({ title: '', body_markdown: '', published: true });

  useEffect(() => {
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab('Overview');
    }
  }, [userRole, activeTab, allowedTabs]);

  useEffect(() => {
    let unsubAppt = () => {};
    let unsubServ = () => {};
    let unsubGal = () => {};
    let unsubBlogs = () => {};
    let unsubTickets = () => {};
    let unsubPatients = () => {};
    let unsubMessages = () => {};
    let unsubStaff = () => {};

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
        unsubPatients = onSnapshot(collection(db, 'tenants', impersonatedId, 'patients'), (snap) => {
          setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        unsubMessages = onSnapshot(collection(db, 'tenants', impersonatedId, 'messages'), (snap) => {
          setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
        });
        unsubStaff = onSnapshot(collection(db, 'tenants', impersonatedId, 'staff'), (snap) => {
          setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

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
        unsubPatients();
        unsubMessages();
      };
    }

    const unsub = onAuthStateChanged(auth, async (usr) => {
      if (!usr) {
        navigate('/admin');
        return;
      }
      setUser(usr);
      const staffTenantId = sessionStorage.getItem('staff_tenant_id');
      let tid = impersonatedId || staffTenantId || usr.uid;
      let role = 'doctor';

      // 2. Load tenant configuration
      const tenantRef = doc(db, 'tenants', tid);
      const tSnap = await getDoc(tenantRef);
      if (tSnap.exists()) {
        const tenantData = tSnap.data();
        setTenant(tenantData);
        const sessionRole = sessionStorage.getItem('user_role');
        if (sessionRole === 'staff') {
          role = 'staff';
        } else {
          role = tenantData.user_type || 'doctor';
        }
      } else {
        if (!impersonatedId) {
          const initialTenantData = {
            tenant_slug: `dr-${usr.uid.substring(0, 6)}`,
            status: 'active',
            plan: 'professional',
            plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            created_at: new Date(),
            owner_uid: usr.uid,
            contact_email: usr.email,
            contact_phone: '+919999999999',
            whatsapp_notify_enabled: false,
            website_published: true,
            user_type: 'doctor'
          };
          await setDoc(tenantRef, initialTenantData);
          setTenant(initialTenantData);
        }
      }

      setUserRole(role);
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
      unsubPatients = onSnapshot(collection(db, 'tenants', tid, 'patients'), (snap) => {
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      unsubMessages = onSnapshot(collection(db, 'tenants', tid, 'messages'), (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.created_at?.seconds - a.created_at?.seconds));
      });
      unsubStaff = onSnapshot(collection(db, 'tenants', tid, 'staff'), (snap) => {
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

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
      unsubPatients();
      unsubMessages();
      unsubStaff();
    };
  }, [navigate]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffLoading(true);
    setStaffError('');
    setStaffSuccess('');

    try {
      await addDoc(collection(db, 'tenants', tenantId, 'staff'), {
        name: newStaffName,
        email: newStaffEmail,
        designation: newStaffPassword || 'Staff',
        status: 'active',
        created_at: new Date()
      });

      setStaffSuccess(`Staff member ${newStaffName} registered successfully!`);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
    } catch (err) {
      setStaffError(err.message);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    if (!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await deleteDoc(doc(db, 'tenants', tenantId, 'staff', staffId));
      alert('Staff member deleted successfully.');
    } catch (err) {
      alert('Failed to delete staff: ' + err.message);
    }
  };

  const handleToggleStaffStatus = async (staffMember) => {
    try {
      const nextStatus = staffMember.status === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(db, 'tenants', tenantId, 'staff', staffMember.id), { status: nextStatus });
    } catch (err) {
      alert('Failed to update staff status: ' + err.message);
    }
  };

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

  const handleAppointmentStatus = async (apptId, nextStatus, appt) => {
    try {
      await updateDoc(doc(db, 'tenants', tenantId, 'appointments', apptId), {
        status: nextStatus
      });

      // Send WhatsApp notification to patient on confirmation
      if (nextStatus === 'confirmed' && appt?.patient_phone && tenant?.callmebot_api_key) {
        const msg = `Hello ${appt.patient_name}! Your appointment at ${profileForm?.clinic_name || 'the clinic'} on ${appt.preferred_date} at ${appt.preferred_time} has been CONFIRMED. Please arrive on time. Thank you!`;
        const encoded = encodeURIComponent(msg);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${appt.patient_phone}&text=${encoded}&apikey=${tenant.callmebot_api_key}`;
        fetch(url).catch(() => {});
      }

      // Mark completed message
      if (nextStatus === 'completed' && appt?.patient_phone && tenant?.callmebot_api_key) {
        const msg = `Thank you ${appt.patient_name} for visiting ${profileForm?.clinic_name || 'our clinic'}! We hope you feel better soon. For follow-up, call us anytime.`;
        const encoded = encodeURIComponent(msg);
        const url = `https://api.callmebot.com/whatsapp.php?phone=${appt.patient_phone}&text=${encoded}&apikey=${tenant.callmebot_api_key}`;
        fetch(url).catch(() => {});
      }
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const addService = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'services'), newService);
      setNewService({ title: '', description: '', icon: 'ðŸ©º', order: 1, active: true });
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
      alert(`Payment of â‚¹${transaction.amount} simulated successfully! Plan updated to ${selectedPlan.toUpperCase()}.`);
    } catch (err) {
      alert('Payment simulation failed: ' + err.message);
    }
  };

  const handleExitImpersonation = () => {
    localStorage.removeItem('impersonate_tenant_id');
    navigate('/superadmin');
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950" />;
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

      {/* Mobile Header Bar */}
      <div className="lg:hidden flex items-center justify-between bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-xl font-black text-xs">CP</div>
          <span className="text-sm font-bold tracking-tight text-white">ClinicPage Dashboard</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-slate-400 hover:text-white focus:outline-none px-3 py-1.5 rounded-lg bg-slate-850 border border-slate-800 text-xs font-bold transition"
        >
          {mobileMenuOpen ? '✕ Close' : '☰ Menu'}
        </button>
      </div>

      {/* Backdrop overlay for mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm lg:hidden z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className="flex flex-col lg:flex-row flex-grow relative">
        {/* Sliding Sidebar Drawer */}
        <aside className={`bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between fixed lg:static inset-y-0 left-0 z-50 w-72 transform lg:transform-none transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
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
              {allowedTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition flex items-center justify-between ${activeTab === tab ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-850 hover:text-white'}`}
                >
                  <span>{tab}</span>
                  {tab === 'Messages' && messages.filter(m => m.status === 'unread').length > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${activeTab === 'Messages' ? 'bg-slate-950/40 text-slate-950' : 'bg-rose-500 text-white'}`}>
                      {messages.filter(m => m.status === 'unread').length}
                    </span>
                  )}
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
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-white tracking-tight">{activeTab}</h2>
                {userRole === 'staff' && (
                  <span className="bg-amber-950 text-amber-400 border border-amber-900 text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider select-none">
                    Staff Access
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-400">Configure and monitor your clinic setup details</p>
            </div>
          </header>

          {/* OVERVIEW TAB */}
          {activeTab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl cursor-pointer hover:border-emerald-500/40 transition" onClick={() => setActiveTab('Patients')}>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Patients</span>
                  <span className="text-4xl font-extrabold text-emerald-400 block mt-2">{patients.length}</span>
                </div>
                <div className="bg-slate-900 border border-slate-850 p-6 rounded-2xl cursor-pointer hover:border-rose-500/40 transition" onClick={() => setActiveTab('Messages')}>
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Unread Messages</span>
                  <span className="text-4xl font-extrabold text-rose-400 block mt-2">{messages.filter(m => m.status === 'unread').length}</span>
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
                        <th className="py-4">Appt ID</th>
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
                          <td className="py-4">
                            <span className="font-mono text-xs bg-slate-800 text-emerald-400 px-2 py-1 rounded">APT-{appt.id.substring(0,6).toUpperCase()}</span>
                          </td>
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
                              <button onClick={() => handleAppointmentStatus(appt.id, 'confirmed', appt)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2 py-1 rounded transition font-semibold">
                                Confirm
                              </button>
                            )}
                            {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                              <>
                                <button onClick={() => handleAppointmentStatus(appt.id, 'completed', appt)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-2 py-1 rounded transition font-semibold">
                                  Complete
                                </button>
                                <button onClick={() => handleAppointmentStatus(appt.id, 'cancelled', appt)} className="bg-rose-950/60 border border-rose-900 text-rose-400 hover:bg-rose-900/40 text-xs px-2 py-1 rounded transition font-semibold">
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
                    placeholder="ðŸ©º"
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

          {/* STAFF TAB */}
          {activeTab === 'Staff' && userRole === 'doctor' && (
            <div className="space-y-6">
              <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Create Staff Form */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-850 p-6 rounded-2xl shadow-xl space-y-5">
                  <div>
                    <h3 className="text-base font-bold text-white">Add Staff Member</h3>
                    <p className="text-xs text-slate-400 mt-1">Create receptionist or assistant login credentials.</p>
                  </div>

                  {staffError && (
                    <div className="bg-rose-950/60 border border-rose-800 text-rose-400 p-3 rounded-lg text-xs font-semibold">
                      {staffError}
                    </div>
                  )}

                  {staffSuccess && (
                    <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                      {staffSuccess}
                    </div>
                  )}

                  <form onSubmit={handleCreateStaff} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">STAFF FULL NAME</label>
                      <input 
                        type="text" 
                        value={newStaffName}
                        onChange={e => setNewStaffName(e.target.value)}
                        required
                        placeholder="e.g. Amit Sharma"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">EMAIL ADDRESS</label>
                      <input 
                        type="email" 
                        value={newStaffEmail}
                        onChange={e => setNewStaffEmail(e.target.value)}
                        required
                        placeholder="staff@clinic.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">DESIGNATION / ROLE</label>
                      <input 
                        type="text" 
                        value={newStaffPassword}
                        onChange={e => setNewStaffPassword(e.target.value)}
                        required
                        placeholder="e.g. Receptionist, Nurse"
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button disabled={staffLoading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded text-xs transition disabled:opacity-60">
                      {staffLoading ? 'Registering...' : 'Register Staff Member'}
                    </button>
                  </form>
                </div>

                {/* Staff List Table */}
                <div className="lg:col-span-8 bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">Registered Staff</h3>
                    <span className="text-xs text-slate-400">{staff.length} active users</span>
                  </div>

                  {staff.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">No staff members created yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-left">
                            <th className="py-3">Staff Name</th>
                            <th className="py-3">Role / Designation</th>
                            <th className="py-3">Status</th>
                            <th className="py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 text-slate-300">
                          {staff.map(s => (
                            <tr key={s.id} className="hover:bg-slate-850/30 transition">
                              <td className="py-3 font-semibold text-white">
                                <div>{s.name}</div>
                                <div className="text-[10px] text-slate-500 font-normal">{s.email}</div>
                              </td>
                              <td className="py-3 text-slate-300 font-medium">{s.designation || 'Staff'}</td>
                              <td className="py-3">
                                <span className={`px-1.5 py-0.5 rounded font-black text-[10px] uppercase ${s.status === 'suspended' ? 'bg-rose-950 text-rose-400 border border-rose-900' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'}`}>
                                  {s.status || 'active'}
                                </span>
                              </td>
                              <td className="py-3 text-right space-x-2">
                                <button 
                                  onClick={() => handleToggleStaffStatus(s)} 
                                  className={`px-2 py-1 rounded text-[10px] font-bold border transition ${s.status === 'suspended' ? 'bg-emerald-950 border-emerald-900 text-emerald-400' : 'bg-rose-950 border-rose-900 text-rose-400'}`}
                                >
                                  {s.status === 'suspended' ? 'Activate' : 'Suspend'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteStaff(s.id)} 
                                  className="bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 px-2 py-1 rounded transition text-[10px] font-bold"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'Settings' && tenant && (
            <div className="space-y-6 bg-slate-900 border border-slate-850 p-8 rounded-2xl max-w-3xl">
              <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">Clinic Website & Notifications</h3>

              {/* Website Publish Toggle */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">Website Status</span>
                    <p className="text-xs text-slate-400 mt-0.5">Control whether your public clinic site is live or hidden.</p>
                  </div>
                  <button
                    onClick={async () => {
                      const newVal = !tenant.website_published;
                      await updateDoc(doc(db, 'tenants', tenantId), { website_published: newVal });
                      setTenant({ ...tenant, website_published: newVal });
                    }}
                    className={`relative inline-flex w-14 h-7 items-center rounded-full transition-colors focus:outline-none ${tenant.website_published !== false ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  >
                    <span className={`inline-block w-5 h-5 bg-white rounded-full shadow transition-transform ${tenant.website_published !== false ? 'translate-x-8' : 'translate-x-1'}`} />
                  </button>
                </div>
                <div className={`flex items-center gap-2 text-xs font-bold ${tenant.website_published !== false ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${tenant.website_published !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {tenant.website_published !== false ? 'LIVE â€” Visible to patients' : 'OFFLINE â€” Coming Soon page shown'}
                </div>
                {tenant.website_published !== false && (
                  <a href={`/${tenant.tenant_slug}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:underline block">
                    View your live site â†’ clinicpage.in/{tenant.tenant_slug}
                  </a>
                )}
              </div>

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

                <div className="p-4 bg-slate-950/60 border border-slate-850 rounded-xl space-y-4 pt-4">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest block">Staff Passcode Configuration</span>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">STAFF ACCESS PIN (NUMERIC)</label>
                    <input 
                      type="text"
                      maxLength={6}
                      value={tenant.staff_pin || ''}
                      onChange={async (e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        await updateDoc(doc(db, 'tenants', tenantId), { staff_pin: val });
                        setTenant({ ...tenant, staff_pin: val });
                      }}
                      placeholder="e.g. 1234"
                      className="w-24 bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 font-bold tracking-widest text-center"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Set a simple passcode (e.g. 1234) for your reception/assistant staff. They can log in with your clinic email and this passcode to open the restricted staff dashboard.
                  </p>
                </div>
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
                    Renew Professional (â‚¹7,999/yr)
                  </button>
                  <button 
                    onClick={() => simulatePayment('pro_plus')}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-bold text-xs transition"
                  >
                    Upgrade to Pro+ (â‚¹9,999/yr)
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
                          <span className="font-bold text-emerald-400 block">â‚¹{tx.amount}</span>
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

          {/* PATIENTS TAB */}
          {activeTab === 'Patients' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">All patients registered via appointment bookings from your clinic site.</p>
                <span className="bg-emerald-950 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-900">{patients.length} total</span>
              </div>

              {patients.length === 0 ? (
                <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center">
                  <p className="text-slate-500 font-medium">No patients yet. Patients are auto-registered when they book an appointment.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-widest bg-slate-950/50">
                      <tr>
                        <th className="py-4 px-6 text-left">Patient Name</th>
                        <th className="py-4 px-6 text-left">Phone</th>
                        <th className="py-4 px-6 text-left">Email</th>
                        <th className="py-4 px-6 text-left">Gender / Age</th>
                        <th className="py-4 px-6 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {patients.map(p => (
                        <tr key={p.id} className="hover:bg-slate-850/30 transition">
                          <td className="py-4 px-6 font-bold text-white">{p.name}</td>
                          <td className="py-4 px-6">
                            <a href={`tel:${p.phone}`} className="text-emerald-400 hover:underline">{p.phone}</a>
                          </td>
                          <td className="py-4 px-6 text-slate-400">{p.email || 'â€”'}</td>
                          <td className="py-4 px-6 text-slate-400">{[p.gender, p.age ? `${p.age}y` : ''].filter(Boolean).join(' / ') || 'â€”'}</td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => {
                                setSelectedPatient(p);
                                setEditPatientForm({ ...p });
                                setPatientModalOpen(true);
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Patient Detail Modal */}
              {patientModalOpen && selectedPatient && editPatientForm && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPatientModalOpen(false)}>
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-8">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-black text-white">{selectedPatient.name}</h3>
                          <p className="text-xs text-slate-500 mt-1">{selectedPatient.phone} Â· {selectedPatient.email || 'No email'}</p>
                        </div>
                        <button onClick={() => setPatientModalOpen(false)} className="text-slate-500 hover:text-white text-2xl transition">âœ•</button>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Gender</label>
                            <select
                              value={editPatientForm.gender || ''}
                              onChange={e => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">Select</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Age</label>
                            <input
                              type="number"
                              value={editPatientForm.age || ''}
                              onChange={e => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                              placeholder="Age in years"
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Medical History</label>
                          <textarea
                            rows={3}
                            value={editPatientForm.medical_history || ''}
                            onChange={e => setEditPatientForm({ ...editPatientForm, medical_history: e.target.value })}
                            placeholder="Known conditions, allergies, past surgeries, etc."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Doctor's Notes</label>
                          <textarea
                            rows={3}
                            value={editPatientForm.notes || ''}
                            onChange={e => setEditPatientForm({ ...editPatientForm, notes: e.target.value })}
                            placeholder="Consultation notes, prescriptions, follow-up reminders..."
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                          />
                        </div>

                        <div className="pt-2">
                          <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Appointment History</h4>
                          {appointments.filter(a => a.patient_phone === selectedPatient.phone).length === 0 ? (
                            <p className="text-xs text-slate-600">No appointments on record.</p>
                          ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                              {appointments.filter(a => a.patient_phone === selectedPatient.phone).map(a => (
                                <div key={a.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-slate-200">{a.preferred_date} at {a.preferred_time}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${a.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-800' : a.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-slate-800 text-slate-400'}`}>
                                      {a.status}
                                    </span>
                                  </div>
                                  {a.complaint && <p className="text-slate-500 mt-1 leading-relaxed">{a.complaint}</p>}
                                  {a.notes && <p className="text-slate-400 mt-1 italic">{a.notes}</p>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              await setDoc(doc(db, 'tenants', tenantId, 'patients', selectedPatient.phone), editPatientForm, { merge: true });
                              setPatientModalOpen(false);
                              alert('Patient profile updated!');
                            } catch (err) {
                              alert('Failed to save: ' + err.message);
                            }
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-sm transition"
                        >
                          Save Patient Profile
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MESSAGES TAB */}
          {activeTab === 'Messages' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">Inquiries submitted via your public clinic website contact form.</p>
                <div className="flex items-center space-x-3">
                  <span className="bg-rose-950 text-rose-400 text-xs font-bold px-3 py-1 rounded-full border border-rose-900">{messages.filter(m => m.status === 'unread').length} unread</span>
                  <span className="bg-slate-800 text-slate-400 text-xs font-bold px-3 py-1 rounded-full">{messages.length} total</span>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="bg-slate-900 border border-slate-850 p-12 rounded-2xl text-center">
                  <p className="text-slate-500 font-medium">No messages received yet. Messages appear here when visitors contact you via your public site.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className={`bg-slate-900 border rounded-2xl p-6 transition ${msg.status === 'unread' ? 'border-rose-900/60 shadow-rose-950/30 shadow-lg' : 'border-slate-850'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-white">{msg.name}</span>
                            {msg.status === 'unread' && (
                              <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">New</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                            <a href={`tel:${msg.phone}`} className="text-emerald-400 hover:underline">{msg.phone}</a>
                            {msg.email && <a href={`mailto:${msg.email}`} className="hover:underline">{msg.email}</a>}
                            <span>{msg.created_at?.seconds ? new Date(msg.created_at.seconds * 1000).toLocaleString() : 'Just now'}</span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed bg-slate-950/40 p-3 rounded-lg">{msg.message}</p>
                        </div>

                        <div className="flex flex-col gap-2 min-w-fit">
                          <button
                            onClick={async () => {
                              const nextStatus = msg.status === 'unread' ? 'read' : 'unread';
                              await updateDoc(doc(db, 'tenants', tenantId, 'messages', msg.id), { status: nextStatus });
                            }}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-lg transition"
                          >
                            {msg.status === 'unread' ? 'âœ“ Mark Read' : 'â†© Mark Unread'}
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this message?')) {
                                await deleteDoc(doc(db, 'tenants', tenantId, 'messages', msg.id));
                              }
                            }}
                            className="bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 text-xs font-bold px-3 py-2 rounded-lg transition border border-rose-900/40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
