import { useEffect, useRef } from 'react';
import { Alarm } from '../types/alarm';

interface UseAlarmSchedulerProps {
  alarms: Alarm[];
  onTriggerAlarm: (alarm: Alarm) => void;
  isAlarmActive: boolean;
}

export function useAlarmScheduler({
  alarms,
  onTriggerAlarm,
  isAlarmActive,
}: UseAlarmSchedulerProps) {
  // Store the last triggered timestamp key "alarmId_YYYY-MM-DD_HH:MM" so it doesn't trigger multiple times in the same minute
  const triggeredMapRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAlarmActive) {
        return;
      }

      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const todayDay = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

      const timeStr = `${currentHours < 10 ? '0' : ''}${currentHours}:${
        currentMinutes < 10 ? '0' : ''
      }${currentMinutes}`;

      const dateStr = now.toISOString().slice(0, 10);

      alarms.forEach((alarm) => {
        if (!alarm.isEnabled) return;

        // Check if alarm is scheduled for today
        const scheduledDays = alarm.days && alarm.days.length > 0
          ? alarm.days
          : [0, 1, 2, 3, 4, 5, 6];

        if (!scheduledDays.includes(todayDay)) return;

        if (alarm.time === timeStr) {
          const triggerKey = `${alarm.id}_${dateStr}_${timeStr}`;
          if (!triggeredMapRef.current[triggerKey]) {
            triggeredMapRef.current[triggerKey] = true;
            onTriggerAlarm(alarm);
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [alarms, onTriggerAlarm, isAlarmActive]);
}
