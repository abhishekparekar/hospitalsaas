import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { doc, getDoc, setDoc, collection, onSnapshot, addDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  // Support ticketing states
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tid = user.uid;

    const profileRef = doc(db, 'tenants', tid, 'profile', 'info');
    const tenantRef = doc(db, 'tenants', tid);

    // Get profile
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile({
          doctor_name: '',
          salutation: 'Dr.',
          photo_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
          speciality: '',
          tagline: '',
          degrees: [],
          registration_number: '',
          experience_years: 0,
          languages: [],
          affiliations: [],
          bio: '',
          clinic_name: '',
          clinic_address: '',
          phone: '',
          whatsapp_number: '',
          email: user.email,
          theme_color: '#1e40af'
        });
      }
      setLoading(false);
    });

    // Get tenant details (billing information)
    const unsubTenant = onSnapshot(tenantRef, (snap) => {
      if (snap.exists()) {
        setTenant(snap.data());
      }
    });

    // Listen to support tickets
    const unsubTickets = onSnapshot(
      collection(db, 'support_tickets'),
      (snap) => {
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((tk: any) => tk.tenantId === tid)
          .sort((a: any, b: any) => b.created_at?.seconds - a.created_at?.seconds);
        setSupportTickets(list);
      }
    );

    return () => {
      unsubProfile();
      unsubTenant();
      unsubTickets();
    };
  }, []);

  const saveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, 'tenants', user.uid, 'profile', 'info'), profile);
      Alert.alert('Success', 'Profile settings updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update profile: ' + e.message);
    }
  };

  const simulatePayment = async (selectedPlan: string) => {
    const user = auth.currentUser;
    if (!user) return;
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

      const updatedHistory = tenant?.payment_history ? [transaction, ...tenant.payment_history] : [transaction];

      await updateDoc(doc(db, 'tenants', user.uid), {
        status: 'active',
        plan: selectedPlan,
        plan_expiry: expiry,
        payment_history: updatedHistory
      });

      Alert.alert('Payment Simulated', `₹${transaction.amount} charge successful! Service active until ${expiry.toDateString()}.`);
    } catch (err: any) {
      Alert.alert('Error', 'Payment simulation failed: ' + err.message);
    }
  };

  const submitSupportTicket = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert('Details Missing', 'Please fill in subject and details.');
      return;
    }
    try {
      await addDoc(collection(db, 'support_tickets'), {
        tenantId: user.uid,
        doctor_name: profile?.doctor_name || 'Doctor',
        email: user.email,
        subject: supportSubject,
        message: supportMessage,
        status: 'pending',
        created_at: new Date()
      });
      Alert.alert('Success', 'Support ticket posted to platform queue!');
      setSupportSubject('');
      setSupportMessage('');
    } catch (e: any) {
      Alert.alert('Error', 'Submission failed: ' + e.message);
    }
  };

  const updateField = (field: string, val: any) => {
    setProfile({
      ...profile,
      [field]: val
    });
  };

  if (loading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Public Clinic Profile</Text>

      {/* Practitioner details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Practitioner Details</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>DOCTOR NAME</Text>
          <TextInput 
            style={styles.input}
            value={profile.doctor_name}
            onChangeText={(val) => updateField('doctor_name', val)}
            placeholder="eg. Rajesh Patil"
            placeholderTextColor="#475569"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>SPECIALITY</Text>
          <TextInput 
            style={styles.input}
            value={profile.speciality}
            onChangeText={(val) => updateField('speciality', val)}
            placeholder="eg. General Physician & Diabetologist"
            placeholderTextColor="#475569"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>EXPERIENCE YEARS</Text>
          <TextInput 
            style={styles.input}
            value={profile.experience_years ? String(profile.experience_years) : ''}
            onChangeText={(val) => updateField('experience_years', parseInt(val) || 0)}
            placeholder="eg. 15"
            placeholderTextColor="#475569"
            keyboardType="number-pad"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>MMC REGISTRATION NO</Text>
          <TextInput 
            style={styles.input}
            value={profile.registration_number}
            onChangeText={(val) => updateField('registration_number', val)}
            placeholder="eg. MMC-2009-12345"
            placeholderTextColor="#475569"
          />
        </View>
      </View>

      {/* Clinic Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinic Details</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>CLINIC NAME</Text>
          <TextInput 
            style={styles.input}
            value={profile.clinic_name}
            onChangeText={(val) => updateField('clinic_name', val)}
            placeholder="eg. Patil Medical Centre"
            placeholderTextColor="#475569"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>CLINIC ADDRESS</Text>
          <TextInput 
            style={styles.input}
            value={profile.clinic_address}
            onChangeText={(val) => updateField('clinic_address', val)}
            placeholder="Shop No. 5, N-7 CIDCO, Aurangabad"
            placeholderTextColor="#475569"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>CLINIC PHONE</Text>
          <TextInput 
            style={styles.input}
            value={profile.phone}
            onChangeText={(val) => updateField('phone', val)}
            placeholder="eg. +912402340000"
            placeholderTextColor="#475569"
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveProfile}>
        <Text style={styles.saveButtonText}>Save Profile Settings</Text>
      </TouchableOpacity>

      {/* Billing Tab Equivalent inside profile scroll */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing & Subscription</Text>
        
        <View style={styles.billingHeader}>
          <View>
            <Text style={styles.billingTextSmall}>ACTIVE LICENSE</Text>
            <Text style={styles.billingTextLarge}>{tenant?.plan?.toUpperCase() || 'PROFESSIONAL'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.billingTextSmall}>RENEWAL DATE</Text>
            <Text style={[styles.billingTextLarge, { color: '#f59e0b' }]}>
              {tenant?.plan_expiry ? new Date(tenant.plan_expiry.seconds * 1000).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionDesc}>Simulate payments via mock Razorpay checkout flow:</Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.billingBtn, { backgroundColor: '#059669' }]} onPress={() => simulatePayment('professional')}>
            <Text style={styles.billingBtnText}>Renew Pro (₹7,999)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.billingBtn, { backgroundColor: '#2563eb' }]} onPress={() => simulatePayment('pro_plus')}>
            <Text style={styles.billingBtnText}>Upgrade Pro+ (₹9,999)</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction log history */}
        <Text style={[styles.label, { marginTop: 12 }]}>BILLING LOG HISTORY</Text>
        {tenant?.payment_history && tenant.payment_history.length > 0 ? (
          tenant.payment_history.map((tx: any, idx: number) => (
            <View key={idx} style={styles.logRow}>
              <View>
                <Text style={styles.logId}>{tx.id}</Text>
                <Text style={styles.logDesc}>{tx.plan?.toUpperCase()} Plan</Text>
              </View>
              <Text style={styles.logAmount}>₹{tx.amount}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No logged payments found.</Text>
        )}
      </View>

      {/* Support Ticketing Equivalent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Help Desk & Platform Support</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>TICKET SUBJECT</Text>
          <TextInput 
            style={styles.input}
            value={supportSubject}
            onChangeText={setSupportSubject}
            placeholder="eg. CallMeBot delay settings"
            placeholderTextColor="#475569"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>MESSAGE / COMPLAINT DETAILS</Text>
          <TextInput 
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            value={supportMessage}
            onChangeText={setSupportMessage}
            placeholder="Outline your question details here..."
            placeholderTextColor="#475569"
            multiline
          />
        </View>

        <TouchableOpacity style={styles.supportBtn} onPress={submitSupportTicket}>
          <Text style={styles.supportBtnText}>Submit Support Ticket</Text>
        </TouchableOpacity>

        <Text style={[styles.label, { marginTop: 12 }]}>SUBMITTED TICKETS</Text>
        {supportTickets.length > 0 ? (
          supportTickets.map((tk: any) => (
            <View key={tk.id} style={styles.ticketCard}>
              <View style={styles.ticketHeader}>
                <Text style={styles.ticketSubject}>{tk.subject}</Text>
                <Text style={[
                  styles.ticketStatus, 
                  { color: tk.status === 'pending' ? '#f59e0b' : '#10b981' }
                ]}>{tk.status?.toUpperCase()}</Text>
              </View>
              <Text style={styles.ticketBody}>{tk.message}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No submitted support queries.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  section: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 8,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '850',
  },
  billingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  billingTextSmall: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94a3b8',
  },
  billingTextLarge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  billingBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billingBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logId: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  logDesc: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  logAmount: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyText: {
    color: '#475569',
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  supportBtn: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  supportBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  ticketCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    gap: 6,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  ticketStatus: {
    fontSize: 9,
    fontWeight: '800',
  },
  ticketBody: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 18,
  },
});
