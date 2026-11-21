# PassAlarm ⏰🔐
> A smart wake-up alarm app for iOS & Android that cannot be silenced by a sleepy tap. You must enter your pre-configured secret passkey to stop the ringing and vibration.

---

## 🌟 Key Features

1. **Custom Secret Key Challenge**:
   - Each alarm requires an unlock key during setup.
   - **Validation Rules**:
     - Length between **5 and 16 characters**.
     - Must contain **at least one number** (`0-9`).
     - Must contain **at least one special character** (`!@#$%^&*...`).
   - Dynamic real-time checklist indicators guide you as you type.
   - Optional password hint to jog your memory if needed.

2. **Custom Alarm Sound from Device**:
   - Tap **"Select Audio File"** to pick any song or tone from your phone's storage.
   - Built-in audio preview lets you test your sound before saving.
   - Files are automatically persisted safely to the app's document directory.
   - High-energy energetic fallback tone included if no custom file is selected.

3. **Lockdown Alarm Screen**:
   - Plays your chosen sound in an endless loop at full volume.
   - Activates device vibration (`Vibrate [800ms, 400ms]`).
   - No simple "Dismiss" or "Snooze" button.
   - Shake animation + error haptic feedback if the typed key is incorrect.
   - Sound and vibration **instantly stop only when the exact key is submitted**.

4. **"Test Alarm Challenge" Button**:
   - Every alarm card has a 1-tap "Test Alarm Challenge" button so you can experience the ringing screen, hear your audio, and test entering your key without waiting for the scheduled time.

---

## 🚀 How to Run the App

### 1. Prerequisites
- Install **Expo Go** on your physical phone:
  - [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [Apple App Store (iOS)](https://apps.apple.com/app/expo-go/id982107779)

### 2. Start the Development Server
Navigate to the project folder and run:

```bash
cd "C:\Users\valib\.gemini\antigravity\scratch\passkey-alarm-app"
npx expo start
```

### 3. Open on Your Device
- **Android**: Open the **Expo Go** app and scan the QR code displayed in your terminal.
- **iOS**: Open the default **Camera** app, scan the QR code, and tap the prompt to open in Expo Go.

---

## 📁 Project Structure

```text
passkey-alarm-app/
├── assets/
│   ├── default_alarm.wav        # Generated rhythmic fallback alert sound
│   └── ...                      # App icons & splash images
├── src/
│   ├── components/
│   │   ├── AddEditAlarmModal.tsx # Alarm configuration with audio picker & live validation
│   │   ├── AlarmCard.tsx        # Alarm card with switch, key preview, & test button
│   │   └── RingingModal.tsx     # Lockdown ringing screen requiring passkey
│   ├── hooks/
│   │   └── useAlarmScheduler.ts # Background ticker monitoring active alarm times
│   ├── screens/
│   │   └── HomeScreen.tsx       # Main dashboard with live clock and alarm list
│   ├── services/
│   │   ├── soundPlayer.ts       # Audio playback & looping vibration management
│   │   └── storage.ts           # Local alarm persistence & device audio file copier
│   ├── types/
│   │   └── alarm.ts             # Alarm data models and TypeScript definitions
│   └── utils/
│       ├── defaultAudio.ts      # Embedded base64 audio fallback
│       └── passkeyValidator.ts  # Validation logic for 5-16 chars, numbers & symbols
├── app.json                     # Expo configuration and permissions
├── App.tsx                      # Root component entry
└── package.json                 # Dependencies & scripts
```
