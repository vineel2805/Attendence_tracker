# 🔥 Firebase Setup Guide -Attendly a Student Attendance Calculator app 

Complete guide to set up Firebase Authentication and Firestore for your app.

---

## 📋 Table of Contents

1. [Create Firebase Project](#1-create-firebase-project)
2. [Enable Authentication](#2-enable-authentication)
3. [Set Up Firestore Database](#3-set-up-firestore-database)
4. [Get Firebase Config](#4-get-firebase-config)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Firestore Security Rules](#6-firestore-security-rules)
7. [Firestore Indexes](#7-firestore-indexes)
8. [Deploy to Firebase Hosting](#8-deploy-to-firebase-hosting)
9. [Data Structure](#9-data-structure)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Create Firebase Project

### Step 1.1: Go to Firebase Console
1. Open https://console.firebase.google.com/
2. Sign in with your Google account

### Step 1.2: Create New Project
1. Click **"Create a project"** (or **"Add project"**)
2. Enter project name: `student-attendance-calculator` (or your preferred name)
3. Click **Continue**

### Step 1.3: Google Analytics (Optional)
1. You can disable Google Analytics for this project (not required)
2. Click **Continue** → **Create project**
3. Wait for project creation (30-60 seconds)
4. Click **Continue** when done

---

## 2. Enable Authentication

### Step 2.1: Navigate to Authentication
1. In Firebase Console, click **Build** in the left sidebar
2. Click **Authentication**
3. Click **Get started**

### Step 2.2: Enable Email/Password Provider
1. Click the **Sign-in method** tab
2. Click **Email/Password**
3. Toggle **Enable** to ON
4. Leave "Email link (passwordless sign-in)" disabled
5. Click **Save**

### Step 2.3: Enable Google Sign-In Provider
1. Still in the **Sign-in method** tab
2. Click **Google**
3. Toggle **Enable** to ON
4. Enter a **Project support email** (your email)
5. Click **Save**

### Step 2.4: (Optional) Configure Password Policy
1. Go to **Settings** tab in Authentication
2. Under **Password policy**, you can set:
   - Minimum password length (default: 6)
   - Require uppercase, lowercase, numbers, symbols

---

## 3. Set Up Firestore Database

### Step 3.1: Create Database
1. In Firebase Console, click **Build** in the left sidebar
2. Click **Firestore Database**
3. Click **Create database**

### Step 3.2: Choose Security Rules
1. Select **Start in test mode** (we'll add proper rules later)
   - ⚠️ Test mode allows anyone to read/write for 30 days
2. Click **Next**

### Step 3.3: Select Location
1. Choose a Cloud Firestore location closest to your users:
   - **asia-south1** (Mumbai) - for India
   - **us-central** (Iowa) - for USA
   - **europe-west** (Belgium) - for Europe
2. ⚠️ **This cannot be changed later!**
3. Click **Enable**

### Step 3.4: Wait for Provisioning
1. Wait for Firestore to be provisioned (1-2 minutes)
2. You'll see the Firestore console when ready

---

## 4. Get Firebase Config

### Step 4.1: Register Web App
1. In Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Click **Project settings**
3. Scroll down to **"Your apps"** section
4. Click the **</>** (Web) icon to add a web app

### Step 4.2: App Registration
1. Enter app nickname: `Student Attendance Web`
2. ☑️ Check **"Also set up Firebase Hosting"** (optional, for deployment)
3. Click **Register app**

### Step 4.3: Copy Config Values
You'll see a code snippet like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

**Copy these values** - you'll need them in the next step.

---

## 5. Configure Environment Variables

### Step 5.1: Create .env File
1. In your project root, create a file named `.env`
2. Add your Firebase config values:

```env
VITE_FIREBASE_API_KEY=AIzaSyC...your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 5.2: Add to .gitignore
Make sure `.env` is in your `.gitignore` file:

```
# Environment variables
.env
.env.local
.env.*.local
```

### Step 5.3: Restart Dev Server
After creating `.env`, restart your development server:

```bash
npm run dev
```

---
## 5. Android Firebase Configuration

If you are building the Attendly Android application, you must register the Android app separately in Firebase and add the generated `google-services.json` file to the Android project.

### Step 5.1: Register the Android App

1. Open **Firebase Console → Project Settings**.
2. In **Your apps**, click **Add app**.
3. Select the **Android** icon.
4. Enter the Android package name used by Attendly.

You can find the package name in the Android project configuration:

```text
android/app/build.gradle
```

Look for:

```gradle
namespace "your.package.name"
```

Use the same package name when registering the Android app in Firebase.

### Step 5.2: Download `google-services.json`

After registering the Android app:

1. Download `google-services.json` from Firebase Console.
2. Place the file in:

```text
android/app/google-services.json
```

The project should look like:

```text
Attendence_tracker/
├── android/
│   └── app/
│       ├── google-services.json
│       ├── build.gradle
│       └── src/
├── src/
├── docs/
└── package.json
```

### Step 5.3: Important

`google-services.json` is required for the Android Firebase configuration.

Do **not** place it inside `src/` or the project root.

Do **not** rename the file.

The expected location is:

```text
android/app/google-services.json
```

### Step 5.4: Sync the Android Project

After adding the file, synchronize the Capacitor Android project:

```bash
npm run build
npx cap sync android
```

Then open the project in Android Studio:

```bash
npx cap open android
```

Firebase services used by the Android application will now use the Android app configuration registered in Firebase.

### Security Note

`google-services.json` contains Firebase project and application configuration. It is **not equivalent to a server-side secret key**. Firebase security must be enforced through Authentication, Firestore Security Rules, and other appropriate Firebase protections.

If your project policy requires keeping configuration files out of the repository, add the file to `.gitignore` and provide it separately during Android setup.


## 6. Firestore Security Rules

### Step 6.1: Navigate to Rules
1. In Firebase Console → Firestore Database
2. Click the **Rules** tab

### Step 6.2: Set Security Rules
Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only access their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Users can access their own data subcollection
      match /data/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Step 6.3: Publish Rules
1. Click **Publish** to apply the rules
2. Wait for confirmation

### What These Rules Do:
- ✅ Users can only read/write their own data
- ✅ Must be authenticated to access any data
- ✅ Each user's data is isolated from others
- ❌ Unauthenticated users cannot access anything
- ❌ Users cannot access other users' data

---

## 7. Firestore Indexes

For this app, **no custom indexes are required**! The app uses simple document reads/writes that don't need composite indexes.

### If You Get Index Errors:
1. Firebase will show an error message with a link
2. Click the link to auto-create the required index
3. Wait 2-5 minutes for index to build

### Manual Index Creation (if needed):
1. Go to Firestore → **Indexes** tab
2. Click **Add Index**
3. Configure based on the error message

---

## 8. Deploy to Firebase Hosting

### Step 8.1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 8.2: Login to Firebase
```bash
firebase login
```

### Step 8.3: Initialize Firebase in Project
```bash
firebase init
```

Select these options:
1. **Which Firebase features?** → Select with Space:
   - ☑️ Hosting: Configure files for Firebase Hosting
2. **Use an existing project** → Select your project
3. **Public directory** → Type: `dist`
4. **Single-page app?** → Yes
5. **Set up automatic builds with GitHub?** → No (or Yes if you want CI/CD)
6. **Overwrite dist/index.html?** → No

### Step 8.4: Build and Deploy
```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy
```

### Step 8.5: Access Your App
After deployment, you'll get a URL like:
```
https://your-project-id.web.app
```

---

## 9. Data Structure

### Firestore Collections Structure:

```
users/
├── {userId}/                          # User document
│   ├── uid: string                    # User ID
│   ├── email: string                  # User email
│   ├── fullName: string               # User's full name
│   ├── rollNumber: string             # Student roll number
│   ├── profileComplete: boolean       # Profile completion status
│   ├── emailVerified: boolean         # Email verification status
│   ├── createdAt: string              # Account creation timestamp
│   ├── updatedAt: string              # Last update timestamp
│   │
│   └── data/                          # Subcollection for user data
│       │
│       ├── settings/                  # Settings document
│       │   ├── periodDurationMinutes: number
│       │   ├── days: {
│       │   │   Mon: { day: "Mon", totalPeriods: number },
│       │   │   Tue: { day: "Tue", totalPeriods: number },
│       │   │   ...
│       │   }
│       │   └── updatedAt: string
│       │
│       ├── subjects/                  # Subjects document
│       │   ├── list: [
│       │   │   { id: string, name: string, type: "theory"|"lab" },
│       │   │   ...
│       │   ]
│       │   └── updatedAt: string
│       │
│       ├── timetable/                 # Timetable document
│       │   ├── schedule: {
│       │   │   Mon: [{ id, day, subjectId, startPeriod, duration }],
│       │   │   Tue: [...],
│       │   │   ...
│       │   }
│       │   └── updatedAt: string
│       │
│       └── attendance/                # Attendance document
│           ├── records: [
│           │   {
│           │     date: "YYYY-MM-DD",
│           │     periods: { periodId: "present"|"absent" },
│           │     isHoliday: boolean,
│           │     holidayReason: string
│           │   },
│           │   ...
│           ]
│           └── updatedAt: string
```

### Why This Structure?
- **User isolation**: Each user has their own document and subcollection
- **Efficient reads**: All user data is in one place
- **Security**: Easy to write rules that protect user data
- **Scalability**: Works well for thousands of users

---

## 10. Troubleshooting

### Error: "Firebase: Error (auth/configuration-not-found)"
**Cause:** Invalid Firebase config or project not set up correctly.
**Solution:**
1. Verify `.env` file exists and has correct values
2. Check Firebase Console → Project Settings for correct config
3. Restart dev server after updating `.env`

### Error: "Missing or insufficient permissions"
**Cause:** Firestore security rules blocking access.
**Solution:**
1. Check you're logged in (authenticated)
2. Verify security rules allow access for authenticated users
3. Make sure rules are published

### Error: "Firebase App named '[DEFAULT]' already exists"
**Cause:** Firebase initialized multiple times.
**Solution:**
1. Check `firebase.ts` only initializes once
2. This is handled by default in our setup

### Error: "Network request failed"
**Cause:** No internet connection or Firebase blocked.
**Solution:**
1. Check internet connection
2. Try disabling VPN/firewall temporarily
3. Check if Firebase services are blocked in your network

### Data Not Syncing
**Symptoms:** Changes not appearing on other devices.
**Solution:**
1. Make sure you're logged into the same account
2. Check browser console for errors
3. Verify Firestore is enabled in Firebase Console
4. Check network connectivity

### Login Not Working
**Symptoms:** Can't log in or sign up.
**Solution:**
1. Verify Email/Password auth is enabled in Firebase Console
2. Check console for specific error messages
3. Password must be at least 6 characters
4. Email must be valid format

---

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Keep them in `.gitignore`
2. **Use environment variables** - Don't hardcode config values
3. **Review security rules** - Keep them strict and specific
4. **Monitor usage** - Check Firebase Console for unusual activity
5. **Enable App Check** (optional) - Protects against abuse

---

## 📊 Firebase Console Quick Links

After setup, bookmark these pages:

- **Authentication Users:** `https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication/users`
- **Firestore Data:** `https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore`
- **Hosting:** `https://console.firebase.google.com/project/YOUR_PROJECT_ID/hosting`
- **Usage/Billing:** `https://console.firebase.google.com/project/YOUR_PROJECT_ID/usage`

---

## 💰 Firebase Free Tier Limits

Firebase Spark plan (free) includes:

| Service | Free Limit |
|---------|------------|
| **Authentication** | Unlimited users |
| **Firestore Reads** | 50,000/day |
| **Firestore Writes** | 20,000/day |
| **Firestore Deletes** | 20,000/day |
| **Firestore Storage** | 1 GB |
| **Hosting Storage** | 10 GB |
| **Hosting Transfer** | 360 MB/day |

For a student attendance app, this is more than enough for personal use!

---

## ✅ Setup Checklist

Before deploying, verify:

- [ ] Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Firestore database created
- [ ] Web app registered in Firebase
- [ ] `.env` file created with correct config
- [ ] `.env` added to `.gitignore`
- [ ] Security rules published
- [ ] App builds without errors (`npm run build`)
- [ ] Login/Signup works
- [ ] Data syncs across browser refreshes

---

**Your Firebase backend is ready! 🚀**
