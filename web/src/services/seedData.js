import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

export const seedDoctorData = async (tenantId, slug) => {
  const tenantDocRef = doc(db, 'tenants', tenantId);
  const profileDocRef = doc(db, 'tenants', tenantId, 'profile', 'info');
  const timingsDocRef = doc(db, 'tenants', tenantId, 'timings', 'info');

  await setDoc(tenantDocRef, {
    tenant_slug: slug,
    status: 'active',
    plan: 'professional',
    plan_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    owner_uid: tenantId,
    contact_email: 'drpatil@gmail.com',
    contact_phone: '+919370000000',
    whatsapp_notify_enabled: true,
    callmebot_api_key: '123456'
  });

  await setDoc(profileDocRef, {
    doctor_name: "Dr. Rajesh Patil",
    salutation: "Dr.",
    photo_url: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80",
    speciality: "General Physician & Diabetologist",
    tagline: "15+ Years of Trusted Care in Aurangabad",
    degrees: ["MBBS", "MD (Medicine)"],
    registration_number: "MMC-2009-12345",
    experience_years: 15,
    languages: ["Marathi", "Hindi", "English"],
    affiliations: ["Government Medical College, Aurangabad", "Apollo Clinic"],
    bio: "Dr. Rajesh Patil has been serving patients in CIDCO, Chhatrapati Sambhaji Nagar since 2009. He is dedicated to providing comprehensive and compassionate primary healthcare and specialized diabetes management.",
    clinic_name: "Patil Medical Centre",
    clinic_address: "Shop No. 5, N-7 CIDCO, Chh. Sambhaji Nagar - 431003",
    map_embed_url: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3752.1287954157155!2d75.36192257522302!3d19.876796381498687!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bdb980f83733ddb%3A0xe1db3a47940b5402!2sN-7%20Cidco%20Aurangabad!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin",
    phone: "+912402340000",
    whatsapp_number: "+919370000000",
    email: "drpatil@patilclinic.in",
    theme_color: "#1e40af"
  });

  await setDoc(timingsDocRef, {
    mon: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
    tue: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
    wed: { open: "09:00", close: "13:00", second_open: null, second_close: null, closed: false },
    thu: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
    fri: { open: "09:00", close: "13:00", second_open: "17:00", second_close: "21:00", closed: false },
    sat: { open: "09:00", close: "14:00", second_open: null, second_close: null, closed: false },
    sun: { open: null, close: null, second_open: null, second_close: null, closed: true },
    notice: "Clinic will be closed on public holidays.",
    appointment_duration_mins: 15
  });

  // Services seeding
  const services = [
    { title: "Diabetes Care", description: " HbA1c monitoring, diet counseling, and complete diabetic support.", icon: "🩺", order: 1, active: true },
    { title: "OPD Consultation", description: "Daily OPD consultation for general illnesses and wellness checks.", icon: "🏥", order: 2, active: true },
    { title: "Vaccination Clinic", description: "Adult immunization and seasonal vaccination programs.", icon: "💉", order: 3, active: true }
  ];
  for (const s of services) {
    await addDoc(collection(db, 'tenants', tenantId, 'services'), s);
  }

  // Gallery seeding
  const images = [
    { image_url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80", caption: "Clinic Front Desk", order: 1 },
    { image_url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80", caption: "Consultation Area", order: 2 }
  ];
  for (const img of images) {
    await addDoc(collection(db, 'tenants', tenantId, 'gallery'), img);
  }

  // Blogs seeding
  const blogs = [
    { title: "5 Tips to Manage Blood Sugar Effectively", slug: "sugar-management-tips", body_markdown: "Managing blood sugar requires a combination of dynamic exercise, portion control, and regular tracking. Dr. Patil recommends monitoring HbA1c every 3 months.", published: true, created_at: new Date() }
  ];
  for (const b of blogs) {
    await addDoc(collection(db, 'tenants', tenantId, 'blogs'), b);
  }
};
