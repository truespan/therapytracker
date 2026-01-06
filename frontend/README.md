# TheraP Track Frontend

React application for tracking therapy progress with visual mind-body maps.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   # Create .env file
   echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Open browser:**
   Navigate to `http://localhost:3000`

## Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App (irreversible)

## Features

### User Dashboard
- Mind-body radar chart visualization
- Session history and progress tracking
- Profile questionnaire with 10+ fields
- Session feedback and ratings
- Custom field creation

### Partner Dashboard
- View all assigned clients
- Create new therapy sessions
- Access client progress charts
- Monitor client improvements

### Organization Dashboard
- Overview statistics
- View all therapists and clients
- Access comprehensive data

## Components Structure

```
src/
├── components/
│   ├── auth/           # Login & Signup
│   ├── charts/         # Radar charts
│   ├── dashboard/      # Role dashboards
│   ├── layout/         # Navbar
│   ├── profile/        # Questionnaire
│   └── sessions/       # Session management
├── context/            # Auth context
├── pages/              # Page components
├── services/           # API calls
├── utils/              # Helpers
└── App.jsx
```

## Styling

Uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

Custom utility classes:
- `.btn` - Button base
- `.btn-primary` - Primary button
- `.btn-secondary` - Secondary button
- `.input` - Form input
- `.label` - Form label
- `.card` - Card container

## Environment Variables

```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX  # Optional: Google Analytics 4 Measurement ID
```

### Google Analytics Setup

To enable Google Analytics tracking:

1. **Create a GA4 Property** (if you don't have one):
   - Go to https://analytics.google.com/
   - Sign in with your Google account
   - Click "Start measuring" or create a new property
   - Follow the setup wizard to create a GA4 property

2. **Get Your Measurement ID**:
   - In GA4, go to Admin → Data Streams
   - Click on your web stream (or create one)
   - Copy the Measurement ID (format: `G-XXXXXXXXXX`)

3. **Add to Environment Variables**:
   - Add `REACT_APP_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to your `.env` file
   - Rebuild the application for changes to take effect

**Note**: Analytics tracking is optional. If `REACT_APP_GA_MEASUREMENT_ID` is not provided, the app will function normally without tracking.

## Building for Production

```bash
npm run build
```

Output will be in `build/` directory.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

