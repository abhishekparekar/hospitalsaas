import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { query, collection, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupSlug, setSignupSlug] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [staffPin, setStaffPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const uid = cred.user.uid;

      // 1. Check user role mapping first (doctors, staff, & superadmins are mapped here)
      let matchedRole = null;
      let staffTenantId = null;

      const superAdminEmails = ['icoded@gmail.com', 'superadmin@clinicpage.in', 'admin@clinicpage.in'];
      const isSuperAdminEmail = superAdminEmails.includes(email.toLowerCase());

      if (isSuperAdminEmail) {
        matchedRole = 'superadmin';
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
        try {
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            matchedRole = userData.role;
            staffTenantId = userData.tenant_id;
          }
        } catch (err) {
          console.warn("Could not check users collection:", err.message);
        }
      }

      // Route Super Admins
      if (matchedRole === 'superadmin') {
        sessionStorage.setItem('sa_auth', '1');
        sessionStorage.setItem('user_role', 'superadmin');
        navigate('/superadmin');
        setLoginLoading(false);
        return;
      }

      // Route Staff accounts (if they have a dedicated account)
      if (matchedRole === 'staff' && staffTenantId) {
        const tenantRef = doc(db, 'tenants', staffTenantId);
        const tenantSnap = await getDoc(tenantRef);

        if (tenantSnap.exists()) {
          const tenantData = tenantSnap.data();
          if (tenantData.status === 'suspended') {
            setError('This clinic account has been suspended by the administrator.');
            setLoginLoading(false);
            return;
          }
          const expiry = tenantData.plan_expiry?.seconds * 1000;
          const isExpired = expiry && expiry < Date.now();
          if (isExpired) {
            setError('This clinic subscription has expired. Please contact your doctor administrator.');
            setLoginLoading(false);
            return;
          }
        }
        sessionStorage.setItem('user_role', 'staff');
        sessionStorage.setItem('staff_tenant_id', staffTenantId);
        navigate('/admin/dashboard');
        setLoginLoading(false);
        return;
      }

      // Route normal Doctors (or shared PIN staff login)
      let targetTenantId = uid;
      const tenantRef = doc(db, 'tenants', targetTenantId);
      const tenantSnap = await getDoc(tenantRef);

      if (tenantSnap.exists()) {
        const tenantData = tenantSnap.data();
        
        // Block if tenant is suspended
        if (tenantData.status === 'suspended') {
          setError('This clinic account has been suspended by the administrator.');
          setLoginLoading(false);
          return;
        }

        // Validate Staff Passcode PIN if logging in as staff via shared email
        if (isStaff) {
          const configuredPin = tenantData.staff_pin || '1234';
          if (staffPin !== configuredPin) {
            setError('Incorrect Staff Passcode PIN. Access denied.');
            setLoginLoading(false);
            return;
          }
        }

        const expiry = tenantData.plan_expiry?.seconds * 1000;
        const isExpired = expiry && expiry < Date.now();
        if (isExpired) {
          navigate('/admin/renew');
          setLoginLoading(false);
          return;
        }
      }

      sessionStorage.setItem('user_role', isStaff ? 'staff' : (matchedRole || 'doctor'));
      if (isStaff) {
        sessionStorage.setItem('staff_tenant_id', uid);
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    }
    setLoginLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!signupSlug.trim()) {
      setError('Please provide a unique clinic URL slug.');
      return;
    }
    const cleanSlug = signupSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    try {
      const q = query(collection(db, 'tenants'), where('tenant_slug', '==', cleanSlug));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setError('Clinic URL Slug is already taken.');
        return;
      }

      const res = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      const uid = res.user.uid;

      // 1. Create the tenant configuration document
      const tenantRef = doc(db, 'tenants', uid);
      await setDoc(tenantRef, {
        tenant_slug: cleanSlug,
        status: 'active',
        plan: 'professional',
        plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        created_at: new Date(),
        owner_uid: uid,
        contact_email: signupEmail,
        contact_phone: '',
        whatsapp_notify_enabled: false,
        callmebot_api_key: '',
        website_published: true,
        user_type: 'doctor'
      });

      // 2. Create the doctor's profile document with derived values
      const profileRef = doc(db, 'tenants', uid, 'profile', 'info');
      const derivedDoctorName = 'Dr. ' + signupEmail.split('@')[0].split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
        email: signupEmail,
        theme_color: "#1e40af"
      });

      // 3. Create default timings config
      const timingsRef = doc(db, 'tenants', uid, 'timings', 'info');
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
        const userDocRef = doc(db, 'users', uid);
        await setDoc(userDocRef, {
          role: 'doctor',
          tenant_id: uid,
          name: derivedDoctorName
        });
      } catch (err) {
        console.warn("Could not save to users collection:", err.message);
      }

      setSignupSuccess(true);
      setEmail(signupEmail);
      setPassword(signupPassword);
      setTimeout(() => {
        setIsRegistering(false);
        setSignupSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4">
      <Link to="/" className="mb-8 flex items-center space-x-2 text-slate-400 hover:text-white transition">
        <span>← Back to Platform</span>
      </Link>
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isRegistering ? 'Doctor Registration' : 'Doctor Admin Area'}
        </h2>

        {error && (
          <div className="bg-red-950/60 border border-red-800 text-red-400 p-3 rounded-lg mb-4 text-xs font-semibold">
            {error}
          </div>
        )}

        {signupSuccess && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 p-3 rounded-lg mb-4 text-xs font-semibold">
            Registration successful! Seeding clinic database...
          </div>
        )}

        {!isRegistering ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="doctor@example.com"
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
            <div className="space-y-3 pt-2">
              <label className="flex items-center space-x-3 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={isStaff}
                  onChange={e => setIsStaff(e.target.checked)}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500 bg-slate-950 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-400">Log in as Staff Member</span>
              </label>

              {isStaff && (
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-lg space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 block">STAFF ACCESS PIN</label>
                  <input 
                    type="password"
                    maxLength={6}
                    value={staffPin}
                    onChange={e => setStaffPin(e.target.value.replace(/[^0-9]/g, ''))}
                    required
                    placeholder="Enter Staff PIN (e.g. 1234)"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-emerald-500 text-center tracking-widest font-black"
                  />
                </div>
              )}
            </div>
            <button disabled={loginLoading} className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 font-black py-3 rounded-lg text-sm transition">
              {loginLoading ? 'Checking subscription...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">CLINIC URL SLUG (e.g. dr-patil-csn)</label>
              <div className="flex">
                <span className="bg-slate-950 border border-r-0 border-slate-800 text-slate-500 px-3 py-3 text-xs rounded-l-lg select-none">clinicpage.in/</span>
                <input 
                  type="text" 
                  value={signupSlug}
                  onChange={e => setSignupSlug(e.target.value)}
                  required
                  className="flex-grow bg-slate-950 border border-slate-800 rounded-r-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="dr-patil-csn"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">EMAIL ADDRESS</label>
              <input 
                type="email" 
                value={signupEmail}
                onChange={e => setSignupEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showSignupPassword ? 'text' : 'password'} 
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-4 pr-12 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold transition focus:outline-none uppercase"
                >
                  {showSignupPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-lg text-sm transition">
              Create Clinic & Register
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className="text-xs font-semibold text-emerald-400 hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign In' : 'New Doctor? Register your clinic here'}
          </button>
        </div>
      </div>
    </div>
  );
}
