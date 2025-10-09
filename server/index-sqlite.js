const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
  db.run(`CREATE TABLE IF NOT EXISTS meals (
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Chat messages table
  db.run(`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Food database table
  db.run(`CREATE TABLE IF NOT EXISTS food_database (
    id TEXT PRIMARY KEY,
    name TEXT,
    calories_per_100g INTEGER,
    protein_per_100g REAL,
    carbs_per_100g REAL,
    fat_per_100g REAL,
    category TEXT
  )`);

  // Insert sample food data
  const sampleFoods = [
    ['1', 'Chicken Breast', 165, 31, 0, 3.6, 'Protein'],
    ['2', 'Brown Rice', 111, 2.6, 23, 0.9, 'Carbs'],
    ['3', 'Broccoli', 34, 2.8, 7, 0.4, 'Vegetables'],
    ['4', 'Eggs', 155, 13, 1.1, 11, 'Protein'],
    ['5', 'Banana', 89, 1.1, 23, 0.3, 'Fruits'],
    ['6', 'Oats', 389, 17, 66, 7, 'Carbs'],
    ['7', 'Almonds', 579, 21, 22, 50, 'Nuts'],
    ['8', 'Salmon', 208, 25, 0, 12, 'Protein'],
    ['9', 'Sweet Potato', 86, 1.6, 20, 0.1, 'Carbs'],
    ['10', 'Avocado', 160, 2, 9, 15, 'Fruits']
  ];

  const stmt = db.prepare(`INSERT OR IGNORE INTO food_database (id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  sampleFoods.forEach(food => stmt.run(food));
  stmt.finalize();
});

// TDEE calculation function
function calculateTDEE(height, weight, age, gender, activityLevel) {
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

  const tdee = bmr * (activityMultipliers[activityLevel] || 1.2);
  return Math.round(tdee);
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
  
  // Parse quantity from description (e.g., "2 apple", "1 cup rice", "3 eggs")
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
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    'oats': { calories: 389, protein: 17, carbs: 66, fat: 7 },
    'almond': { calories: 579, protein: 21, carbs: 22, fat: 50 },
    'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12 },
    'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1 },
    'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15 },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
    'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
    'fish': { calories: 206, protein: 22, carbs: 0, fat: 12 },
    'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9 },
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
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
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
}

// Routes

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, height, weight, age, gender, activityLevel } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    db.run(
      `INSERT INTO users (id, email, password, name, height, weight, age, gender, activity_level) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, name, height, weight, age, gender, activityLevel],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }

        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, userId, message: 'User created successfully' });
      }
    );
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, userId: user.id, user: { name: user.name, email: user.email } });
    }
  );
});

// Get user profile and TDEE
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT * FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const tdee = calculateTDEE(user.height, user.weight, user.age, user.gender, user.activity_level);
      
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          height: user.height,
          weight: user.weight,
          age: user.age,
          gender: user.gender,
          activityLevel: user.activity_level
        },
        tdee
      });
    }
  );
});

// Update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const { height, weight, age, gender, activityLevel } = req.body;

  db.run(
    `UPDATE users SET height = ?, weight = ?, age = ?, gender = ?, activity_level = ? WHERE id = ?`,
    [height, weight, age, gender, activityLevel, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ message: 'Profile updated successfully' });
    }
  );
});

// Get food database
app.get('/api/foods', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM food_database';
  let params = [];

  if (search) {
    query += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }

  db.all(query, params, (err, foods) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(foods);
  });
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

// Log a meal
app.post('/api/meals', authenticateToken, (req, res) => {
  const { name, calories, protein, carbs, fat, quantity, unit, mealType, date } = req.body;
  const mealId = uuidv4();

  db.run(
    `INSERT INTO meals (id, user_id, name, calories, protein, carbs, fat, quantity, unit, meal_type, date) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [mealId, req.user.userId, name, calories, protein, carbs, fat, quantity, unit, mealType, date],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ message: 'Meal logged successfully', mealId });
    }
  );
});

// Get user's meals
app.get('/api/meals', authenticateToken, (req, res) => {
  const { date } = req.query;
  let query = 'SELECT * FROM meals WHERE user_id = ?';
  let params = [req.user.userId];

  if (date) {
    query += ' AND date = ?';
    params.push(date);
  }

  query += ' ORDER BY created_at DESC';

  db.all(query, params, (err, meals) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(meals);
  });
});

// Get daily nutrition summary
app.get('/api/nutrition/summary', authenticateToken, (req, res) => {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().split('T')[0];

  db.all(
    `SELECT 
      SUM(calories) as total_calories,
      SUM(protein) as total_protein,
      SUM(carbs) as total_carbs,
      SUM(fat) as total_fat
    FROM meals 
    WHERE user_id = ? AND date = ?`,
    [req.user.userId, targetDate],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const summary = result[0] || {
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fat: 0
      };

      res.json({
        date: targetDate,
        ...summary
      });
    }
  );
});

// Delete a meal
app.delete('/api/meals/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    'DELETE FROM meals WHERE id = ? AND user_id = ?',
    [id, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }

      res.json({ message: 'Meal deleted successfully' });
    }
  );
});

// Chat Messages API

// Get chat messages for a user
app.get('/api/chat/messages', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.all(
    'SELECT * FROM chat_messages WHERE user_id = ? ORDER BY timestamp ASC',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to fetch chat messages' });
      }
      res.json(rows);
    }
  );
});

// Save a chat message
app.post('/api/chat/messages', authenticateToken, (req, res) => {
  const { message, sender } = req.body;
  const userId = req.user.userId;
  const messageId = 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  
  if (!message || !sender) {
    return res.status(400).json({ error: 'Message and sender are required' });
  }
  
  db.run(
    'INSERT INTO chat_messages (id, user_id, message, sender) VALUES (?, ?, ?, ?)',
    [messageId, userId, message, sender],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to save message' });
      }
      res.json({ 
        id: messageId, 
        message, 
        sender, 
        timestamp: new Date().toISOString() 
      });
    }
  );
});

// Delete all chat messages for a user (optional cleanup endpoint)
app.delete('/api/chat/messages', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  
  db.run(
    'DELETE FROM chat_messages WHERE user_id = ?',
    [userId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete messages' });
      }
      res.json({ message: 'All chat messages deleted successfully' });
    }
  );
});

// Get current day's nutrition summary for AI Coach
app.get('/api/ai/nutrition-summary', authenticateToken, (req, res) => {
  const userId = req.user.userId;
  const today = new Date().toISOString().split('T')[0];
  
  // Get user's TDEE first
  db.get(
    'SELECT height, weight, age, gender, activity_level FROM users WHERE id = ?',
    [userId],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
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
      db.all(
        'SELECT * FROM meals WHERE user_id = ? AND date = ?',
        [userId, today],
        (err, meals) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }
          
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
        }
      );
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
