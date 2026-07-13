import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, getDoc, getDocs, query, where, collection, addDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { getThemeColor } from '../components/ThemeHelper';

export default function DoctorPublicSite() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // States
  const [tenantId, setTenantId] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [profile, setProfile] = useState(null);
  const [timings, setTimings] = useState(null);
  const [services, setServices] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [blogs, setBlogs] = useState([]);

  // Booking Form State
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [prefDate, setPrefDate] = useState('');
  const [prefTime, setPrefTime] = useState('');
  const [complaint, setComplaint] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  useEffect(() => {
    const fetchTenantData = async () => {
      try {
        const q = query(collection(db, 'tenants'), where('tenant_slug', '==', slug));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setErrorMsg('Clinic not found.');
          setLoading(false);
          return;
        }

        const tenantDoc = querySnapshot.docs[0];
        const tid = tenantDoc.id;
        setTenantId(tid);
        setTenant(tenantDoc.data());

        // Get profile, timings, services, gallery, blogs
        const profRef = doc(db, 'tenants', tid, 'profile', 'info');
        const timeRef = doc(db, 'tenants', tid, 'timings', 'info');

        const [profSnap, timeSnap, servSnap, galSnap, blogSnap] = await Promise.all([
          getDoc(profRef),
          getDoc(timeRef),
          getDocs(collection(db, 'tenants', tid, 'services')),
          getDocs(collection(db, 'tenants', tid, 'gallery')),
          getDocs(query(collection(db, 'tenants', tid, 'blogs'), where('published', '==', true)))
        ]);

        if (profSnap.exists()) setProfile(profSnap.data());
        if (timeSnap.exists()) setTimings(timeSnap.data());

        setServices(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setGallery(galSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setBlogs(blogSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setErrorMsg('Something went wrong.');
        setLoading(false);
      }
    };
    fetchTenantData();
  }, [slug]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'appointments'), {
        patient_name: patientName,
        patient_phone: patientPhone,
        patient_email: patientEmail,
        preferred_date: prefDate,
        preferred_time: prefTime,
        complaint: complaint,
        status: 'pending',
        created_at: new Date(),
        notified_doctor: false,
        whatsapp_sent: false,
        notes: ''
      });

      // Auto-onboard/register patient profile in Firestore
      const patientDocRef = doc(db, 'tenants', tenantId, 'patients', patientPhone.trim());
      const patientSnap = await getDoc(patientDocRef);
      if (!patientSnap.exists()) {
        await setDoc(patientDocRef, {
          name: patientName.trim(),
          phone: patientPhone.trim(),
          email: patientEmail.trim(),
          gender: '',
          age: '',
          medical_history: '',
          notes: '',
          created_at: new Date()
        });
      }

      // Simple WhatsApp alert request simulation
      if (tenant.whatsapp_notify_enabled) {
        const messageText = `New Appointment! Patient: ${patientName}. Phone: ${patientPhone}. Date: ${prefDate}. Time: ${prefTime}.`;
        const encodedMsg = encodeURIComponent(messageText);
        const notifyUrl = `https://api.callmebot.com/whatsapp.php?phone=${tenant.contact_phone}&text=${encodedMsg}&apikey=${tenant.callmebot_api_key}`;
        
        // Non-blocking fetch simulation
        fetch(notifyUrl).catch(e => console.log('CallMeBot notification sent'));
      }

      setBookingSuccess(true);
      setPatientName('');
      setPatientPhone('');
      setPatientEmail('');
      setPrefDate('');
      setPrefTime('');
      setComplaint('');
    } catch (err) {
      alert('Failed to book appointment: ' + err.message);
    }
    setBookingLoading(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim() || !contactMessage.trim()) {
      alert('Please fill in all required fields.');
      return;
    }
    setContactLoading(true);
    try {
      await addDoc(collection(db, 'tenants', tenantId, 'messages'), {
        name: contactName.trim(),
        phone: contactPhone.trim(),
        email: contactEmail.trim(),
        message: contactMessage.trim(),
        status: 'unread',
        created_at: new Date()
      });
      setContactSuccess(true);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactMessage('');
      setTimeout(() => setContactSuccess(false), 4000);
    } catch (err) {
      alert('Failed to send message: ' + err.message);
    }
    setContactLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
        <span className="animate-pulse text-lg">Loading clinic details...</span>
      </div>
    );
  }

  if (errorMsg || !profile) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400">
        <h2 className="text-2xl font-bold text-white mb-4">{errorMsg || 'Clinic Details Missing'}</h2>
        <Link to="/" className="text-emerald-400 hover:underline">Back to ClinicPage homepage</Link>
      </div>
    );
  }

  // Website unpublished gate — show Coming Soon
  if (tenant && tenant.website_published === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-6">
        <div className="text-6xl mb-6">🏥</div>
        <h1 className="text-3xl font-black text-white mb-3">{profile.clinic_name}</h1>
        <p className="text-slate-400 text-sm mb-2">{profile.salutation} {profile.doctor_name} · {profile.speciality}</p>
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-sm w-full space-y-4">
          <h2 className="text-lg font-bold text-white">Website Coming Soon</h2>
          <p className="text-slate-400 text-sm leading-relaxed">This clinic's website is being set up. Check back soon or contact us directly.</p>
          <div className="space-y-2 pt-2">
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition">
                📞 {profile.phone}
              </a>
            )}
            {profile.whatsapp_number && (
              <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#25d366] hover:bg-[#20ba5a] text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition">
                💬 Chat on WhatsApp
              </a>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-8">Powered by <Link to="/" className="text-emerald-500/80 hover:underline">ClinicPage</Link></p>
      </div>
    );
  }

  const themeClasses = getThemeColor(profile.theme_color);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col scroll-smooth">
      {/* Header / Nav */}
      <header className="border-b border-slate-900 bg-slate-900/90 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">{profile.clinic_name}</h1>
            <p className="text-xs text-slate-400">{profile.salutation} {profile.doctor_name}</p>
          </div>
          <nav className="hidden lg:flex space-x-6 text-sm font-semibold text-slate-300">
            <a href="#about" className="hover:text-emerald-400 transition">About</a>
            <a href="#services" className="hover:text-emerald-400 transition">Services</a>
            <a href="#timings" className="hover:text-emerald-400 transition">OPD Timings</a>
            <a href="#book" className="hover:text-emerald-400 transition">Book Appointment</a>
            {gallery.length > 0 && <a href="#gallery" className="hover:text-emerald-400 transition">Gallery</a>}
            {blogs.length > 0 && <a href="#blogs" className="hover:text-emerald-400 transition">Health Tips</a>}
            <a href="#contact" className="hover:text-emerald-400 transition">Contact</a>
          </nav>
          <a href="#book" className={`${themeClasses.bg} ${themeClasses.hover} text-white font-bold px-4 py-2 rounded-lg text-sm transition`}>
            Book Appointment
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-12 gap-12 items-center">
        <div className="md:col-span-7 space-y-6">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-900/60 px-3 py-1 rounded-full">{profile.speciality}</span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {profile.salutation} {profile.doctor_name}
          </h2>
          <p className="text-lg text-slate-400 font-medium">
            {profile.tagline}
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {profile.degrees.map((deg, i) => (
              <span key={i} className="bg-slate-900 border border-slate-800 text-slate-300 px-3 py-1 rounded-lg text-xs font-bold">{deg}</span>
            ))}
          </div>
          <p className="text-slate-400 text-sm">
            MMC Reg No: <span className="text-slate-200 font-semibold">{profile.registration_number}</span> | {profile.experience_years} Years Experience
          </p>
          <div className="flex gap-4 pt-4">
            <a href="#book" className={`${themeClasses.bg} ${themeClasses.hover} text-white px-6 py-3 rounded-xl font-bold transition shadow-lg`}>Book Now</a>
            <a href={`tel:${profile.phone}`} className="bg-slate-900 border border-slate-800 hover:bg-slate-850 px-6 py-3 rounded-xl font-semibold text-slate-300 transition">Call Clinic</a>
          </div>
        </div>
        <div className="md:col-span-5 flex justify-center">
          <div className="relative p-2 border border-slate-800 rounded-3xl bg-slate-900/60">
            <img 
              src={profile.photo_url} 
              alt={profile.doctor_name} 
              className="w-80 h-96 object-cover rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20 bg-slate-900/40 border-y border-slate-900 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <h3 className="text-2xl font-bold text-white border-b border-slate-800 pb-3">About the Doctor</h3>
          <p className="text-slate-300 leading-relaxed text-base">{profile.bio}</p>
          <div className="grid sm:grid-cols-2 gap-6 pt-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Affiliations</h4>
              <ul className="space-y-1 text-sm text-slate-300">
                {profile.affiliations?.map((af, i) => <li key={i}>• {af}</li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Languages Spoken</h4>
              <p className="text-sm text-slate-300">{profile.languages?.join(', ')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h3 className="text-2xl font-bold text-white mb-12 text-center">Services & Treatments</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.filter(s => s.active).map(s => (
            <div key={s.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-850 hover:border-slate-800 transition">
              <span className="text-3xl mb-4 block">{s.icon || '🩺'}</span>
              <h4 className="text-lg font-bold text-white">{s.title}</h4>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timings */}
      <section id="timings" className="py-20 bg-slate-900/40 border-y border-slate-900 px-6">
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">OPD Consultation Timings</h3>
          {timings?.notice && (
            <div className="bg-amber-950/60 border border-amber-800 text-amber-300 px-4 py-3 rounded-xl text-xs font-semibold mb-6 text-center">
              ⚠️ NOTICE: {timings.notice}
            </div>
          )}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 text-left">
                  <th className="px-6 py-4 font-semibold">Day</th>
                  <th className="px-6 py-4 font-semibold">Morning Session</th>
                  <th className="px-6 py-4 font-semibold">Evening Session</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((day) => {
                  const t = timings?.[day];
                  const dayNames = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
                  return (
                    <tr key={day} className="hover:bg-slate-850/50">
                      <td className="px-6 py-4 font-semibold text-white">{dayNames[day]}</td>
                      {t?.closed ? (
                        <td colSpan="2" className="px-6 py-4 text-rose-400 font-semibold text-center bg-rose-950/20">Closed / Holiday</td>
                      ) : (
                        <>
                          <td className="px-6 py-4">{t?.open ? `${t.open} - ${t.close}` : 'Closed'}</td>
                          <td className="px-6 py-4">{t?.second_open ? `${t.second_open} - ${t.second_close}` : 'Closed'}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section id="book" className="py-20 px-6 max-w-4xl mx-auto w-full">
        <h3 className="text-2xl font-bold text-white mb-4 text-center">Book Your Consult Slot</h3>
        <p className="text-slate-400 text-sm text-center mb-8">No login required. Submit details and we will verify via phone or WhatsApp.</p>
        
        {bookingSuccess ? (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 p-8 rounded-2xl text-center space-y-4 shadow-xl">
            <span className="text-4xl">🎉</span>
            <h4 className="text-xl font-bold text-white">Booking Request Submitted!</h4>
            <p className="text-sm text-slate-300">We have recorded your appointment. Clinic staff will verify details and reach out shortly.</p>
            <button onClick={() => setBookingSuccess(false)} className={`${themeClasses.bg} ${themeClasses.hover} text-white font-bold px-6 py-2 rounded-xl text-sm transition mt-4`}>
              Book Another Slot
            </button>
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="bg-slate-900 border border-slate-850 p-8 rounded-2xl grid md:grid-cols-2 gap-6 shadow-2xl">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">PATIENT FULL NAME *</label>
              <input 
                type="text" 
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="eg. Suresh Shinde"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">PHONE NUMBER (WHATSAPP CAPABLE) *</label>
              <input 
                type="tel" 
                value={patientPhone}
                onChange={e => setPatientPhone(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="eg. +919876543210"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-2">EMAIL ADDRESS (OPTIONAL)</label>
              <input 
                type="email" 
                value={patientEmail}
                onChange={e => setPatientEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                placeholder="suresh@gmail.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">DATE *</label>
                <input 
                  type="date" 
                  value={prefDate}
                  onChange={e => setPrefDate(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">TIME *</label>
                <input 
                  type="time" 
                  value={prefTime}
                  onChange={e => setPrefTime(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-slate-400 block mb-2">CHIEF COMPLAINT / REASON FOR VISIT</label>
              <textarea 
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 text-sm focus:outline-none focus:border-emerald-500 h-24 resize-none"
                placeholder="Describe your health issue briefly (eg. Fever and cold since 3 days)"
              />
            </div>
            <button 
              type="submit" 
              disabled={bookingLoading}
              className={`md:col-span-2 ${themeClasses.bg} ${themeClasses.hover} text-white font-black py-4 rounded-xl transition text-base`}
            >
              {bookingLoading ? 'Submitting booking details...' : 'Submit Booking Request'}
            </button>
          </form>
        )}
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section id="gallery" className="py-20 bg-slate-900/40 border-y border-slate-900 px-6">
          <div className="max-w-7xl mx-auto w-full">
            <h3 className="text-2xl font-bold text-white mb-12 text-center">Clinic Gallery</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map(img => (
                <div key={img.id} className="relative group overflow-hidden border border-slate-800 rounded-2xl bg-slate-950">
                  <img src={img.image_url} alt={img.caption} className="w-full h-64 object-cover group-hover:scale-105 transition duration-300" />
                  {img.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 p-3 text-xs text-slate-300 border-t border-slate-850">
                      {img.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Health Tips / Blogs */}
      {blogs.length > 0 && (
        <section id="blogs" className="py-20 px-6 max-w-7xl mx-auto w-full">
          <h3 className="text-2xl font-bold text-white mb-12 text-center">Health Tips & Articles</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map(b => (
              <div key={b.id} className="bg-slate-900 rounded-2xl border border-slate-850 p-6 flex flex-col justify-between hover:border-slate-800 transition">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date(b.created_at?.seconds * 1000).toDateString()}</span>
                  <h4 className="text-lg font-bold text-white mt-2 mb-3">{b.title}</h4>
                  <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">{b.body_markdown}</p>
                </div>
                <Link to={`/${slug}/blog/${b.slug}`} className={`${themeClasses.text} text-xs font-bold hover:underline mt-6 block`}>Read Full Article →</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Location / Contact */}
      <section id="contact" className="py-20 bg-slate-900/40 border-t border-slate-900 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16">
          {/* Left Column: Contact info & Map */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">Find Us</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{profile.clinic_address}</p>
              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-3 text-slate-300">
                  <span className="text-emerald-400 text-lg">📞</span>
                  <a href={`tel:${profile.phone}`} className="hover:underline text-sm font-semibold">{profile.phone}</a>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <span className="text-emerald-400 text-lg">✉️</span>
                  <a href={`mailto:${profile.email}`} className="hover:underline text-sm">{profile.email}</a>
                </div>
                <div className="flex items-center space-x-3 text-slate-300">
                  <span className="text-emerald-400 text-lg">💬</span>
                  <a href={`https://wa.me/${profile.whatsapp_number}`} target="_blank" rel="noreferrer" className="hover:underline text-sm font-semibold">Chat on WhatsApp</a>
                </div>
              </div>
            </div>
            {profile.map_embed_url && (
              <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                <iframe 
                  src={profile.map_embed_url} 
                  className="w-full h-full border-0" 
                  allowFullScreen="" 
                  loading="lazy" 
                  title="Clinic Coordinates Map"
                />
              </div>
            )}
          </div>

          {/* Right Column: Contact form */}
          <div className="bg-slate-900 border border-slate-850 p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2">Send Message</h3>
            <p className="text-xs text-slate-400 mb-6">Have an inquiry? Fill in the form and the clinic staff will revert soon.</p>

            {contactSuccess && (
              <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-400 p-3 rounded-lg text-xs font-bold mb-4">
                Your message has been sent successfully!
              </div>
            )}

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">FULL NAME *</label>
                <input 
                  type="text" 
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">PHONE NUMBER *</label>
                  <input 
                    type="tel" 
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="99999 99999"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-2">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-2">YOUR MESSAGE *</label>
                <textarea 
                  rows={4}
                  value={contactMessage}
                  onChange={e => setContactMessage(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:border-emerald-500 text-sm resize-none"
                  placeholder="Describe your query or requirement..."
                />
              </div>
              <button 
                type="submit" 
                disabled={contactLoading}
                className={`w-full font-black py-3 rounded-lg text-sm transition ${themeClasses.bg} ${themeClasses.hover} text-white flex justify-center items-center`}
              >
                {contactLoading ? 'Sending...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Floating WhatsApp Button */}
      {profile.whatsapp_number && (
        <a 
          href={`https://wa.me/${profile.whatsapp_number}`} 
          target="_blank" 
          rel="noreferrer" 
          className="fixed bottom-6 right-6 bg-[#25d366] hover:bg-[#20ba5a] text-white p-4 rounded-full shadow-2xl transition z-50 transform hover:scale-105"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6c-3.314 0-6 2.686-6 6 0 1.052.272 2.08.79 2.986l-.842 3.076 3.149-.824A5.962 5.962 0 0 0 12.031 18c3.314 0 6-2.686 6-6s-2.686-6-6-6zm0 11c-1.009 0-1.954-.262-2.784-.718l-.2-.119-2.072.542.551-2.012-.132-.211A4.953 4.953 0 0 1 7.031 12c0-2.757 2.243-5 5-5s5 2.243 5 5-2.243 5-5 5z"/></svg>
        </a>
      )}

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-sm text-slate-500">
        <p>© 2026 {profile.clinic_name}. All rights reserved.</p>
        <p className="mt-2 text-xs text-slate-600">Website hosted on <Link to="/" className="text-emerald-500/80 hover:underline">ClinicPage</Link> platform. iCoded Automation.</p>
      </footer>
    </div>
  );
}
