import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alarm } from '../types/alarm';
import { getStoredAlarms, saveAlarms } from '../services/storage';
import { AlarmCard } from '../components/AlarmCard';
import { AddEditAlarmModal } from '../components/AddEditAlarmModal';
import { RingingModal } from '../components/RingingModal';
import { useAlarmScheduler } from '../hooks/useAlarmScheduler';

export const HomeScreen: React.FC = () => {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);

  // Active ringing alarm
  const [activeRingingAlarm, setActiveRingingAlarm] = useState<Alarm | null>(null);

  // Live time ticker for the home header
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load alarms on mount
  useEffect(() => {
    (async () => {
      const stored = await getStoredAlarms();
      setAlarms(stored);
    })();
  }, []);

  const updateAndSaveAlarms = async (newAlarms: Alarm[]) => {
    setAlarms(newAlarms);
    await saveAlarms(newAlarms);
  };

  useAlarmScheduler({
    alarms,
    isAlarmActive: activeRingingAlarm !== null,
    onTriggerAlarm: (alarm) => {
      setActiveRingingAlarm(alarm);
    },
  });

  const handleToggle = (id: string, isEnabled: boolean) => {
    const updated = alarms.map((a) => (a.id === id ? { ...a, isEnabled } : a));
    updateAndSaveAlarms(updated);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Alarm', 'Are you sure you want to delete this alarm?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updated = alarms.filter((a) => a.id !== id);
          updateAndSaveAlarms(updated);
        },
      },
    ]);
  };

  const handleSaveAlarm = (
    alarmData: Omit<Alarm, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    if (editingId) {
      const updated = alarms.map((a) =>
        a.id === editingId ? { ...a, ...alarmData } : a
      );
      updateAndSaveAlarms(updated);
    } else {
      const newAlarm: Alarm = {
        ...alarmData,
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };
      updateAndSaveAlarms([...alarms, newAlarm]);
    }
  };

  const openCreateModal = () => {
    setEditingAlarm(null);
    setModalVisible(true);
  };

  const openEditModal = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setModalVisible(true);
  };

  const handleTestAlarm = (alarm: Alarm) => {
    setActiveRingingAlarm(alarm);
  };

  const hours = currentTime.getHours();
  const minutes = currentTime.getMinutes();
  const seconds = currentTime.getSeconds();
  const displayHours = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <SafeAreaView style={styles.container}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>PassAlarm</Text>
          <Text style={styles.appTagline}>Cognitive Key Wakeup</Text>
        </View>

        <View style={styles.liveClockBadge}>
          <Text style={styles.liveClockText}>
            {pad(displayHours)}:{pad(minutes)}:{pad(seconds)} {ampm}
          </Text>
        </View>
      </View>

      {/* LATE NIGHT REMINDER */}
      <View style={styles.lateBanner}>
        <Text style={styles.lateMoonIcon}>🌙</Text>
        <Text style={styles.lateText}>Its getting late buddy</Text>
      </View>

      {/* INFO BANNER */}
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark" size={20} color="#818cf8" />
        <Text style={styles.bannerText}>
          Alarms cannot be dismissed by a simple button press. You must type your custom key to silence them!
        </Text>
      </View>

      {/* ALARMS LIST */}
      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlarmCard
            alarm={item}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onTest={handleTestAlarm}
            onEdit={openEditModal}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="alarm-outline" size={64} color="#3730a3" />
            <Text style={styles.emptyTitle}>No Alarms Set</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button below to create your first passkey-protected alarm.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openCreateModal}>
              <Ionicons name="add" size={18} color="#ffffff" />
              <Text style={styles.emptyButtonText}>Add New Alarm</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={32} color="#ffffff" />
      </TouchableOpacity>

      {/* MODALS */}
      <AddEditAlarmModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveAlarm}
        editingAlarm={editingAlarm}
      />

      <RingingModal
        visible={activeRingingAlarm !== null}
        alarm={activeRingingAlarm}
        onDismiss={() => setActiveRingingAlarm(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b091a', // Deep Indigo Void
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#120e2e',
    borderBottomWidth: 1,
    borderBottomColor: '#282163',
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  liveClockBadge: {
    backgroundColor: '#231c54',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  liveClockText: {
    color: '#c7d2fe',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  lateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1847',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4f46e5',
  },
  lateMoonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  lateText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1742',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  bannerText: {
    flex: 1,
    color: '#c7d2fe',
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#a5b4fc',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#818cf8',
    textAlign: 'center',
    marginTop: 6,
    marginHorizontal: 30,
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 22,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
