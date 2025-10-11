const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for image data
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
  } else {
    console.log('Connected to Neon PostgreSQL database');
    release();
  }
});

// Initialize database tables
const initializeDatabase = async () => {
  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        name TEXT,
        height REAL,
        weight REAL,
        age INTEGER,
        gender TEXT,
        activity_level TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Meals table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT,
        calories INTEGER,
        protein REAL,
        carbs REAL,
        fat REAL,
        quantity REAL,
        unit TEXT,
        meal_type TEXT,
        date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Chat messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        message TEXT NOT NULL,
        sender TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Food database table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS food_database (
        id TEXT PRIMARY KEY,
        name TEXT,
        calories_per_100g INTEGER,
        protein_per_100g REAL,
        carbs_per_100g REAL,
        fat_per_100g REAL,
        category TEXT
      )
    `);

    // Insert sample food data
    const sampleFoods = [
      ['food-1', 'Chicken Breast', 165, 31, 0, 3.6, 'Protein'],
      ['food-2', 'Brown Rice', 111, 2.6, 23, 0.9, 'Carbohydrate'],
      ['food-3', 'Salmon', 208, 25, 0, 12, 'Protein'],
      ['food-4', 'Broccoli', 34, 2.8, 7, 0.4, 'Vegetable'],
      ['food-5', 'Eggs', 155, 13, 1.1, 11, 'Protein'],
      ['food-6', 'Oatmeal', 68, 2.4, 12, 1.4, 'Carbohydrate'],
      ['food-7', 'Banana', 89, 1.1, 23, 0.3, 'Fruit'],
      ['food-8', 'Almonds', 579, 21, 22, 50, 'Fat'],
      ['food-9', 'Greek Yogurt', 59, 10, 3.6, 0.4, 'Protein'],
      ['food-10', 'Sweet Potato', 86, 1.6, 20, 0.1, 'Carbohydrate']
    ];

    for (const food of sampleFoods) {
      await pool.query(`
        INSERT INTO food_database 
        (id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, food);
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

// Initialize database on startup
initializeDatabase();

// TDEE calculation function
function calculateTDEE(height, weight, age, gender, activityLevel) {
  // Check if all required values are present
  if (!height || !weight || !age || !gender || !activityLevel) {
    return 0;
  }

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender.toLowerCase() === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }

  // Activity multipliers
  const activityMultipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };

  const multiplier = activityMultipliers[activityLevel] || 1.2;
  const tdee = Math.round(bmr * multiplier);
  
  return tdee;
}

// OpenAI Diet Planning and Coaching Service
async function generateDietPlan(userProfile, nutritionData, goal = 'maintain') {
  try {
    const prompt = `You are a professional nutritionist and diet coach. Create a personalized diet plan based on the following user information:

User Profile:
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg
- Age: ${userProfile.age} years
- Gender: ${userProfile.gender}
- Activity Level: ${userProfile.activityLevel}
- Daily Calorie Goal (TDEE): ${nutritionData.tdee} calories
- Goal: ${goal}

Current Nutrition Status:
- Calories Consumed Today: ${nutritionData.consumed.calories}
- Calories Remaining: ${nutritionData.remaining.calories}
- Protein Consumed: ${nutritionData.consumed.protein}g
- Carbs Consumed: ${nutritionData.consumed.carbs}g
- Fat Consumed: ${nutritionData.consumed.fat}g

Please provide:
1. A personalized diet plan with specific meal suggestions
2. Macro distribution recommendations
3. Hydration goals
4. Meal timing advice
5. Foods to include and avoid
6. Portion size guidance

Format your response as a structured diet plan with clear sections.`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI diet planning error:', error);
    return "I'm sorry, I'm having trouble generating a diet plan right now. Please try again later.";
  }
}

