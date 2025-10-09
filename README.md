# 🏋️‍♂️ GymFreak - AI-Powered Fitness & Nutrition App

A comprehensive platform-independent fitness and nutrition tracking application with AI-powered features for personalized health and wellness management.

![GymFreak App](https://img.shields.io/badge/React-18.2.0-blue) ![Node.js](https://img.shields.io/badge/Node.js-18.0.0-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.0-blue) ![OpenAI](https://img.shields.io/badge/OpenAI-GPT--3.5--turbo-purple)

## ✨ Features

### 🔐 User Management
- **Secure Authentication**: JWT-based user registration and login
- **Profile Management**: Complete user profile with height, weight, age, gender, and activity level
- **Data Persistence**: PostgreSQL database for reliable data storage

### 🧮 Advanced TDEE Calculation
- **Mifflin-St Jeor Equation**: Scientifically accurate BMR and TDEE calculation
- **Gender-Specific Formulas**: Different calculations for men and women
- **Activity Level Integration**: 5 different activity levels for precise calorie needs

### 🍎 Smart Meal Logging
- **AI-Powered Food Recognition**: OpenAI integration for intelligent food identification
- **Nutritional Analysis**: Automatic calorie and macro extraction from food descriptions
- **Unit Conversion**: Smart quantity and unit handling (grams, cups, pieces, etc.)
- **Meal Categories**: Breakfast, lunch, dinner, and snacks tracking

### 🤖 AI Coach & Diet Planning
- **Personalized AI Coach**: OpenAI-powered chatbot for nutrition advice
- **Real-time Calorie Balance**: Live tracking of consumed vs remaining calories
- **Diet Plan Generation**: Customized meal plans based on user goals
- **WhatsApp-style Chat Interface**: Modern dark theme with excellent UX

### 📊 Analytics & Tracking
- **Daily Nutrition Summary**: Comprehensive overview of daily intake
- **Macro Tracking**: Protein, carbs, and fat monitoring
- **Progress Visualization**: Clear charts and progress indicators
- **Historical Data**: Track your nutrition journey over time

## 🛠️ Tech Stack

### Frontend
- **React 18.2.0** with TypeScript
- **Modern UI Components** with Lucide React icons
- **Responsive Design** with CSS Grid and Flexbox
- **Dark Theme** with glassmorphism effects

### Backend
- **Node.js 18.0.0** with Express.js
- **PostgreSQL** database with Neon cloud hosting
- **JWT Authentication** for secure user sessions
- **RESTful API** design

### AI Integration
- **OpenAI GPT-3.5-turbo** for intelligent responses
- **Edamam Food Database API** for nutrition data
- **Smart Food Recognition** with fallback mock data

## 🚀 Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- PostgreSQL database (or use Neon cloud)
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yasjudanulislam1999/GymFreak.git
   cd GymFreak
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   
   # Install server dependencies
   cd ../server
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your_jwt_secret_key
   OPENAI_API_KEY=your_openai_api_key
   EDAMAM_APP_ID=your_edamam_app_id
   EDAMAM_APP_KEY=your_edamam_app_key
   PORT=5001
   ```

4. **Run the application**
   ```bash
   # Start the server (from server directory)
   npm start
   
   # Start the client (from client directory)
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## 📱 Usage

### Getting Started
1. **Register** a new account or **login** with existing credentials
2. **Complete your profile** with height, weight, age, gender, and activity level
3. **Start logging meals** using the AI-powered food recognition
4. **Chat with your AI Coach** for personalized nutrition advice
5. **Generate diet plans** based on your fitness goals

### Key Features
- **Meal Logging**: Use AI to identify foods and automatically extract nutritional information
- **AI Coach**: Get personalized advice on nutrition, meal planning, and fitness goals
- **Diet Planning**: Generate custom meal plans for weight loss, maintenance, or weight gain
- **Real-time Tracking**: Monitor your daily calorie balance and macro intake

## 🏗️ Project Structure

```
GymFreak/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   └── ...
│   └── package.json
├── server/                 # Node.js backend
│   ├── index.js           # Main server file
│   ├── package.json
│   └── .env               # Environment variables
├── .gitignore
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/register` - User registration
- `POST /api/login` - User login
- `GET /api/profile` - Get user profile

### Meals
- `POST /api/meals` - Log a meal
- `GET /api/meals` - Get user's meals
- `DELETE /api/meals/:id` - Delete a meal

### AI Features
- `POST /api/ai/recognize-food` - AI food recognition
- `POST /api/ai/coach-response` - AI coach responses
- `POST /api/ai/diet-plan` - Generate diet plan
- `GET /api/ai/nutrition-summary` - Get nutrition summary

### Chat
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat/messages` - Save chat message
- `DELETE /api/chat/messages` - Clear chat history

## 🎨 UI/UX Features

- **Dark Theme**: Modern dark interface with gradient backgrounds
- **WhatsApp-style Chat**: Intuitive chat interface with proper message positioning
- **Glassmorphism Effects**: Beautiful translucent cards and elements
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Smooth Animations**: Engaging micro-interactions and transitions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the AI capabilities
- Edamam for nutrition database API
- Neon for PostgreSQL hosting
- React and Node.js communities for excellent documentation

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ by [Yasjudanul Islam](https://github.com/yasjudanulislam1999)**