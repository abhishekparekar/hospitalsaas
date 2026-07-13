import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Switch, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function ExploreScreen() {
  const [loading, setLoading] = useState(true);
  const [timings, setTimings] = useState<any>(null);

  useEffect(() => {
    const fetchTimings = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const tid = user.uid;
      const ref = doc(db, 'tenants', tid, 'timings', 'info');
      try {
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTimings(snap.data());
        } else {
          // Default fallbacks
          setTimings({
            mon: { open: '09:00', close: '17:00', closed: false },
            tue: { open: '09:00', close: '17:00', closed: false },
            wed: { open: '09:00', close: '17:00', closed: false },
            thu: { open: '09:00', close: '17:00', closed: false },
            fri: { open: '09:00', close: '17:00', closed: false },
            sat: { open: '09:00', close: '13:00', closed: false },
            sun: { open: null, close: null, closed: true },
            notice: '',
            appointment_duration_mins: 15
          });
        }
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimings();
  }, []);

  const saveTimings = async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await setDoc(doc(db, 'tenants', user.uid, 'timings', 'info'), timings);
      Alert.alert('Success', 'OPD consultation timings updated successfully!');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to save timings: ' + e.message);
    }
  };

  const toggleDay = (day: string, checked: boolean) => {
    const dayData = timings[day] || { closed: true };
    setTimings({
      ...timings,
      [day]: {
        ...dayData,
        closed: !checked,
        open: !checked ? null : '09:00',
        close: !checked ? null : '17:00'
      }
    });
  };

  const updateTime = (day: string, field: string, val: string) => {
    const dayData = timings[day];
    setTimings({
      ...timings,
      [day]: {
        ...dayData,
        [field]: val
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const dayNames: any = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>OPD Timing Planner</Text>

      {days.map((day) => {
        const d = timings[day] || { closed: true };
        return (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayText}>{dayNames[day]}</Text>
              <Switch 
                value={!d.closed}
                onValueChange={(val) => toggleDay(day, val)}
                trackColor={{ false: '#1e293b', true: '#059669' }}
                thumbColor={!d.closed ? '#10b981' : '#64748b'}
              />
            </View>

            {!d.closed ? (
              <View style={styles.timeInputsRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.label}>MORNING FROM</Text>
                  <TextInput 
                    style={styles.input}
                    value={d.open || ''}
                    onChangeText={(val) => updateTime(day, 'open', val)}
                    placeholder="09:00"
                    placeholderTextColor="#475569"
                  />
                </View>
                <View style={styles.timeBlock}>
                  <Text style={styles.label}>MORNING TO</Text>
                  <TextInput 
                    style={styles.input}
                    value={d.close || ''}
                    onChangeText={(val) => updateTime(day, 'close', val)}
                    placeholder="13:00"
                    placeholderTextColor="#475569"
                  />
                </View>
              </View>
            ) : (
              <Text style={styles.closedText}>Closed for consultation</Text>
            )}
          </View>
        );
      })}

      <View style={styles.noticeCard}>
        <Text style={styles.noticeLabel}>OPD HOLIDAY NOTICE BANNER</Text>
        <TextInput 
          style={styles.noticeInput}
          value={timings.notice || ''}
          onChangeText={(val) => setTimings({ ...timings, notice: val })}
          placeholder="eg. Clinic closed on Independence Day"
          placeholderTextColor="#475569"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={saveTimings}>
        <Text style={styles.saveButtonText}>Save Timing Planner</Text>
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
    gap: 16,
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
    marginBottom: 10,
  },
  dayCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 14,
  },
  timeBlock: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  closedText: {
    fontSize: 12,
    color: '#f87171',
    fontWeight: '600',
    marginTop: 8,
    fontStyle: 'italic',
  },
  noticeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  noticeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  noticeInput: {
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
    marginTop: 10,
  },
  saveButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
});
