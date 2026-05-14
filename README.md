# 🎨 DesignArena - Web Designing Competition Event Management System

A complete DHTML-based web application for managing web design competitions, built entirely with HTML5, CSS3, JavaScript, and LocalStorage.

## 🚀 Quick Start

1. Open `index.html` in any modern browser to access the **Participant Panel**
2. Open `admin/login.html` for the **Admin Panel**

### Sample Credentials

| Role | Username | Password/Lot |
|------|----------|--------------|
| Admin | admin | admin123 |
| Participant | Alice Johnson | LOT001 |
| Participant | Bob Smith | LOT002 |
| Participant | Carol Davis | LOT003 |
| Participant | David Lee | LOT004 |
| Participant | Eve Martinez | LOT005 |

## 📁 Project Structure

```
web-design-event/
├── index.html                 # Participant Login
├── user-dashboard.html        # Competition Workspace
├── leaderboard.html           # Public Leaderboard
├── admin/
│   ├── login.html             # Admin Login
│   ├── dashboard.html         # Admin Dashboard
│   ├── participants.html      # Participant Management
│   ├── challenges.html        # Challenge Management
│   ├── monitoring.html        # Live Monitoring
│   ├── submissions.html       # Submission Review
│   └── results.html           # Results & Export
├── css/
│   ├── style.css              # Main Stylesheet
│   └── admin.css              # Admin Panel Styles
├── js/
│   ├── storage.js             # Data Layer (LocalStorage)
│   ├── auth.js                # Authentication
│   ├── tracker.js             # Activity Tracking
│   ├── user.js                # User Workspace Logic
│   ├── admin.js               # Admin Panel Logic
│   └── leaderboard.js         # Leaderboard Calculations
└── README.md
```

## ✨ Features

### Participant Panel
- Login with Username + Lot Number
- Sequential challenge unlocking
- Embedded HTML/CSS code editor with live preview
- Countdown timer per challenge
- Auto-save every 5 seconds
- Auto-submit on time expiry
- Activity tracking (tab switches, copy, paste)
- Progress visualization
- Full-screen mode

### Admin Panel
- Secure admin login
- Dashboard with real-time statistics
- Participant CRUD (add, edit, delete, search)
- Challenge management (create, edit, activate/deactivate)
- Live monitoring of all participants
- Submission review with code + preview
- Manual score assignment
- Configurable penalty settings
- Result calculation with scoring formula
- Export to CSV and PDF
- Backup & restore data

### Scoring Formula
```
Final Score = Challenge Marks - Penalties + Bonuses

Penalties (configurable):
  Tab Switch = -2 marks (default)
  Copy       = -5 marks (default)
  Paste      = -1 mark  (default)

Bonus:
  +1 mark per minute of early completion (default)
```

## 🛠️ Technology Stack
- HTML5 + CSS3 + JavaScript (DHTML)
- LocalStorage for data persistence
- No external dependencies or backend required

## 🎨 Design Features
- Dark/Light theme toggle
- Glassmorphism cards
- Animated gradient backgrounds
- Responsive layout
- Smooth transitions & micro-animations