async function generateAICoachResponse(userMessage, userProfile, nutritionData, chatHistory = []) {
  try {
    // Build context from chat history
    const historyContext = chatHistory.slice(-5).map(msg => 
      `${msg.sender}: ${msg.message}`
    ).join('\n');

    const prompt = `You are an AI Diet Coach named "GymFreak Coach". You are knowledgeable, supportive, and personalized. 

User Profile:
- Height: ${userProfile.height} cm
- Weight: ${userProfile.weight} kg
- Age: ${userProfile.age} years
- Gender: ${userProfile.gender}
- Activity Level: ${userProfile.activityLevel}
- Daily Calorie Goal (TDEE): ${nutritionData.tdee} calories

Current Nutrition Status:
- Calories Consumed Today: ${nutritionData.consumed.calories}
- Calories Remaining: ${nutritionData.remaining.calories}
- Protein Consumed: ${nutritionData.consumed.protein}g (Target: ${Math.round(userProfile.weight * 1.6)}g)
- Carbs Consumed: ${nutritionData.consumed.carbs}g
- Fat Consumed: ${nutritionData.consumed.fat}g

Recent Chat History:
${historyContext}

User's Current Message: "${userMessage}"

Instructions:
1. Provide personalized, actionable advice based on their current nutrition status
2. Always mention their current calorie balance (consumed vs remaining)
3. Be encouraging and supportive
4. Give specific food recommendations when appropriate
5. Keep responses concise but helpful (2-3 paragraphs max)
6. If they ask about specific foods, provide calorie estimates and healthier alternatives
7. Always consider their TDEE and current macro intake

Respond as their personal AI diet coach:`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.8
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI coach response error:', error);
    return "I'm sorry, I'm having trouble responding right now. Please try again later.";
  }
}

// AI Food Recognition using Edamam API
async function recognizeFoodWithAI(foodDescription) {
  try {
    // Using Edamam Food Database API (free tier)
    const APP_ID = process.env.EDAMAM_APP_ID || 'your-app-id';
    const APP_KEY = process.env.EDAMAM_APP_KEY || 'your-app-key';
    
    // For demo purposes, we'll use a mock response if no API keys are provided
    if (APP_ID === 'your-app-id' || APP_KEY === 'your-app-key') {
      return mockFoodRecognition(foodDescription);
    }

    const response = await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
      params: {
        q: foodDescription,
        app_id: APP_ID,
        app_key: APP_KEY,
        limit: 1
      }
    });

    if (response.data.hints && response.data.hints.length > 0) {
      const food = response.data.hints[0].food;
      const nutrients = food.nutrients;
      
      return {
        name: food.label,
        calories: Math.round(nutrients.ENERC_KCAL || 0),
        protein: Math.round((nutrients.PROCNT || 0) * 10) / 10,
        carbs: Math.round((nutrients.CHOCDF || 0) * 10) / 10,
        fat: Math.round((nutrients.FAT || 0) * 10) / 10,
        confidence: 'high',
        source: 'edamam'
      };
    }
    
    return null;
  } catch (error) {
    console.error('AI Food Recognition Error:', error.message);
    return mockFoodRecognition(foodDescription);
  }
}

