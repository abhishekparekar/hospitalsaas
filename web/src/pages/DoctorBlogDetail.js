import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../firebase';

export default function DoctorBlogDetail() {
  const { slug, blogSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [blog, setBlog] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const q = query(collection(db, 'tenants'), where('tenant_slug', '==', slug));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
          setLoading(false);
          return;
        }

        const tid = querySnapshot.docs[0].id;
        const profRef = doc(db, 'tenants', tid, 'profile', 'info');
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) setProfile(profSnap.data());

        const blogQuery = query(collection(db, 'tenants', tid, 'blogs'), where('slug', '==', blogSlug));
        const blogSnap = await getDocs(blogQuery);
        if (!blogSnap.empty) {
          setBlog(blogSnap.docs[0].data());
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchBlog();
  }, [slug, blogSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex justify-center items-center text-slate-400">
        <span className="animate-pulse">Loading tip details...</span>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400">
        <h2 className="text-xl font-bold text-white mb-4">Blog post not found.</h2>
        <button onClick={() => navigate(`/${slug}`)} className="text-emerald-400 hover:underline">Back to clinic</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <header className="border-b border-slate-900 bg-slate-900/90 py-6 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h2 className="text-lg font-bold text-white">{profile?.clinic_name || 'Clinic Details'}</h2>
          <button onClick={() => navigate(`/${slug}`)} className="text-sm font-semibold text-emerald-400 hover:underline">← Back to Clinic Website</button>
        </div>
      </header>

      <main className="flex-grow max-w-3xl mx-auto py-16 px-6 w-full space-y-6">
        <span className="text-xs font-bold text-slate-500 tracking-wider block uppercase">HEALTH TIPS ARTICLE</span>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">{blog.title}</h1>
        <div className="border-y border-slate-900 py-4 flex justify-between items-center text-xs text-slate-500">
          <span>By {profile?.salutation} {profile?.doctor_name}</span>
          <span>Published: {new Date(blog.created_at?.seconds * 1000).toDateString()}</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-lg whitespace-pre-line pt-4">{blog.body_markdown}</p>
      </main>

      <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-sm text-slate-600">
        <p>© 2026 {profile?.clinic_name}. All rights reserved.</p>
      </footer>
    </div>
  );
}
