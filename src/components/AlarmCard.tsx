import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alarm } from '../types/alarm';
import { formatTimeDisplay, formatDaysDisplay } from '../utils/passkeyValidator';

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string, value: boolean) => void;
  onDelete: (id: string) => void;
  onTest: (alarm: Alarm) => void;
  onEdit: (alarm: Alarm) => void;
}

export const AlarmCard: React.FC<AlarmCardProps> = ({
  alarm,
  onToggle,
  onDelete,
  onTest,
  onEdit,
}) => {
  const { time, period } = formatTimeDisplay(alarm.time);
  const daysText = formatDaysDisplay(alarm.days);

  return (
    <View style={[styles.card, !alarm.isEnabled && styles.cardDisabled]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onEdit(alarm)}
        style={styles.contentContainer}
      >
        <View style={styles.topRow}>
          <View style={styles.timeWrapper}>
            <Text style={[styles.timeText, !alarm.isEnabled && styles.textMuted]}>{time}</Text>
            <Text style={[styles.periodText, !alarm.isEnabled && styles.textMuted]}>{period}</Text>
          </View>
          <Switch
            value={alarm.isEnabled}
            onValueChange={(val) => onToggle(alarm.id, val)}
            trackColor={{ false: '#282163', true: '#4f46e5' }}
            thumbColor={alarm.isEnabled ? '#818cf8' : '#6366f1'}
          />
        </View>

        <Text style={[styles.labelText, !alarm.isEnabled && styles.textMuted]}>
          {alarm.label || 'Alarm'}
        </Text>

        <View style={styles.metaRow}>
          <View style={[styles.badge, styles.daysBadge]}>
            <Ionicons name="calendar-outline" size={13} color="#38bdf8" />
            <Text style={[styles.badgeText, { color: '#38bdf8' }]}>{daysText}</Text>
          </View>

          <View style={styles.badge}>
            <Ionicons name="musical-notes" size={13} color="#818cf8" />
            <Text style={styles.badgeText} numberOfLines={1}>
              {alarm.soundName || 'Default Tone'}
            </Text>
          </View>

          <View style={styles.badge}>
            <Ionicons name="key" size={13} color="#f59e0b" />
            <Text style={styles.badgeText}>
              Key: {alarm.passkey.length} chars
            </Text>
          </View>
        </View>

        {alarm.hint ? (
          <View style={styles.hintContainer}>
            <Ionicons name="information-circle-outline" size={14} color="#a5b4fc" />
            <Text style={styles.hintText} numberOfLines={1}>
              Hint: {alarm.hint}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={() => onTest(alarm)}
          activeOpacity={0.7}
        >
          <Ionicons name="play" size={14} color="#a5b4fc" />
          <Text style={styles.testButtonText}>Test Alarm Challenge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(alarm.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={18} color="#f43f5e" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1d1746',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#312a6e',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  cardDisabled: {
    opacity: 0.55,
    backgroundColor: '#130f2e',
    borderColor: '#211a4d',
  },
  contentContainer: {
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  periodText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#a5b4fc',
    marginLeft: 6,
  },
  textMuted: {
    color: '#6366f1',
  },
  labelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e0e7ff',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#130f2e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#282163',
  },
  daysBadge: {
    borderColor: '#1e3a8a',
  },
  badgeText: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#130f2e80',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  hintText: {
    color: '#a5b4fc',
    fontSize: 12,
    marginLeft: 5,
    fontStyle: 'italic',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#282163',
    paddingTop: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1b4b',
    borderWidth: 1,
    borderColor: '#4338ca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  testButtonText: {
    color: '#a5b4fc',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  deleteButton: {
    padding: 6,
  },
});