// Mock food recognition for demo purposes
function mockFoodRecognition(foodDescription) {
  const lowerDescription = foodDescription.toLowerCase();
  
  // Parse quantity and unit from description
  const quantityMatch = lowerDescription.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
  let quantity = 1;
  let unit = 'piece';
  let cleanDescription = foodDescription;
  
  if (quantityMatch) {
    quantity = parseFloat(quantityMatch[1]);
    cleanDescription = quantityMatch[2];
    
    // Check for specific units in the description
    if (cleanDescription.includes('cup') || cleanDescription.includes('cups')) {
      unit = 'cup';
    } else if (cleanDescription.includes('tbsp') || cleanDescription.includes('tablespoon')) {
      unit = 'tbsp';
    } else if (cleanDescription.includes('tsp') || cleanDescription.includes('teaspoon')) {
      unit = 'tsp';
    } else if (cleanDescription.includes('slice') || cleanDescription.includes('slices')) {
      unit = 'slice';
    } else if (cleanDescription.includes('gram') || cleanDescription.includes('grams') || cleanDescription.includes('g ')) {
      unit = 'g';
    } else if (cleanDescription.includes('kg') || cleanDescription.includes('kilogram')) {
      unit = 'kg';
    } else if (cleanDescription.includes('oz') || cleanDescription.includes('ounce')) {
      unit = 'oz';
    } else if (cleanDescription.includes('lb') || cleanDescription.includes('pound')) {
      unit = 'lb';
    } else {
      // Determine unit based on quantity and food type
      if (quantity === 1) {
        unit = 'piece';
      } else if (quantity < 1) {
        unit = 'g';
      } else {
        // Check if it's a countable item
        const countableItems = ['apple', 'banana', 'orange', 'egg', 'bread', 'potato', 'tomato', 'onion', 'chicken', 'fish', 'beef'];
        const isCountable = countableItems.some(item => cleanDescription.includes(item));
        unit = isCountable ? 'piece' : 'g';
      }
    }
  }
  
  // Simple keyword matching for demo
  const foodDatabase = {
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    'rice': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
    'bolognese': { calories: 200, protein: 12, carbs: 20, fat: 8 },
    'burger': { calories: 350, protein: 25, carbs: 30, fat: 15 },
    'pizza': { calories: 300, protein: 12, carbs: 35, fat: 12 },
    'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
    'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1 }
  };

  // Find matching food
  for (const [key, nutrition] of Object.entries(foodDatabase)) {
    if (cleanDescription.includes(key)) {
      return {
        name: cleanDescription,
        calories: nutrition.calories,
        protein: nutrition.protein,
        carbs: nutrition.carbs,
        fat: nutrition.fat,
        confidence: 'medium',
        source: 'mock',
        quantity: quantity,
        unit: unit
      };
    }
  }

  // Default fallback
  return {
    name: cleanDescription,
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 3,
    confidence: 'low',
    source: 'fallback',
    quantity: quantity,
    unit: unit
  };
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, height, weight, age, gender, activityLevel } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Check if user already exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    await pool.query(
      `INSERT INTO users (id, email, password, name, height, weight, age, gender, activity_level) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, email, hashedPassword, name, height, weight, age, gender, activityLevel]
    );

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: userId, email, name, height, weight, age, gender, activityLevel }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        height: user.height,
        weight: user.weight,
        age: user.age,
        gender: user.gender,
        activityLevel: user.activity_level
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tdee = calculateTDEE(user.height, user.weight, user.age, user.gender, user.activity_level);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      height: user.height,
      weight: user.weight,
      age: user.age,
      gender: user.gender,
      activityLevel: user.activity_level,
      tdee
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name, height, weight, age, gender, activityLevel } = req.body;

    await pool.query(
      `UPDATE users 
       SET name = $1, height = $2, weight = $3, age = $4, gender = $5, activity_level = $6 
       WHERE id = $7`,
      [name, height, weight, age, gender, activityLevel, req.user.userId]
    );

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get food database
app.get('/api/foods', async (req, res) => {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM food_database';
    let params = [];

    if (search) {
      query += ' WHERE name ILIKE $1';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Food database error:', error);
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

// AI Food Recognition endpoint
app.post('/api/ai/recognize-food', async (req, res) => {
  try {
    const { foodDescription } = req.body;
    if (!foodDescription || foodDescription.trim().length === 0) {
      return res.status(400).json({ error: 'Food description is required' });
    }
    const result = await recognizeFoodWithAI(foodDescription.trim());
    if (!result) {
      return res.status(404).json({ error: 'Could not recognize food item' });
    }
    res.json(result);
  } catch (error) {
    console.error('AI Food Recognition Error:', error);
    res.status(500).json({ error: 'AI recognition failed' });
  }
});

// Log meal
app.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, quantity, unit, mealType } = req.body;
    const mealId = uuidv4();
    const today = new Date().toISOString().split('T')[0];

    await pool.query(
      `INSERT INTO meals (id, user_id, name, calories, protein, carbs, fat, quantity, unit, meal_type, date, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
      [mealId, req.user.userId, name, calories, protein, carbs, fat, quantity, unit, mealType, today]
    );

    res.json({ message: 'Meal logged successfully' });
  } catch (error) {
    console.error('Meal logging error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Get meals
app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      'SELECT * FROM meals WHERE user_id = $1 AND date = $2 ORDER BY created_at DESC',
      [req.user.userId, targetDate]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Meals fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Get nutrition summary
app.get('/api/nutrition/summary', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        SUM(calories) as total_calories,
        SUM(protein) as total_protein,
        SUM(carbs) as total_carbs,
        SUM(fat) as total_fat
       FROM meals 
       WHERE user_id = $1 AND date = $2`,
      [req.user.userId, targetDate]
    );

    const summary = result.rows[0];
    res.json({
      date: targetDate,
      total_calories: summary.total_calories || 0,
      total_protein: summary.total_protein || 0,
      total_carbs: summary.total_carbs || 0,
      total_fat: summary.total_fat || 0
    });
  } catch (error) {
    console.error('Nutrition summary error:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition summary' });
  }
});

// Delete a meal
app.delete('/api/meals/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM meals WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Meal deletion error:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Chat Messages API

// Get chat messages for a user
app.get('/api/chat/messages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY timestamp ASC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// Save a chat message
app.post('/api/chat/messages', authenticateToken, async (req, res) => {
  try {
    const { message, sender } = req.body;
    const userId = req.user.userId;
    const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    if (!message || !sender) {
      return res.status(400).json({ error: 'Message and sender are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO chat_messages (id, user_id, message, sender) VALUES ($1, $2, $3, $4) RETURNING *',
      [messageId, userId, message, sender]
    );
    
    res.json({ 
      id: messageId, 
      message, 
      sender, 
      timestamp: result.rows[0].timestamp
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

// Delete all chat messages for a user (optional cleanup endpoint)
app.delete('/api/chat/messages', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM chat_messages WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({ message: 'All chat messages deleted successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

// Generate AI Coach Response using OpenAI
app.post('/api/ai/coach-response', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get user profile
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const userProfile = userResult.rows[0];
    
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get nutrition data
    const today = new Date().toISOString().split('T')[0];
    const mealsResult = await pool.query(
      'SELECT * FROM meals WHERE user_id = $1 AND date = $2',
      [req.user.userId, today]
    );
    const meals = mealsResult.rows;
    
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
    
    const tdee = calculateTDEE(userProfile.height, userProfile.weight, userProfile.age, userProfile.gender, userProfile.activity_level);
    
    const nutritionData = {
      tdee,
      consumed: {
        calories: totalCalories,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      },
      remaining: {
        calories: Math.max(0, tdee - totalCalories),
        protein: Math.max(0, Math.round((userProfile.weight * 1.6 - totalProtein) * 10) / 10),
        carbs: Math.max(0, Math.round((tdee * 0.45 / 4 - totalCarbs) * 10) / 10),
        fat: Math.max(0, Math.round((tdee * 0.25 / 9 - totalFat) * 10) / 10)
      }
    };

    // Get recent chat history
    const chatResult = await pool.query(
      'SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 10',
      [req.user.userId]
    );
    const chatHistory = chatResult.rows.reverse();

    // Generate AI response
    const aiResponse = await generateAICoachResponse(message, userProfile, nutritionData, chatHistory);

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Coach response error:', error);
    res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Generate Personalized Diet Plan using OpenAI
app.post('/api/ai/diet-plan', authenticateToken, async (req, res) => {
  try {
    const { goal = 'maintain' } = req.body;

    // Get user profile
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.userId]);
    const userProfile = userResult.rows[0];
    
    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get nutrition data
    const today = new Date().toISOString().split('T')[0];
    const mealsResult = await pool.query(
      'SELECT * FROM meals WHERE user_id = $1 AND date = $2',
      [req.user.userId, today]
    );
    const meals = mealsResult.rows;
    
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
    
    const tdee = calculateTDEE(userProfile.height, userProfile.weight, userProfile.age, userProfile.gender, userProfile.activity_level);
    
    const nutritionData = {
      tdee,
      consumed: {
        calories: totalCalories,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      },
      remaining: {
        calories: Math.max(0, tdee - totalCalories),
        protein: Math.max(0, Math.round((userProfile.weight * 1.6 - totalProtein) * 10) / 10),
        carbs: Math.max(0, Math.round((tdee * 0.45 / 4 - totalCarbs) * 10) / 10),
        fat: Math.max(0, Math.round((tdee * 0.25 / 9 - totalFat) * 10) / 10)
      }
    };

    // Generate diet plan
    const dietPlan = await generateDietPlan(userProfile, nutritionData, goal);

    res.json({ dietPlan });
  } catch (error) {
    console.error('Diet plan generation error:', error);
    res.status(500).json({ error: 'Failed to generate diet plan' });
  }
});

// Get current day's nutrition summary for AI Coach
app.get('/api/ai/nutrition-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's TDEE first
    const userResult = await pool.query(
      'SELECT height, weight, age, gender, activity_level FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    
    // Calculate TDEE
    let bmr;
    if (user.gender.toLowerCase() === 'male') {
      bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) + 5;
    } else {
      bmr = (10 * user.weight) + (6.25 * user.height) - (5 * user.age) - 161;
    }
    
    const activityMultipliers = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very_active': 1.9
    };
    
    const tdee = Math.round(bmr * (activityMultipliers[user.activity_level] || 1.2));
    
    // Get today's meals
    const mealsResult = await pool.query(
      'SELECT * FROM meals WHERE user_id = $1 AND date = $2',
      [userId, today]
    );
    
    const meals = mealsResult.rows;
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const totalProtein = meals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
    const totalCarbs = meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
    const totalFat = meals.reduce((sum, meal) => sum + (meal.fat || 0), 0);
    
    res.json({
      tdee,
      consumed: {
        calories: totalCalories,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      },
      remaining: {
        calories: Math.max(0, tdee - totalCalories),
        protein: Math.max(0, Math.round((user.weight * 1.6 - totalProtein) * 10) / 10),
        carbs: Math.max(0, Math.round((tdee * 0.45 / 4 - totalCarbs) * 10) / 10),
        fat: Math.max(0, Math.round((tdee * 0.25 / 9 - totalFat) * 10) / 10)
      },
      progress: {
        calories: Math.round((totalCalories / tdee) * 100),
        protein: Math.round((totalProtein / (user.weight * 1.6)) * 100),
        carbs: Math.round((totalCarbs / (tdee * 0.45 / 4)) * 100),
        fat: Math.round((totalFat / (tdee * 0.25 / 9)) * 100)
      }
    });
  } catch (error) {
    console.error('Nutrition summary error:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition summary' });
  }
});

// AI Image Recognition endpoint
app.post('/api/ai/recognize-image', authenticateToken, async (req, res) => {
  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.error('OpenAI API key not configured - returning mock response');
      
      // Return a mock response for testing
      const mockFoods = [
        { name: 'Grilled Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, quantity: 150, unit: 'g', confidence: 85 },
        { name: 'White Rice', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, quantity: 100, unit: 'g', confidence: 90 },
        { name: 'Apple', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, quantity: 1, unit: 'piece', confidence: 95 },
        { name: 'Banana', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, quantity: 1, unit: 'piece', confidence: 92 },
        { name: 'Bread Slice', calories: 80, protein: 3, carbs: 15, fat: 1, quantity: 1, unit: 'slice', confidence: 88 }
      ];
      
      const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)];
      
      return res.json({
        foods: [{
          ...randomFood,
          source: 'Mock AI Recognition (API Key Not Configured)'
        }]
      });
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Use OpenAI Vision API for food recognition
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Updated to use GPT-4o which includes vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image and identify ALL food items visible. For each food item, provide nutritional information. Return ONLY a JSON object with this structure: {\"foods\": [{\"name\": \"item1\", \"calories_per_100g\": 100, \"protein_per_100g\": 10, \"carbs_per_100g\": 15, \"fat_per_100g\": 5, \"estimated_quantity\": 150, \"unit\": \"g\", \"confidence\": 0.9}, {\"name\": \"item2\", ...}]}. If it's a single item, still use the foods array with one object. Be specific about each food item and provide realistic nutritional values. Do not include any other text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
                detail: "low" // Use low detail for faster processing
              }
            }
          ]
        }
      ],
      max_tokens: 300
    });

    const aiResponse = response.choices[0].message.content;
    console.log('AI Response:', aiResponse);
    
    try {
      // Clean the response to extract JSON
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.split('```json')[1].split('```')[0];
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.split('```')[1].split('```')[0];
      }
      
      const foodData = JSON.parse(cleanResponse);
      console.log('Parsed food data:', foodData);
      
      // Handle both single food and multiple foods format
      let foods = [];
      if (foodData.foods && Array.isArray(foodData.foods)) {
        // Multiple foods format
        foods = foodData.foods.map(food => ({
          name: food.name || 'Unknown Food',
          calories: Math.round(food.calories_per_100g || 0),
          protein: Math.round((food.protein_per_100g || 0) * 10) / 10,
          carbs: Math.round((food.carbs_per_100g || 0) * 10) / 10,
          fat: Math.round((food.fat_per_100g || 0) * 10) / 10,
          quantity: food.estimated_quantity || 100,
          unit: food.unit || 'g',
          confidence: Math.round((food.confidence || 0.5) * 100),
          source: 'AI Vision Recognition'
        }));
      } else {
        // Single food format (fallback)
        foods = [{
          name: foodData.name || 'Unknown Food',
          calories: Math.round(foodData.calories_per_100g || 0),
          protein: Math.round((foodData.protein_per_100g || 0) * 10) / 10,
          carbs: Math.round((foodData.carbs_per_100g || 0) * 10) / 10,
          fat: Math.round((foodData.fat_per_100g || 0) * 10) / 10,
          quantity: foodData.estimated_quantity || 100,
          unit: foodData.unit || 'g',
          confidence: Math.round((foodData.confidence || 0.5) * 100),
          source: 'AI Vision Recognition'
        }];
      }

      res.json({ foods });
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', aiResponse);
      
      // Try to extract food name from the response even if JSON parsing fails
      let foodName = 'Food Item';
      if (aiResponse.toLowerCase().includes('chicken')) foodName = 'Chicken';
      else if (aiResponse.toLowerCase().includes('rice')) foodName = 'Rice';
      else if (aiResponse.toLowerCase().includes('apple')) foodName = 'Apple';
      else if (aiResponse.toLowerCase().includes('banana')) foodName = 'Banana';
      else if (aiResponse.toLowerCase().includes('bread')) foodName = 'Bread';
      
      // Fallback response
      res.json({
        foods: [{
          name: foodName,
          calories: 150,
          protein: 10,
          carbs: 20,
          fat: 5,
          quantity: 100,
          unit: 'g',
          confidence: 50,
          source: 'AI Vision Recognition (Fallback)'
        }]
      });
    }

  } catch (error) {
    console.error('AI image recognition error:', error);
    res.status(500).json({ error: 'Failed to recognize food image' });
  }
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../client/build')));

// Handle React routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
