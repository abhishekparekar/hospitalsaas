import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { seedDoctorData } from '../services/seedData';

export default function DoctorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupSlug, setSignupSlug] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    }
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

      // Seed standard data for doctor on register
      await seedDoctorData(uid, cleanSlug);

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
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="••••••••"
              />
            </div>
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-lg text-sm transition">
              Sign In
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
              <input 
                type="password" 
                value={signupPassword}
                onChange={e => setSignupPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                placeholder="••••••••"
              />
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
