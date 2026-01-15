# Student Attendance Calculator

A modern, mobile-first attendance tracking application for students built with React, TypeScript, and Tailwind CSS.

## Features

### 📊 Dashboard
- Real-time attendance percentage overview
- Visual stats with present/absent period counts
- Quick access to all features

### ✅ Mark Attendance
- Mark daily attendance by period
- Support for multiple subjects (Theory & Lab)
- Holiday marking with custom reasons

### 📅 Calendar
- Monthly calendar view with color-coded attendance
- View attendance history by date
- Edit past attendance records
- Mark days as holidays (festivals, public holidays, etc.)

### 📈 Predict Attendance
- Plan future attendance with calendar-based UI
- See real-time impact on attendance percentage
- Side-by-side current vs predicted stats
- Quick actions: All Present, All Absent, Clear

### 📋 Timetable
- Configure weekly timetable
- Assign subjects to specific periods
- Day-wise period management

### ⚙️ Settings
- Configure period duration
- Set periods per day (per weekday)
- Manage subjects (Theory/Lab types)
- Inline stepper controls for easy editing

### 👤 Profile
- Compact profile view
- Edit profile via bottom sheet
- Quick access to settings

## Tech Stack

- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS with custom theme variables
- **Routing:** React Router DOM
- **Icons:** Lucide React
- **Notifications:** Sonner (toast notifications)
- **Build Tool:** Vite
- **Storage:** LocalStorage for data persistence

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <https://github.com/vineel2805/Attendence_tracker.git>
cd "Attendence_tracker.git"

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
├── app/
│   ├── components/     # Reusable UI components
│   │   ├── AppBar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── PeriodCard.tsx
│   │   ├── StatCard.tsx
│   │   └── ui/         # shadcn/ui components
│   ├── screens/        # Page components
│   │   ├── AttendanceScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── PredictScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   ├── SignupScreen.tsx
│   │   └── TimetableScreen.tsx
│   └── App.tsx         # Main app with routing
├── styles/
│   ├── fonts.css
│   ├── index.css
│   ├── tailwind.css
│   └── theme.css       # Theme variables
├── types/
│   └── index.ts        # TypeScript type definitions
├── utils/
│   ├── attendance.ts   # Attendance calculation utilities
│   └── storage.ts      # LocalStorage wrapper
└── main.tsx            # App entry point
```

## Theme

The app supports both dark and light themes with a professional academic look:

- **Dark Mode:** Deep navy background with neutral accents
- **Light Mode:** Clean white background with subtle borders
- **Colors:** Success (green), Warning (yellow), Danger (red), Accent (blue)

## Key Features Implementation

### Holiday Support
- Mark any day as a holiday with a custom reason
- Holidays are excluded from attendance calculations
- Visual indicators on calendar (purple dots)

### Attendance Prediction
- Select future dates to plan attendance
- Mark individual periods as present/absent
- Real-time percentage calculation
- Status indicators: Safe (≥75%), Warning (65-74%), Risk (<65%)

### Inline Editing
- Period configuration uses +/- steppers
- Changes are tracked and saved on demand
- Bottom sheet modals for subject editing

## License

MIT License - See LICENSE file for details




