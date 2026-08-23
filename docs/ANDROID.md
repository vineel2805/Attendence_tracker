# Android Setup

Attendly uses [Capacitor](https://capacitorjs.com/) to package the React application as a native Android application.

## Requirements

* Node.js and npm
* Android Studio
* Android SDK
* JDK compatible with the project's Gradle configuration

## Setup

Install the project dependencies:

```bash
npm install
```

Build the web application:

```bash
npm run build
```

Initialize and synchronize the Android project:

```bash
npx cap sync android
```

Open the Android project in Android Studio:

```bash
npx cap open android
```

From Android Studio, select a connected Android device or emulator and run the application.

## Development Workflow

After making changes to the web application, rebuild and synchronize the Android project:

```bash
npm run build
npx cap sync android
```

Then run the application again from Android Studio.

## Build APK

### Debug APK

From the project root:

**Windows**

```bash
cd android
gradlew.bat assembleDebug
```

**macOS / Linux**

```bash
cd android
./gradlew assembleDebug
```

The APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK

For a release build:

**Windows**

```bash
cd android
gradlew.bat assembleRelease
```

**macOS / Linux**

```bash
cd android
./gradlew assembleRelease
```

The APK is generated at:

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Release distribution should use a properly configured Android signing key.

## Android Project Structure

The native Android project is located in:

```text
android/
```

The web application remains the primary application source. Capacitor synchronizes the production web build into the Android project.

```text
Attendence_tracker/
├── src/
├── public/
├── android/
├── docs/
├── capacitor.config.*
└── package.json
```

## Notes

* Run `npm run build` before `npx cap sync android` whenever web changes need to be reflected in Android.
* Do not commit generated APK files to the repository.
* Production APKs should be distributed through GitHub Releases.
* Keep Android-specific native changes inside the `android/` project.
