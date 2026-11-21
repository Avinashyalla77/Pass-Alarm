import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Alarm } from '../types/alarm';
import { startAlarmRing, stopAlarmRing } from '../services/soundPlayer';
import { formatTimeDisplay } from '../utils/passkeyValidator';

interface RingingModalProps {
  visible: boolean;
  alarm: Alarm | null;
  onDismiss: () => void;
}

export const RingingModal: React.FC<RingingModalProps> = ({
  visible,
  alarm,
  onDismiss,
}) => {
  const [enteredKey, setEnteredKey] = useState<string>('');
  const [isWrongAttempt, setIsWrongAttempt] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Pulse animation for the alarm icon
  useEffect(() => {
    if (visible && !isSuccess) {
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
      return () => pulseLoop.stop();
    }
  }, [visible, isSuccess]);

  // Start sound & vibration when ringing starts
  useEffect(() => {
    if (visible && alarm) {
      setEnteredKey('');
      setIsWrongAttempt(false);
      setShowHint(false);
      setIsSuccess(false);
      startAlarmRing(alarm.soundUri);
    } else {
      stopAlarmRing();
    }
    return () => {
      stopAlarmRing();
    };
  }, [visible, alarm]);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleVerify = async () => {
    if (!alarm) return;

    if (enteredKey === alarm.passkey) {
      // SUCCESS! Exact match
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Fallback for non-supported device
      }
      await stopAlarmRing();
      setIsSuccess(true);
      setTimeout(() => {
        onDismiss();
      }, 1500);
    } else {
      // INCORRECT!
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {
        // Fallback
      }
      setIsWrongAttempt(true);
      triggerShake();
    }
  };

  if (!alarm) return null;

  const { time, period } = formatTimeDisplay(alarm.time);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.innerContent}>
          {isSuccess ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={90} color="#10b981" />
              <Text style={styles.successTitle}>Key Verified!</Text>
              <Text style={styles.successSubtitle}>Good morning! The alarm has stopped.</Text>
            </View>
          ) : (
            <>
              {/* ALARM HEADER & PULSE */}
              <View style={styles.topSection}>
                <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
                  <Ionicons name="alarm" size={72} color="#f43f5e" />
                </Animated.View>

                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{time}</Text>
                  <Text style={styles.periodText}>{period}</Text>
                </View>

                <Text style={styles.alarmLabel}>{alarm.label || 'Wake Up Challenge'}</Text>
                <Text style={styles.soundNameBadge}>
                  🎵 {alarm.soundName || 'Default Sound'}
                </Text>
              </View>

              {/* CHALLENGE INSTRUCTIONS */}
              <View style={styles.challengeBox}>
                <Text style={styles.challengeTitle}>🔒 LOCKDOWN ACTIVE</Text>
                <Text style={styles.challengeInstruction}>
                  Type your custom secret key below to stop the sound and vibration.
                </Text>

                {/* PASSKEY INPUT */}
                <Animated.View
                  style={[
                    styles.inputContainer,
                    isWrongAttempt && styles.inputWrong,
                    { transform: [{ translateX: shakeAnim }] },
                  ]}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="Enter passkey to stop..."
                    placeholderTextColor="#64748b"
                    value={enteredKey}
                    onChangeText={(text) => {
                      setEnteredKey(text);
                      if (isWrongAttempt) setIsWrongAttempt(false);
                    }}
                    onSubmitEditing={handleVerify}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoFocus
                  />
                  {enteredKey.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEnteredKey('')}
                      style={styles.clearBtn}
                    >
                      <Ionicons name="close-circle" size={20} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {isWrongAttempt && (
                  <View style={styles.errorNotice}>
                    <Ionicons name="alert-circle" size={16} color="#ef4444" />
                    <Text style={styles.errorText}>
                      Incorrect key! The alarm won't stop until matched.
                    </Text>
                  </View>
                )}

                {/* HINT SECTION */}
                {alarm.hint ? (
                  <View style={styles.hintSection}>
                    {showHint ? (
                      <View style={styles.revealedHintBox}>
                        <Text style={styles.revealedHintLabel}>Password Hint:</Text>
                        <Text style={styles.revealedHintText}>{alarm.hint}</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.showHintBtn}
                        onPress={() => setShowHint(true)}
                      >
                        <Ionicons name="help-circle-outline" size={16} color="#38bdf8" />
                        <Text style={styles.showHintBtnText}>Show Hint</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : null}

                {/* STOP ALARM BUTTON */}
                <TouchableOpacity
                  style={[
                    styles.stopAlarmBtn,
                    enteredKey.length === 0 && styles.stopAlarmBtnDisabled,
                  ]}
                  onPress={handleVerify}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-open" size={20} color="#ffffff" />
                  <Text style={styles.stopAlarmBtnText}>VERIFY & STOP ALARM</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050811',
  },
  innerContent: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 50,
  },
  topSection: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrapper: {
    marginBottom: 16,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  timeText: {
    fontSize: 54,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1,
  },
  periodText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 8,
  },
  alarmLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#e2e8f0',
    marginTop: 6,
  },
  soundNameBadge: {
    fontSize: 13,
    color: '#38bdf8',
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  challengeBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 22,
    borderWidth: 2,
    borderColor: '#f43f5e50',
    alignItems: 'center',
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f43f5e',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  challengeInstruction: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3b82f6',
    paddingHorizontal: 16,
  },
  inputWrong: {
    borderColor: '#ef4444',
    backgroundColor: '#450a0a30',
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 14,
  },
  clearBtn: {
    padding: 6,
  },
  errorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  hintSection: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
  },
  showHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  showHintBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
    textDecorationLine: 'underline',
  },
  revealedHintBox: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 10,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#38bdf8',
  },
  revealedHintLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  revealedHintText: {
    color: '#e2e8f0',
    fontSize: 14,
    marginTop: 2,
    fontStyle: 'italic',
  },
  stopAlarmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e11d48',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 20,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  stopAlarmBtnDisabled: {
    backgroundColor: '#4c0519',
    opacity: 0.6,
  },
  stopAlarmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 8,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 20,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'center',
  },
});
