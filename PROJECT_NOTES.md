# Student Attendance Calculator

A complete mobile-first web application for tracking student attendance with a strictly official, neutral, and minimal academic appearance.

## Design System

### Color Philosophy
- **Grayscale-first**: Primary UI uses only grayscale and neutral tones
- **Color only for states**: Green (Present), Red (Absent), Orange (Warning)
- **No brand colors**: No blue, purple, or brand-heavy colors
- **No decorative elements**: Clean, professional, distraction-free

### Typography
- **Font**: Inter (400, 500, 600)
- **H1**: 28px, Semibold
- **H2**: 22px, Semibold
- **Body**: 16px, Regular
- **Small**: 14px, Medium
- **Caption**: 12px, Regular

### Spacing & Layout
- **8px spacing system**
- **Border radius**: 10-12px
- **Mobile-first**: 390px base
- **Desktop max-width**: 1440px
- **WCAG AA compliant**

## Features

### Authentication
- Login / Sign Up
- Email-based authentication (mock)
- Profile setup wizard

### Profile Management
- Full name and roll number
- Email (read-only)
- Edit profile functionality
- Logout

### Timetable Setup
- Day-by-day schedule (Mon-Sun)
- Add/Edit/Remove periods
- Subject assignment
- Persistent storage

### Daily Attendance
- Today's date and current attendance %
- Period-wise attendance marking
- Present/Absent selection
- Save functionality

### Dashboard
- Overall attendance percentage
- Total/Present/Absent counts
- Status indicators (Safe/Warning/Risk)
- Card-based layout

### Attendance Prediction
- Input future periods to attend/miss
- Predicted attendance percentage
- Status warnings
- Real-time calculations

### Light/Dark Mode
- System-aware theme
- Manual toggle
- Consistent grayscale across themes

## Technical Stack

- **React 18** with TypeScript
- **React Router** for navigation
- **next-themes** for theme management
- **Tailwind CSS v4** for styling
- **lucide-react** for icons
- **sonner** for toast notifications
- **localStorage** for data persistence

## Data Structure

All data is stored in localStorage:
- User profile
- Timetable (day-wise periods)
- Attendance records (date-wise marking)

## Color Tokens

### Light Mode
- BG Primary: #FFFFFF
- BG Secondary: #F8FAFC
- BG Muted: #F1F5F9
- Text Primary: #0F172A
- Text Secondary: #475569
- Text Muted: #94A3B8
- Border: #E2E8F0

### Dark Mode
- BG Primary: #020617
- BG Secondary: #020617
- BG Muted: #1E293B
- Text Primary: #F8FAFC
- Text Secondary: #CBD5E1
- Text Muted: #64748B
- Border: #1E293B

### State Colors (Both Modes)
- Success (Present): #16A34A
- Danger (Absent): #DC2626
- Warning: #D97706

## Components

- **Button**: Primary, Secondary, Danger variants
- **Input**: Text, Number, Read-only with error states
- **PeriodCard**: Default, Present, Absent states
- **AppBar**: Title, theme toggle, profile link
- **BottomNav**: Mobile navigation
- **StatCard**: Stats display with color variants
- **EmptyState**: Placeholder states
- **LoadingState**: Loading indicator

## Screens

1. Login
2. Sign Up
3. Email Verification (mock)
4. Profile Setup
5. Dashboard
6. Daily Attendance
7. Timetable Setup
8. Attendance Prediction
9. Profile View/Edit

## Usage

1. **First Time**: Sign up → Complete profile → Set up timetable
2. **Daily Use**: Mark attendance for today's classes
3. **Monitor**: Check dashboard for overall stats
4. **Plan**: Use prediction to see future attendance impact
