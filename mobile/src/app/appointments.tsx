import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Linking, 
  Alert 
} from 'react-native';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function AppointmentsScreen() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tid = user.uid;
    const unsub = onSnapshot(collection(db, 'tenants', tid, 'appointments'), (snap) => {
      const apptList = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })).sort((a: any, b: any) => {
        // Sort descending by date/time
        return b.created_at?.seconds - a.created_at?.seconds;
      });
      setAppointments(apptList);
      setLoading(false);
    });

    return unsub;
  }, []);

  const handleCallPatient = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  const updateStatus = async (apptId: string, status: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await updateDoc(doc(db, 'tenants', user.uid, 'appointments', apptId), {
        status: status
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to update status: ' + e.message);
    }
  };

  const renderAppointmentItem = ({ item }: { item: any }) => {
    const statusColors: any = {
      pending: { bg: '#3b2314', text: '#f59e0b', border: '#b45309' },
      confirmed: { bg: '#064e3b', text: '#10b981', border: '#047857' },
      completed: { bg: '#1e3a8a', text: '#60a5fa', border: '#1d4ed8' },
      cancelled: { bg: '#451a03', text: '#f87171', border: '#991b1b' }
    };

    const currentStyle = statusColors[item.status] || statusColors.pending;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.patientName}>{item.patient_name}</Text>
            <Text style={styles.dateTime}>{item.preferred_date} @ {item.preferred_time}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: currentStyle.bg, borderColor: currentStyle.border }]}>
            <Text style={[styles.statusText, { color: currentStyle.text }]}>{item.status?.toUpperCase()}</Text>
          </View>
        </View>

        {item.complaint ? (
          <Text style={styles.complaintText}>Complaint: {item.complaint}</Text>
        ) : null}

        <View style={styles.cardFooter}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.callButton]} 
            onPress={() => handleCallPatient(item.patient_phone)}
          >
            <Text style={styles.callButtonText}>Call Patient</Text>
          </TouchableOpacity>

          <View style={styles.statusActions}>
            {item.status === 'pending' && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.confirmButton]} 
                onPress={() => updateStatus(item.id, 'confirmed')}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            )}
            
            {item.status !== 'completed' && item.status !== 'cancelled' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.completeButton]} 
                  onPress={() => updateStatus(item.id, 'completed')}
                >
                  <Text style={styles.buttonText}>Complete</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]} 
                  onPress={() => updateStatus(item.id, 'cancelled')}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consultation Bookings</Text>
      <FlatList 
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No appointments booked yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'start',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  dateTime: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  statusBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
  },
  complaintText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
    backgroundColor: '#020617',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButton: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  callButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  completeButton: {
    backgroundColor: '#2563eb',
  },
  cancelButton: {
    backgroundColor: 'rgba(127, 29, 29, 0.2)',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  cancelButtonText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
});
