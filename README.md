# GymFreak - Fitness & Nutrition Tracker

A platform-independent web application for tracking Total Daily Energy Expenditure (TDEE) and meal logging.

## Features

- **TDEE Calculation**: Calculate your Total Daily Energy Expenditure based on height, weight, age, gender, and activity level
- **Meal Logging**: Log your meals with detailed nutritional information
- **Nutrition Tracking**: View comprehensive nutrition summaries with charts and progress tracking
- **User Profiles**: Manage your personal information and fitness goals
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices

## Technology Stack

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Axios for API calls
- Recharts for data visualization
- Lucide React for icons
- CSS3 with modern styling

### Backend
- Node.js with Express
- SQLite database
- JWT authentication
- bcryptjs for password hashing
- CORS enabled for cross-origin requests

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GymFreakApp
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

   This will start both the backend server (port 5000) and frontend development server (port 3000).

## Usage

1. **Register**: Create a new account with your personal information
2. **Complete Profile**: Add your height, weight, age, gender, and activity level for accurate TDEE calculation
3. **Log Meals**: Search for foods in the database and log your meals with quantities
4. **Track Progress**: View your daily nutrition summary and progress towards your calorie goals

## API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile and TDEE

### Profile Management
- `PUT /api/profile` - Update user profile

### Food Database
- `GET /api/foods` - Search food database

### Meal Logging
- `POST /api/meals` - Log a new meal
- `GET /api/meals` - Get user's meals
- `DELETE /api/meals/:id` - Delete a meal

### Nutrition
- `GET /api/nutrition/summary` - Get daily nutrition summary

## TDEE Calculation

The app uses the Mifflin-St Jeor equation to calculate TDEE:

**For Men:**
BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5

**For Women:**
BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161

**TDEE = BMR × Activity Multiplier**

Activity Multipliers:
- Sedentary: 1.2
- Light: 1.375
- Moderate: 1.55
- Active: 1.725
- Very Active: 1.9

## Database Schema

### Users Table
- id (TEXT PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT)
- name (TEXT)
- height (REAL)
- weight (REAL)
- age (INTEGER)
- gender (TEXT)
- activity_level (TEXT)
- created_at (DATETIME)

### Meals Table
- id (TEXT PRIMARY KEY)
- user_id (TEXT)
- name (TEXT)
- calories (INTEGER)
- protein (REAL)
- carbs (REAL)
- fat (REAL)
- quantity (REAL)
- unit (TEXT)
- meal_type (TEXT)
- date (TEXT)
- created_at (DATETIME)

### Food Database Table
- id (TEXT PRIMARY KEY)
- name (TEXT)
- calories_per_100g (INTEGER)
- protein_per_100g (REAL)
- carbs_per_100g (REAL)
- fat_per_100g (REAL)
- category (TEXT)

## Development

### Project Structure
```
GymFreakApp/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Main server file
│   └── package.json
└── package.json           # Root package.json
```

### Available Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run client` - Start only the frontend
- `npm run server` - Start only the backend
- `npm run build` - Build the frontend for production
- `npm start` - Start the production server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue in the repository.
