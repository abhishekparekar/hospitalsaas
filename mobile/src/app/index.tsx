import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Switch, 
  Share 
} from 'react-native';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function HomeScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tid = user.uid;

    // Listeners and fetches
    const docRef = doc(db, 'tenants', tid);
    const profRef = doc(db, 'tenants', tid, 'profile', 'info');

    const unsubTenant = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setTenant(snap.data());
      }
    });

    const unsubProfile = onSnapshot(profRef, (snap) => {
      if (snap.exists()) {
        setProfile(snap.data());
        setLoading(false);
      } else {
        // Fallback profile check
        setProfile({ doctor_name: 'Doctor', speciality: 'Healthcare practitioner' });
        setLoading(false);
      }
    });

    const unsubAppts = onSnapshot(collection(db, 'tenants', tid, 'appointments'), (snap) => {
      setAppointmentsCount(snap.size);
      const pending = snap.docs.filter(d => d.data().status === 'pending').length;
      setPendingCount(pending);
    });

    return () => {
      unsubTenant();
      unsubProfile();
      unsubAppts();
    };
  }, []);

  const handleShareLink = async () => {
    if (!tenant?.tenant_slug) return;
    try {
      await Share.share({
        message: `Visit my online clinic portal to book appointments: https://clinicpage.in/${tenant.tenant_slug}`,
      });
    } catch (error) {
      console.log(error);
    }
  };

  const handleToggleWhatsapp = async (value: boolean) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'tenants', user.uid), {
        whatsapp_notify_enabled: value
      });
    } catch (e) {
      console.log(e);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header card */}
      <View style={styles.headerCard}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.doctorName}>{profile?.salutation || 'Dr.'} {profile?.doctor_name || 'Doctor'}</Text>
        <Text style={styles.specialityText}>{profile?.speciality || 'General Medicine'}</Text>
        
        {tenant?.tenant_slug ? (
          <TouchableOpacity style={styles.shareBadge} onPress={handleShareLink}>
            <Text style={styles.shareText}>clinicpage.in/{tenant.tenant_slug} 🔗</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Analytics widgets */}
      <View style={styles.grid}>
        <View style={styles.widget}>
          <Text style={styles.widgetLabel}>TOTAL BOOKINGS</Text>
          <Text style={styles.widgetValue}>{appointmentsCount}</Text>
        </View>
        
        <View style={[styles.widget, { borderColor: '#f59e0b' }]}>
          <Text style={[styles.widgetLabel, { color: '#f59e0b' }]}>PENDING SLOTS</Text>
          <Text style={[styles.widgetValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
        </View>
      </View>

      {/* Settings toggle */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notifications Configuration</Text>
        <View style={styles.settingsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingsLabel}>WhatsApp Notifications</Text>
            <Text style={styles.settingsDesc}>Receive patient booking details on WhatsApp</Text>
          </View>
          <Switch 
            value={tenant?.whatsapp_notify_enabled || false}
            onValueChange={handleToggleWhatsapp}
            trackColor={{ false: '#1e293b', true: '#059669' }}
            thumbColor={tenant?.whatsapp_notify_enabled ? '#10b981' : '#64748b'}
          />
        </View>
      </View>

      {/* Subscription info */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>SaaS Account Status</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>PLAN STATUS</Text>
          <Text style={styles.infoValue}>{tenant?.status?.toUpperCase() || 'ACTIVE'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>PLAN TERM</Text>
          <Text style={styles.infoValue}>{tenant?.plan?.toUpperCase() || 'PROFESSIONAL'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>RENEWAL DATE</Text>
          <Text style={[styles.infoValue, { color: '#ffffff' }]}>
            {tenant?.plan_expiry ? new Date(tenant.plan_expiry.seconds * 1000).toDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out of Clinic Panel</Text>
      </TouchableOpacity>
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
  headerCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  welcomeText: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 4,
  },
  specialityText: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
  },
  shareBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 16,
  },
  shareText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  widget: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
  },
  widgetLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1,
  },
  widgetValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    paddingBottom: 12,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  settingsDesc: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoKey: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  logoutButton: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#f87171',
    fontWeight: '850',
    fontSize: 14,
  },
});
