import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Alarm } from '../types/alarm';
import { validatePasskey, formatDaysDisplay } from '../utils/passkeyValidator';
import { persistAudioFile, getSavedMasterKey, saveMasterKey } from '../services/storage';
import { playPreview, stopPreview } from '../services/soundPlayer';

interface AddEditAlarmModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (alarmData: Omit<Alarm, 'id' | 'createdAt'>, editingId?: string) => void;
  editingAlarm?: Alarm | null;
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const AddEditAlarmModal: React.FC<AddEditAlarmModalProps> = ({
  visible,
  onClose,
  onSave,
  editingAlarm,
}) => {
  // 1-minute precision state
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(31);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

  // 7-day recurrence state (0=Sun, 1=Mon ... 6=Sat)
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  const [label, setLabel] = useState<string>('');
  const [passkey, setPasskey] = useState<string>('');
  const [showPasskey, setShowPasskey] = useState<boolean>(false);
  const [hint, setHint] = useState<string>('');
  const [isUsingSavedKey, setIsUsingSavedKey] = useState<boolean>(false);

  // Audio state
  const [soundUri, setSoundUri] = useState<string | null>(null);
  const [soundName, setSoundName] = useState<string>('Default Tone');
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      if (editingAlarm) {
        const [hStr, mStr] = editingAlarm.time.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr, 10);
        const p = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;

        setHour(h);
        setMinute(m);
        setPeriod(p);
        setSelectedDays(editingAlarm.days || [0, 1, 2, 3, 4, 5, 6]);
        setLabel(editingAlarm.label);
        setPasskey(editingAlarm.passkey);
        setHint(editingAlarm.hint || '');
        setSoundUri(editingAlarm.soundUri || null);
        setSoundName(editingAlarm.soundName || 'Default Tone');
        setIsUsingSavedKey(false);
      } else {
        setHour(8);
        setMinute(31);
        setPeriod('AM');
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        setLabel('Morning Wakeup');

        // Automatically prefill master saved key!
        const saved = await getSavedMasterKey();
        if (saved.key) {
          setPasskey(saved.key);
          setHint(saved.hint || '');
          setIsUsingSavedKey(true);
        } else {
          setPasskey('');
          setHint('');
          setIsUsingSavedKey(false);
        }

        setSoundUri(null);
        setSoundName('Default Tone');
      }
      stopPreview();
      setIsPlayingPreview(false);
    })();
  }, [editingAlarm, visible]);

  const validation = validatePasskey(passkey);

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        const savedUri = await persistAudioFile(file.uri, file.name);
        setSoundUri(savedUri);
        setSoundName(file.name);
      }
    } catch (err) {
      console.warn('Audio picker error:', err);
      Alert.alert('Notice', 'Could not open file picker. Please try again.');
    }
  };

  const handleTogglePreview = async () => {
    if (isPlayingPreview) {
      await stopPreview();
      setIsPlayingPreview(false);
    } else {
      if (soundUri) {
        setIsPlayingPreview(true);
        await playPreview(soundUri);
      } else {
        Alert.alert('Info', 'Default tone selected. Pick an audio file to preview.');
      }
    }
  };

  const handleResetSound = async () => {
    await stopPreview();
    setIsPlayingPreview(false);
    setSoundUri(null);
    setSoundName('Default Tone');
  };

  const handleToggleDay = (dayIndex: number) => {
    if (selectedDays.includes(dayIndex)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayIndex));
      }
    } else {
      const updated = [...selectedDays, dayIndex].sort((a, b) => a - b);
      setSelectedDays(updated);
    }
  };

  const handleSave = async () => {
    if (!validation.isValid) {
      Alert.alert(
        'Invalid Passkey',
        'Your passkey must be 5-16 characters long, contain at least 1 number, and at least 1 special character.'
      );
      return;
    }

    const trimmedKey = passkey.trim();
    const trimmedHint = hint.trim() || undefined;

    // Save as master key for all future alarms!
    await saveMasterKey(trimmedKey, trimmedHint);

    let h24 = hour;
    if (period === 'PM' && hour < 12) h24 += 12;
    if (period === 'AM' && hour === 12) h24 = 0;
    const timeFormatted = `${h24 < 10 ? '0' : ''}${h24}:${minute < 10 ? '0' : ''}${minute}`;

    onSave(
      {
        time: timeFormatted,
        days: selectedDays,
        label: label.trim() || 'Alarm',
        isEnabled: true,
        passkey: trimmedKey,
        hint: trimmedHint,
        soundUri,
        soundName,
      },
      editingAlarm?.id
    );

    stopPreview();
    onClose();
  };

  const adjustHour = (delta: number) => {
    setHour((prev) => {
      let next = prev + delta;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
  };

  const adjustMinute = (delta: number) => {
    setMinute((prev) => (prev + delta + 60) % 60);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {editingAlarm ? 'Edit Alarm' : 'Set New Alarm'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                stopPreview();
                onClose();
              }}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={24} color="#a5b4fc" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* TIME SELECTOR (1-MINUTE PRECISION) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Alarm Time</Text>
              <Text style={styles.sectionSubBadge}>Exact Minute (e.g. 8:31)</Text>
            </View>

            <View style={styles.timeSelectorContainer}>
              {/* Hour control */}
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustHour(1)} style={styles.spinnerArrow}>
                  <Ionicons name="chevron-up" size={20} color="#a5b4fc" />
                </TouchableOpacity>
                <Text style={styles.spinnerValue}>{hour < 10 ? `0${hour}` : hour}</Text>
                <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.spinnerArrow}>
                  <Ionicons name="chevron-down" size={20} color="#a5b4fc" />
                </TouchableOpacity>
                <Text style={styles.spinnerSubLabel}>Hour</Text>
              </View>

              <Text style={styles.timeSeparator}>:</Text>

              {/* Minute control - Exact 1-Minute step */}
              <View style={styles.timeSpinner}>
                <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.spinnerArrow}>
                  <Ionicons name="chevron-up" size={20} color="#a5b4fc" />
                </TouchableOpacity>
                <Text style={styles.spinnerValue}>{minute < 10 ? `0${minute}` : minute}</Text>
                <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.spinnerArrow}>
                  <Ionicons name="chevron-down" size={20} color="#a5b4fc" />
                </TouchableOpacity>
                <Text style={styles.spinnerSubLabel}>Min (+/-1)</Text>
              </View>

              {/* AM/PM toggle */}
              <View style={styles.periodToggleWrapper}>
                <TouchableOpacity
                  style={[styles.periodBtn, period === 'AM' && styles.periodBtnActive]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodBtnText, period === 'AM' && styles.periodBtnTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodBtn, period === 'PM' && styles.periodBtnActive]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodBtnText, period === 'PM' && styles.periodBtnTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* QUICK MINUTE BUTTONS */}
            <View style={styles.quickMinRow}>
              <TouchableOpacity onPress={() => adjustMinute(-5)} style={styles.quickMinBtn}>
                <Text style={styles.quickMinText}>-5m</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustMinute(-1)} style={styles.quickMinBtn}>
                <Text style={styles.quickMinText}>-1m</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustMinute(1)} style={styles.quickMinBtn}>
                <Text style={styles.quickMinText}>+1m</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => adjustMinute(5)} style={styles.quickMinBtn}>
                <Text style={styles.quickMinText}>+5m</Text>
              </TouchableOpacity>
            </View>

            {/* 7-DAYS OF THE WEEK SELECTOR */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Repeat on Days</Text>
              <Text style={[styles.sectionSubBadge, { color: '#38bdf8' }]}>
                {formatDaysDisplay(selectedDays)}
              </Text>
            </View>

            <View style={styles.daysPickerCard}>
              <View style={styles.daysRow}>
                {DAY_LABELS.map((dayLabel, idx) => {
                  const isActive = selectedDays.includes(idx);
                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => handleToggleDay(idx)}
                      style={[styles.dayPill, isActive && styles.dayPillActive]}
                    >
                      <Text style={[styles.dayPillText, isActive && styles.dayPillTextActive]}>
                        {dayLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.presetsRow}>
                <TouchableOpacity
                  onPress={() => setSelectedDays([0, 1, 2, 3, 4, 5, 6])}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Every day</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedDays([1, 2, 3, 4, 5])}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Weekdays</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedDays([0, 6])}
                  style={styles.presetBtn}
                >
                  <Text style={styles.presetText}>Weekends</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ALARM LABEL */}
            <Text style={styles.sectionLabel}>Label</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Wakeup"
              placeholderTextColor="#6366f1"
              value={label}
              onChangeText={setLabel}
            />

            {/* SOUND SELECTION FROM DEVICE */}
            <Text style={styles.sectionLabel}>Alarm Sound (From Device)</Text>
            <View style={styles.audioPickerCard}>
              <View style={styles.audioInfoRow}>
                <Ionicons name="musical-notes-outline" size={22} color="#818cf8" />
                <View style={styles.audioTextWrapper}>
                  <Text style={styles.audioNameText} numberOfLines={1}>
                    {soundName}
                  </Text>
                  <Text style={styles.audioSourceText}>
                    {soundUri ? 'Custom Audio from Device' : 'Built-in Tone'}
                  </Text>
                </View>
              </View>

              <View style={styles.audioActionsRow}>
                <TouchableOpacity style={styles.chooseFileBtn} onPress={handlePickAudio}>
                  <Ionicons name="folder-open-outline" size={16} color="#ffffff" />
                  <Text style={styles.chooseFileText}>Select Audio File</Text>
                </TouchableOpacity>

                {soundUri ? (
                  <View style={styles.soundMiniButtons}>
                    <TouchableOpacity
                      style={[styles.previewBtn, isPlayingPreview && styles.previewBtnActive]}
                      onPress={handleTogglePreview}
                    >
                      <Ionicons
                        name={isPlayingPreview ? 'stop' : 'play'}
                        size={14}
                        color="#ffffff"
                      />
                      <Text style={styles.previewBtnText}>
                        {isPlayingPreview ? 'Stop' : 'Listen'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.resetBtn} onPress={handleResetSound}>
                      <Ionicons name="refresh" size={14} color="#a5b4fc" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </View>

            {/* PASSKEY SETUP */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionLabel}>Unlock Passkey (Required to stop alarm)</Text>
              {isUsingSavedKey && (
                <Text style={styles.savedPillBadge}>🔑 Saved Key</Text>
              )}
            </View>

            <View style={styles.passwordInputContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="5-16 chars, 1 number, 1 symbol"
                placeholderTextColor="#6366f1"
                value={passkey}
                onChangeText={(text) => {
                  setPasskey(text);
                  setIsUsingSavedKey(false);
                }}
                secureTextEntry={!showPasskey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPasskey(!showPasskey)}
                style={styles.eyeIconBtn}
              >
                <Ionicons
                  name={showPasskey ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#a5b4fc"
                />
              </TouchableOpacity>
            </View>

            {/* LIVE VALIDATION CHECKLIST */}
            <View style={styles.validationBox}>
              <Text style={styles.validationTitle}>Passkey Requirements:</Text>

              <View style={styles.ruleRow}>
                <Ionicons
                  name={
                    validation.hasMinLength && validation.hasMaxLength
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={16}
                  color={
                    validation.hasMinLength && validation.hasMaxLength ? '#10b981' : '#6366f1'
                  }
                />
                <Text
                  style={[
                    styles.ruleText,
                    validation.hasMinLength && validation.hasMaxLength && styles.ruleTextValid,
                  ]}
                >
                  Between 5 and 16 characters ({passkey.length}/16)
                </Text>
              </View>

              <View style={styles.ruleRow}>
                <Ionicons
                  name={validation.hasInteger ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={validation.hasInteger ? '#10b981' : '#6366f1'}
                />
                <Text
                  style={[styles.ruleText, validation.hasInteger && styles.ruleTextValid]}
                >
                  At least one integer (0-9)
                </Text>
              </View>

              <View style={styles.ruleRow}>
                <Ionicons
                  name={validation.hasSpecialChar ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={validation.hasSpecialChar ? '#10b981' : '#6366f1'}
                />
                <Text
                  style={[styles.ruleText, validation.hasSpecialChar && styles.ruleTextValid]}
                >
                  At least one special character (!@#$%^&*...)
                </Text>
              </View>
            </View>

            {/* HINT INPUT */}
            <Text style={styles.sectionLabel}>Password Hint (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Birth year + favorite star"
              placeholderTextColor="#6366f1"
              value={hint}
              onChangeText={setHint}
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* ACTION BUTTONS */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                stopPreview();
                onClose();
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, !validation.isValid && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!validation.isValid}
            >
              <Text style={styles.saveBtnText}>Save Alarm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 9, 26, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141033',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#282163',
    backgroundColor: '#18133d',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  sectionSubBadge: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '600',
  },
  savedPillBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  timeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1847',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  timeSpinner: {
    alignItems: 'center',
    width: 70,
  },
  spinnerArrow: {
    padding: 6,
    backgroundColor: '#282163',
    borderRadius: 6,
  },
  spinnerValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    marginVertical: 4,
  },
  spinnerSubLabel: {
    fontSize: 10,
    color: '#818cf8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366f1',
    marginHorizontal: 8,
    marginBottom: 14,
  },
  periodToggleWrapper: {
    marginLeft: 14,
    backgroundColor: '#100c2a',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#282163',
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#4f46e5',
  },
  periodBtnText: {
    color: '#818cf8',
    fontWeight: '700',
    fontSize: 14,
  },
  periodBtnTextActive: {
    color: '#ffffff',
  },
  quickMinRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  quickMinBtn: {
    backgroundColor: '#231c54',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  quickMinText: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '700',
  },
  daysPickerCard: {
    backgroundColor: '#1e1847',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#120e2e',
    borderWidth: 1,
    borderColor: '#312a6e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  dayPillText: {
    color: '#a5b4fc',
    fontWeight: '700',
    fontSize: 13,
  },
  dayPillTextActive: {
    color: '#ffffff',
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#312a6e',
  },
  presetText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1e1847',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3730a3',
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  audioPickerCard: {
    backgroundColor: '#1e1847',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  audioInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  audioTextWrapper: {
    marginLeft: 10,
    flex: 1,
  },
  audioNameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  audioSourceText: {
    color: '#a5b4fc',
    fontSize: 12,
    marginTop: 2,
  },
  audioActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chooseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  chooseFileText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  soundMiniButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewBtnActive: {
    backgroundColor: '#e11d48',
  },
  previewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  resetBtn: {
    backgroundColor: '#282163',
    padding: 8,
    borderRadius: 8,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1847',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  passwordInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eyeIconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  validationBox: {
    backgroundColor: 'rgba(30, 24, 71, 0.6)',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3730a3',
  },
  validationTitle: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  ruleText: {
    color: '#818cf8',
    fontSize: 12,
    marginLeft: 8,
  },
  ruleTextValid: {
    color: '#34d399',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#282163',
    backgroundColor: '#18133d',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#231c54',
    borderWidth: 1,
    borderColor: '#3730a3',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#c7d2fe',
    fontSize: 15,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#282163',
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
