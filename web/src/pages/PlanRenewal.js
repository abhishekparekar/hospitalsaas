import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const PLANS = [
  { key: 'basic', label: 'Basic', price: 4999, features: ['1 Clinic Website', 'Appointment Booking', 'OPD Timings', 'Basic Gallery', 'WhatsApp Alerts'] },
  { key: 'professional', label: 'Professional', price: 7999, features: ['Everything in Basic', 'Unlimited Gallery', 'Blog Manager', 'SEO Tools', 'Priority Support', 'Custom Theme'], recommended: true },
  { key: 'pro_plus', label: 'Pro+ Custom', price: 12999, features: ['Everything in Professional', 'Custom Domain', 'Advanced Analytics', 'API Access', 'Dedicated Manager'] },
];

export default function PlanRenewal() {
  const [tenant, setTenant] = useState(null);
  const [tenantId, setTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/admin'); return; }
      const tSnap = await getDoc(doc(db, 'tenants', user.uid));
      if (tSnap.exists()) {
        setTenant(tSnap.data());
        setTenantId(user.uid);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [navigate]);

  const handleRenew = async (planKey, price) => {
    setPaying(planKey);
    try {
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      const txn = {
        id: `PAY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        amount: price,
        plan: planKey,
        status: 'paid',
        date: new Date(),
      };
      const prev = tenant?.payment_history || [];
      await updateDoc(doc(db, 'tenants', tenantId), {
        plan: planKey,
        plan_expiry: expiry,
        status: 'active',
        payment_history: [txn, ...prev],
      });
      navigate('/admin/dashboard');
    } catch (err) {
      alert('Payment failed: ' + err.message);
    }
    setPaying(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
      <span className="animate-pulse">Loading your account...</span>
    </div>
  );

  const expiryDate = tenant?.plan_expiry?.seconds ? new Date(tenant.plan_expiry.seconds * 1000).toLocaleDateString() : 'Unknown';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-16">
      {/* Expired Alert */}
      <div className="max-w-2xl w-full mb-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-950 border-2 border-rose-700 mb-6">
          <span className="text-4xl">??</span>
        </div>
        <h1 className="text-3xl font-black text-white mb-3">Your Plan Has Expired</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Your <span className="text-white font-bold uppercase">{tenant?.plan || 'plan'}</span> subscription expired on <span className="text-rose-400 font-bold">{expiryDate}</span>.
          <br />Your clinic website is currently paused. Renew to restore access.
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid sm:grid-cols-3 gap-6 max-w-5xl w-full">
        {PLANS.map(plan => (
          <div key={plan.key} className={`bg-slate-900 border rounded-3xl p-7 flex flex-col relative ${plan.recommended ? 'border-emerald-500 shadow-emerald-500/20 shadow-2xl' : 'border-slate-800'}`}>
            {plan.recommended && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded-full">
                Recommended
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-lg font-black text-white">{plan.label}</h3>
              <div className="flex items-baseline mt-2">
                <span className="text-4xl font-black text-white">?{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-slate-500 text-sm ml-2">/year</span>
              </div>
            </div>
            <ul className="space-y-2.5 flex-grow mb-7">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 font-bold mt-0.5">?</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleRenew(plan.key, plan.price)}
              disabled={!!paying}
              className={`w-full py-3 rounded-xl font-black text-sm transition disabled:opacity-60 ${plan.recommended ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
            >
              {paying === plan.key ? 'Processing...' : `Renew ${plan.label}`}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-600 mt-10 text-center">
        Payment is simulated for demo purposes. Contact <span className="text-slate-400">support@icoded.in</span> for real billing.
      </p>
    </div>
  );
}
