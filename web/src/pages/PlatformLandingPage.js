import React from 'react';
import { Link } from 'react-router-dom';

export default function PlatformLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-slate-950 font-black p-2 rounded-xl text-lg">CP</div>
            <span className="text-xl font-bold tracking-tight text-white">ClinicPage</span>
          </div>
          <nav className="hidden md:flex space-x-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition">Features</a>
            <a href="#pricing" className="hover:text-emerald-400 transition">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition">FAQs</a>
          </nav>
          <div className="flex space-x-4">
            <Link to="/admin" className="px-4 py-2 text-sm text-slate-300 hover:text-white transition font-medium">Doctor Login</Link>
            <Link to="/superadmin" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg text-sm font-semibold transition">Super Admin</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-24 px-6 max-w-7xl mx-auto text-center flex-grow flex flex-col justify-center items-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.1),transparent_60%)] -z-10" />
        <span className="text-emerald-400 text-sm font-bold tracking-widest uppercase mb-4 block bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full">SaaS Platform for Doctors</span>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight max-w-4xl leading-tight">
          Your Professional Clinic Website <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Created in Seconds</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl">
          Get a dynamic public website at <code className="text-emerald-300">clinicpage.in/your-name</code>, a comprehensive admin dashboard, real-time appointment bookings, and instant WhatsApp alerts.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link to="/admin" className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-8 py-4 rounded-xl text-lg font-bold shadow-lg shadow-emerald-500/20 transition">
            Register Clinic Dashboard
          </Link>
          <a href="#pricing" className="bg-slate-900 border border-slate-800 hover:bg-slate-850 px-8 py-4 rounded-xl text-lg font-semibold transition text-white">
            View Pricing Plans
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-slate-900/50 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">Everything Your Practice Needs</h2>
            <p className="text-slate-400 mt-4">One single platform built to streamline patient bookings, share health tips, and grow your digital reputation.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition">
              <div className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 p-3 rounded-xl w-fit mb-6">🩺</div>
              <h3 className="text-xl font-bold text-white">Dynamic Doctor Profile</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">Display degrees, affiliations, MMC registration number, map coordinates, and select themes matching your brand.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition">
              <div className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 p-3 rounded-xl w-fit mb-6">📅</div>
              <h3 className="text-xl font-bold text-white">OPD Booking Manager</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">Patients schedule slots easily without registration. You confirm or cancel bookings from your laptop or mobile screen.</p>
            </div>
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800/80 hover:border-emerald-500/30 transition">
              <div className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 p-3 rounded-xl w-fit mb-6">💬</div>
              <h3 className="text-xl font-bold text-white">WhatsApp Notifications</h3>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">Get instant WhatsApp notifications when new bookings arrive, keeping you updated even on the go.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Honest, Predictable Pricing</h2>
          <p className="text-slate-400 mt-4">Select the perfect tier to grow your digital clinic page. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Basic */}
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Basic</span>
              <div className="flex items-baseline mt-4 mb-6">
                <span className="text-4xl font-extrabold text-white">₹4,999</span>
                <span className="text-slate-400 text-sm ml-2">/one-time + ₹2.4k/yr</span>
              </div>
              <ul className="space-y-4 text-slate-300 text-sm border-t border-slate-800 pt-6">
                <li>✓ 5-page public website</li>
                <li>✓ Basic Admin dashboard</li>
                <li>✓ Appointment booking form</li>
                <li>✓ 10 Gallery images</li>
                <li className="text-slate-500">✗ WhatsApp alerts</li>
                <li className="text-slate-500">✗ Custom domain support</li>
              </ul>
            </div>
            <Link to="/admin" className="mt-8 bg-slate-800 hover:bg-slate-750 text-white font-bold py-3 rounded-xl text-center transition">Get Started</Link>
          </div>

          {/* Pro */}
          <div className="bg-slate-900 p-8 rounded-2xl border-2 border-emerald-500/80 relative flex flex-col justify-between shadow-2xl shadow-emerald-500/5">
            <span className="absolute -top-3 right-6 bg-emerald-500 text-slate-950 font-black px-3 py-1 rounded-full text-xs uppercase tracking-widest">Recommended</span>
            <div>
              <span className="text-emerald-400 font-bold uppercase text-xs tracking-wider">Professional</span>
              <div className="flex items-baseline mt-4 mb-6">
                <span className="text-4xl font-extrabold text-white">₹7,999</span>
                <span className="text-slate-400 text-sm ml-2">/year</span>
              </div>
              <ul className="space-y-4 text-slate-300 text-sm border-t border-slate-800 pt-6">
                <li>✓ 9-section premium website</li>
                <li>✓ Pro Admin panel</li>
                <li>✓ Appointment booking</li>
                <li>✓ 30 Gallery images</li>
                <li>✓ Health tips / Blog (50 posts)</li>
                <li>✓ WhatsApp notifications</li>
                <li className="text-slate-500">✗ Custom domain support</li>
              </ul>
            </div>
            <Link to="/admin" className="mt-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl text-center transition">Get Started</Link>
          </div>

          {/* Pro+ */}
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Pro+ Custom</span>
              <div className="flex items-baseline mt-4 mb-6">
                <span className="text-4xl font-extrabold text-white">₹9,999</span>
                <span className="text-slate-400 text-sm ml-2">/year</span>
              </div>
              <ul className="space-y-4 text-slate-300 text-sm border-t border-slate-800 pt-6">
                <li>✓ Everything in Professional</li>
                <li>✓ Custom domain mapping</li>
                <li>✓ 50 Gallery images</li>
                <li>✓ Unlimited blog posts</li>
                <li>✓ Export appointments to CSV</li>
                <li>✓ Priority support & SEO setup</li>
              </ul>
            </div>
            <Link to="/admin" className="mt-8 bg-slate-800 hover:bg-slate-750 text-white font-bold py-3 rounded-xl text-center transition">Get Started</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-sm text-slate-500 mt-auto">
        <p>© 2026 ClinicPage. Built by iCoded Automation Pvt. Ltd. All rights reserved.</p>
      </footer>
    </div>
  );
}
