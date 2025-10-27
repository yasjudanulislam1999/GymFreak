const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const OpenAI = require('openai');
const mailjet = require('node-mailjet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here'
});

// Mailjet configuration
const mailjetClient = mailjet.apiConnect(
  process.env.MAILJET_API_KEY || '',
  process.env.MAILJET_API_SECRET || ''
);

// Helper function to send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;
    
    const request = await mailjetClient
      .post('send', { version: 'v3.1' })
      .request({
        Messages: [
          {
            From: {
              Email: process.env.MAILJET_FROM_EMAIL || 'your-email@yourdomain.com',
              Name: 'GymFreak'
            },
            To: [
              {
                Email: email,
                Name: 'User'
              }
            ],
            Subject: 'Reset Your GymFreak Password',
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #00FF7F;">Reset Your Password</h2>
                <p>Hello,</p>
                <p>You requested to reset your password for your GymFreak account. Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #00FF7F; color: #0E0E0F; padding: 12px 30px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold; 
                            display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this password reset, please ignore this email.</p>
                <p>Best regards,<br>The GymFreak Team</p>
              </div>
            `,
            TextPart: `Reset your GymFreak password by clicking this link: ${resetLink}. This link will expire in 1 hour.`
          }
        ]
      });
    
    console.log('Password reset email sent successfully');
    return { success: true, messageId: request.body.Messages[0].To[0].MessageID };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for image data
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Database setup
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

let pool = null;

if (!databaseUrl) {
  console.error('No database URL found. Please set DATABASE_URL or POSTGRES_URL environment variable.');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('DATABASE') || key.includes('POSTGRES')));
  console.error('Starting server without database connection...');
  console.log('Server will start in API-only mode without database functionality');
} else {
  pool = new Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('neon') || databaseUrl.includes('postgres') ? {
      rejectUnauthorized: false
    } : false
  });

  // Test database connection
  pool.connect((err, client, release) => {
    if (err) {
      console.error('Error connecting to database:', err);
      console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      console.log('Postgres URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
    } else {
      console.log('Connected to PostgreSQL database');
      release();
    }
  });
}

// Helper function to check database connection
const checkDatabaseConnection = (res) => {
  if (!pool) {
    res.status(503).json({ error: 'Database not connected. Please set DATABASE_URL or POSTGRES_URL environment variable.' });
    return false;
  }
  return true;
};

// Initialize database tables
const initializeDatabase = async () => {
  if (!pool) {
    console.log('Skipping database initialization - no database connection');
    return;
  }
  
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

    // Password reset tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
console.log('Starting database initialization...');
initializeDatabase().then(() => {
  console.log('Database initialization completed');
}).catch((error) => {
  console.error('Database initialization failed:', error);
});

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

// Generate streaming AI Coach response
async function generateStreamingAICoachResponse(userMessage, userProfile, nutritionData, chatHistory = [], res) {
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

    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.8,
      stream: true
    });

    let fullResponse = '';
    let messageId = null;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        
        // Send the chunk to the client
        res.write(`data: ${JSON.stringify({ 
          type: 'chunk', 
          content: content,
          messageId: messageId 
        })}\n\n`);
      }
    }

    // Save the complete message to database
    try {
      const messageId = 'ai-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const result = await pool.query(
        'INSERT INTO chat_messages (id, user_id, message, sender, timestamp) VALUES ($1, $2, $3, $4, NOW()) RETURNING timestamp',
        [messageId, userProfile.id, fullResponse, 'ai']
      );
      
      // Send completion signal
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        messageId: messageId,
        fullResponse: fullResponse 
      })}\n\n`);
    } catch (dbError) {
      console.error('Database error saving AI message:', dbError);
      res.write(`data: ${JSON.stringify({ 
        type: 'complete', 
        messageId: null,
        fullResponse: fullResponse 
      })}\n\n`);
    }

    res.end();
  } catch (error) {
    console.error('OpenAI streaming coach response error:', error);
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      content: "I'm sorry, I'm having trouble responding right now. Please try again later." 
    })}\n\n`);
    res.end();
  }
}

// Extract quantity from user's food description
function extractQuantityFromDescription(description) {
  const lowerDesc = description.toLowerCase();
  
  // Patterns to match quantities at the beginning or clearly for the whole item
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*(?:gm|gram|grams?)\b/, // e.g., "300gm chicken biryani"
    /^(\d+(?:\.\d+)?)\s*g\b/,                  // e.g., "300g chicken biryani"
    /^(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms?)\b/, // e.g., "0.3kg chicken biryani"
  ];
  
  for (const pattern of patterns) {
    const match = lowerDesc.match(pattern);
    if (match) {
      let quantity = parseFloat(match[1]);
      if (pattern.source.includes('kg')) {
        quantity = quantity * 1000;
      }
      console.log(`Extracted explicit total quantity: ${quantity}g from "${description}"`);
      return quantity;
    }
  }
  
  console.log(`No explicit total quantity found at the beginning of "${description}"`);
  return null;
}

// Normalize nutritional values to ensure consistency
function normalizeNutritionValues(foodName, nutrition) {
  const lowerName = foodName.toLowerCase();
  
  // Define standard nutritional values for common foods to ensure consistency
  const standardValues = {
    'margherita pizza': { calories: 250, protein: 11, carbs: 31, fat: 10 },
    'pizza margherita': { calories: 250, protein: 11, carbs: 31, fat: 10 },
    'margherita': { calories: 250, protein: 11, carbs: 31, fat: 10 },
    'pepperoni pizza': { calories: 280, protein: 13, carbs: 30, fat: 12 },
    'cheese pizza': { calories: 240, protein: 10, carbs: 32, fat: 9 },
    'pasta': { calories: 130, protein: 5, carbs: 25, fat: 1 },
    'spaghetti': { calories: 130, protein: 5, carbs: 25, fat: 1 },
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    'white rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    'brown rice': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
    'roti': { calories: 300, protein: 8, carbs: 50, fat: 6 },
    'chicken karahi': { calories: 200, protein: 20, carbs: 5, fat: 10 },
    'biryani': { calories: 250, protein: 12, carbs: 35, fat: 8 },
    'pad thai': { calories: 150, protein: 10, carbs: 20, fat: 5 },
    'pad thai with shrimp': { calories: 150, protein: 10, carbs: 20, fat: 5 },
    'burger': { calories: 350, protein: 25, carbs: 30, fat: 15 },
    'hamburger': { calories: 350, protein: 25, carbs: 30, fat: 15 },
    'sandwich': { calories: 200, protein: 15, carbs: 25, fat: 8 },
    'salad': { calories: 50, protein: 3, carbs: 8, fat: 2 },
    'chicken salad': { calories: 120, protein: 15, carbs: 8, fat: 4 },
    'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
    'toast': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9 },
    'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81 },
    'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100 },
    'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15 },
    'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50 },
    'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50 }
  };
  
  // Find matching standard values
  for (const [key, standard] of Object.entries(standardValues)) {
    if (lowerName.includes(key)) {
      console.log(`Using standard values for: ${key}`);
      return standard;
    }
  }
  
  // If no standard values found, use the AI values but round them for consistency
  return {
    calories: Math.round(nutrition.calories / 5) * 5, // Round to nearest 5
    protein: Math.round(nutrition.protein * 2) / 2,   // Round to nearest 0.5
    carbs: Math.round(nutrition.carbs * 2) / 2,       // Round to nearest 0.5
    fat: Math.round(nutrition.fat * 2) / 2            // Round to nearest 0.5
  };
}

// AI Food Recognition using OpenAI
async function recognizeFoodWithAI(foodDescription) {
  try {
    console.log('AI Food Recognition - Input:', foodDescription);
    
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      console.log('OpenAI API key not configured - using mock recognition');
      return mockFoodRecognition(foodDescription);
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a registered nutritionist and dietitian. Your job is to turn free-text food descriptions into precise nutrition for LOGGING PURPOSES.

CRITICAL BEHAVIOUR
- Always detect MULTIPLE items (e.g., "with", "and", "+", commas) and break the meal into components.
- Normalise quantities to grams (g). If a unit like cup/plate/roti is given, convert to grams using realistic defaults.
- Adjust for cooking method and typical additions (oil, sauces, skin). If not specified, use sensible, conservative defaults and list them in assumptions.
- NEVER double-count the same ingredient across items.
- If quantity is missing, estimate a realistic quantity and mark it clearly as estimated.
- Be cuisine-aware (Indian, Chinese, Italian, Mexican, Middle Eastern, Thai, Japanese, Korean, etc.) and map items to canonical names (e.g., "roti/chapati," "jeera rice," "dal (lentil curry)").
- Output ONLY JSON. No text outside JSON.

OUTPUT SCHEMA (STRICT)
{
  "items": [
    {
      "name": "canonical food name with method (e.g., 'chicken breast, grilled, skinless')",
      "quantity_g": 100,                          // final edible weight
      "calories": 165,                            // for the specified quantity
      "protein_g": 31,
      "carbs_g": 0,
      "fat_g": 3.6,
      "confidence": 0.95,
      "assumptions": ["skinless", "no added oil"] // empty array if none
    }
  ],
  "totals": {
    "weight_g": 200,
    "calories": 330,
    "protein_g": 31,
    "carbs_g": 28,
    "fat_g": 3.6
  },
  "per_100g": {                                   // totals scaled per 100 g of the combined meal
    "calories": 165,
    "protein_g": 15.5,
    "carbs_g": 14,
    "fat_g": 1.8
  },
  "notes": [],                                     // optional clarifications for the user, keep short
  "backcompat": {                                  // for legacy fields your app expects
    "name": "combined meal",
    "calories_per_100g": 165,
    "protein_per_100g": 15.5,
    "carbs_per_100g": 14,
    "fat_per_100g": 1.8,
    "estimated_quantity": 200,
    "unit": "g",
    "confidence": 0.93                             // weighted mean of item confidences
  }
}

UNIT SELECTION RULES
- COUNTABLE ITEMS (use "piece" or "item"): eggs, chicken breasts, apples, bananas, bread slices, rotis, meat pieces, individual fruits
- WEIGHT ITEMS (use "g"): rice, pasta, vegetables, meat cuts, grains, powders, liquids

DEFAULT CONVERSIONS (use when units are given without weight; override if context implies otherwise)
- 1 roti/chapati (medium, 18 cm): 40 g, but log as "1 piece"
- 1 naan (plain): 100 g, but log as "1 piece"
- 1 cup cooked rice (US cup): 150 g (log as grams)
- 1 cup cooked pasta: 140 g (log as grams)
- 1 bowl dal (240 ml): 240 g (log as grams)
- 1 tbsp oil/ghee: 14 g (log as grams)
- 1 chicken breast, raw medium: 170 g; cooked/grilled: 120 g, but log as "1 piece"
- 1 egg (large): 50 g edible, but log as "1 piece"
- 1 tortilla (8 in): 45 g, but log as "1 piece"

COOKING-METHOD ADJUSTMENTS (apply once, list in assumptions)
- Grilled/boiled: no added oil.
- Pan-fried/stir-fried: add 1 tsp (5 g) oil per 100 g food unless specified.
- Deep-fried: add 1 tbsp (14 g) oil per 100 g unless specified.
- Curry/gravies: account for typical oil (1 tsp per 150 g) unless "no oil" stated.

QUALITY RULES
- Prefer verified averages from common databases (USDA/UK McCance & Widdowson style values).
- Keep numbers realistic and internally consistent (protein/carbs/fat → calories ≈ P*4 + C*4 + F*9).
- If the text is ambiguous (e.g., "curry" without type), choose the most common regional variant and note the assumption.
- If you cannot reasonably infer a component, exclude it and explain in notes; do not invent exotic items.

EXAMPLES

INPUT: "100 g chicken breast with 100 g rice"
OUTPUT:
{
  "items": [
    {"name":"chicken breast, grilled, skinless","quantity_g":100,"calories":165,"protein_g":31,"carbs_g":0,"fat_g":3.6,"confidence":0.97,"assumptions":["grilled","skinless","no added oil"]},
    {"name":"plain white rice, cooked","quantity_g":100,"calories":130,"protein_g":2.7,"carbs_g":28,"fat_g":0.3,"confidence":0.96,"assumptions":[]}
  ],
  "totals":{"weight_g":200,"calories":295,"protein_g":33.7,"carbs_g":28,"fat_g":3.9},
  "per_100g":{"calories":147.5,"protein_g":16.85,"carbs_g":14,"fat_g":1.95},
  "notes":[],
  "backcompat":{"name":"combined meal","calories_per_100g":147.5,"protein_per_100g":16.85,"carbs_per_100g":14,"fat_per_100g":1.95,"estimated_quantity":200,"unit":"g","confidence":0.965}
}

INPUT: "2 rotis, 1 cup dal tadka"
OUTPUT:
{
  "items": [
    {"name":"roti/chapati, medium","quantity_g":80,"calories":220,"protein_g":6,"carbs_g":44,"fat_g":3,"confidence":0.94,"assumptions":["whole-wheat"]},
    {"name":"dal tadka (lentil curry)","quantity_g":240,"calories":270,"protein_g":18,"carbs_g":36,"fat_g":6,"confidence":0.9,"assumptions":["1 tsp oil per 150 g"]}
  ],
  "totals":{"weight_g":320,"calories":490,"protein_g":24,"carbs_g":80,"fat_g":9},
  "per_100g":{"calories":153.1,"protein_g":7.5,"carbs_g":25,"fat_g":2.81},
  "notes":[],
  "backcompat":{"name":"combined meal","calories_per_100g":153.1,"protein_per_100g":7.5,"carbs_g":25,"fat_per_100g":2.81,"estimated_quantity":320,"unit":"g","confidence":0.92}
}`
        },
        {
          role: "user",
          content: `Analyze this food description and provide accurate nutritional information: "${foodDescription}"`
        }
      ],
      max_tokens: 500
    });

    const aiResponse = response.choices[0].message.content;
    console.log('AI Response for food description:', foodDescription);
    console.log('AI Response:', aiResponse);

    try {
      // Clean the response to extract JSON
      let cleanResponse = aiResponse.trim();
      if (cleanResponse.includes('```json')) {
        cleanResponse = cleanResponse.split('```json')[1].split('```')[0];
      } else if (cleanResponse.includes('```')) {
        cleanResponse = cleanResponse.split('```')[1].split('```')[0];
      }

      // Handle incomplete JSON responses
      if (cleanResponse.includes('"cal') && !cleanResponse.includes('"calories_per_100g"')) {
        console.log('Detected incomplete JSON, attempting to fix...');
        cleanResponse = cleanResponse.replace(/"cal\s*$/, '"calories_per_100g": 0');
        cleanResponse = cleanResponse.replace(/"protein_per_100g":\s*$/, '"protein_per_100g": 0');
        cleanResponse = cleanResponse.replace(/"carbs_per_100g":\s*$/, '"carbs_per_100g": 0');
        cleanResponse = cleanResponse.replace(/"fat_per_100g":\s*$/, '"fat_per_100g": 0');
        cleanResponse = cleanResponse.replace(/"estimated_quantity":\s*$/, '"estimated_quantity": 100');
        cleanResponse = cleanResponse.replace(/"unit":\s*$/, '"unit": "g"');
        cleanResponse = cleanResponse.replace(/"confidence":\s*$/, '"confidence": 0.8');
        
        // Try to close any incomplete objects
        if (cleanResponse.includes('"backcompat": {') && !cleanResponse.includes('}')) {
          cleanResponse = cleanResponse.replace(/"backcompat":\s*{\s*$/, '"backcompat": {"name": "combined meal", "calories_per_100g": 0, "protein_per_100g": 0, "carbs_per_100g": 0, "fat_per_100g": 0, "estimated_quantity": 100, "unit": "g", "confidence": 0.8}');
        }
        
        // Close any incomplete JSON
        if (!cleanResponse.endsWith('}')) {
          cleanResponse = cleanResponse.replace(/,\s*$/, '') + '}';
        }
      }

      const foodData = JSON.parse(cleanResponse);
      console.log('Parsed food data:', foodData);

      // Check if we have the new structured format with individual items
      if (foodData.items && Array.isArray(foodData.items)) {
        console.log('Using structured AI response with individual items');
        
        // Return individual components for separate logging
        const individualItems = foodData.items.map((item, index) => ({
          id: `ai-item-${Date.now()}-${index}`,
          name: item.name,
          calories_per_100g: Math.round((item.calories / item.quantity_g) * 100),
          protein_per_100g: Math.round((item.protein_g / item.quantity_g) * 100 * 10) / 10,
          carbs_per_100g: Math.round((item.carbs_g / item.quantity_g) * 100 * 10) / 10,
          fat_per_100g: Math.round((item.fat_g / item.quantity_g) * 100 * 10) / 10,
          quantity: item.quantity_g,
          unit: 'g',
          confidence: Math.round((item.confidence || 0.5) * 100),
          source: 'OpenAI Structured Recognition',
          assumptions: item.assumptions || [],
          isAIResult: true
        }));

        // Return the first item for backward compatibility, but mark it as having multiple components
        return {
          ...individualItems[0],
          hasMultipleComponents: true,
          allComponents: individualItems,
          totalWeight: foodData.totals?.weight_g || individualItems.reduce((sum, item) => sum + item.quantity, 0),
          totalCalories: foodData.totals?.calories || individualItems.reduce((sum, item) => sum + (item.calories_per_100g * item.quantity / 100), 0)
        };
      }

      // Check if we have the new structured format with backcompat (fallback)
      if (foodData.backcompat) {
        console.log('Using structured AI response with backcompat data');
        return {
          name: foodData.backcompat.name || foodDescription,
          calories: Math.round(foodData.backcompat.calories_per_100g),
          protein: Math.round(foodData.backcompat.protein_per_100g * 10) / 10,
          carbs: Math.round(foodData.backcompat.carbs_per_100g * 10) / 10,
          fat: Math.round(foodData.backcompat.fat_per_100g * 10) / 10,
          quantity: foodData.backcompat.estimated_quantity || 100,
          unit: foodData.backcompat.unit || 'g',
          confidence: Math.round((foodData.backcompat.confidence || 0.5) * 100),
          source: 'OpenAI Structured Recognition'
        };
      }

      // Fallback to old format parsing
      console.log('Using legacy AI response format');
      
      // Extract user-specified quantity from the food description
      const userQuantity = extractQuantityFromDescription(foodDescription);
      // If user specified a total quantity, use it. Otherwise, rely on AI's estimated_quantity.
      const actualQuantity = userQuantity !== null ? userQuantity : (foodData.estimated_quantity || 100);
      
      // Normalize nutritional values to ensure consistency (per 100g)
      const normalizedNutrition = normalizeNutritionValues(foodData.name || foodDescription, {
        calories: foodData.calories_per_100g || 0,
        protein: foodData.protein_per_100g || 0,
        carbs: foodData.carbs_per_100g || 0,
        fat: foodData.fat_per_100g || 0
      });

      // Scale nutritional values based on actual quantity
      const scaleFactor = actualQuantity / 100;
      const scaledNutrition = {
        calories: normalizedNutrition.calories * scaleFactor,
        protein: normalizedNutrition.protein * scaleFactor,
        carbs: normalizedNutrition.carbs * scaleFactor,
        fat: normalizedNutrition.fat * scaleFactor
      };

      console.log(`Scaling nutrition: ${actualQuantity}g (${scaleFactor}x) - Calories: ${normalizedNutrition.calories} -> ${scaledNutrition.calories}`);

      return {
        name: foodData.name || foodDescription,
        calories: Math.round(scaledNutrition.calories),
        protein: Math.round(scaledNutrition.protein * 10) / 10,
        carbs: Math.round(scaledNutrition.carbs * 10) / 10,
        fat: Math.round(scaledNutrition.fat * 10) / 10,
        quantity: actualQuantity,
        unit: foodData.unit || 'g',
        confidence: Math.round((foodData.confidence || 0.5) * 100),
        source: 'OpenAI Text Recognition'
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', aiResponse);
      return mockFoodRecognition(foodDescription);
    }

  } catch (error) {
    console.error('AI Food Recognition Error:', error.message);
    return mockFoodRecognition(foodDescription);
  }
}

// Enhanced mock food recognition for complex meals
function mockFoodRecognition(foodDescription) {
  const lowerDescription = foodDescription.toLowerCase();
  
  // Debug logs removed for production
  
  // Check for specific multi-component patterns first
  if (lowerDescription.includes('chicken') && lowerDescription.includes('rice')) {
    // Extract quantities
    const chickenMatch = lowerDescription.match(/(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)/);
    const riceMatch = lowerDescription.match(/(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(?:rice|white rice|brown rice)/);
    
    if (chickenMatch && riceMatch) {
      const chickenQuantity = parseFloat(chickenMatch[1]) * 150; // Assume 150g per chicken breast
      const riceQuantity = parseFloat(riceMatch[1]);
      
      // Calculate nutrition for chicken and rice
      
      // Calculate nutrition
      const chickenCalories = (chickenQuantity / 100) * 165; // 165 cal per 100g
      const chickenProtein = (chickenQuantity / 100) * 31;
      const chickenCarbs = (chickenQuantity / 100) * 0;
      const chickenFat = (chickenQuantity / 100) * 3.6;
      
      const riceCalories = (riceQuantity / 100) * 130; // 130 cal per 100g
      const riceProtein = (riceQuantity / 100) * 2.7;
      const riceCarbs = (riceQuantity / 100) * 28;
      const riceFat = (riceQuantity / 100) * 0.3;
      
      const totalCalories = chickenCalories + riceCalories;
      const totalProtein = chickenProtein + riceProtein;
      const totalCarbs = chickenCarbs + riceCarbs;
      const totalFat = chickenFat + riceFat;
      const totalWeight = chickenQuantity + riceQuantity;
      
      // Return combined nutrition
      
      return {
        name: foodDescription,
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
        quantity: Math.round(totalWeight),
        unit: 'g',
        confidence: 'high',
        source: 'mock-multi-component'
      };
    }
  }
  
  // Fallback to simple recognition for single items
  
  // Enhanced food database with per 100g values
  const foodDatabase = {
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    'white rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    'brown rice': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9 },
    'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
    'salmon': { calories: 208, protein: 25, carbs: 0, fat: 12 },
    'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
    'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
    'cheese': { calories: 113, protein: 7, carbs: 1, fat: 9 },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
    'quinoa': { calories: 120, protein: 4.4, carbs: 22, fat: 1.9 },
    'oats': { calories: 389, protein: 17, carbs: 66, fat: 7 },
    'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50 },
    'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50 },
    'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15 },
    'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100 }
  };
  
  // Fallback to simple recognition
  return simpleFoodRecognition(foodDescription, foodDatabase);
}

// Parse meal description to extract individual components
function parseMealDescription(description) {
  const components = [];
  const lowerDesc = description.toLowerCase();
  
  console.log('Parsing meal description:', description);
  console.log('Lowercase description:', lowerDesc);
  
  // Common patterns for parsing meal descriptions
  const patterns = [
    // Pattern: "1 chicken breast with 100g rice"
    /(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)\s*(?:with|and)\s*(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(rice|white rice|brown rice)/,
    // Pattern: "100g rice with 1 chicken breast"
    /(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(rice|white rice|brown rice)\s*(?:with|and)\s*(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)/,
    // Pattern: "2 eggs with 50g bread"
    /(\d+(?:\.\d+)?)\s*(?:eggs?)\s*(?:with|and)\s*(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(bread)/,
    // Pattern: "1 chicken breast and 100g rice"
    /(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)\s*(?:and)\s*(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(rice|white rice|brown rice)/,
    // Pattern: "100g rice and 1 chicken breast"
    /(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(rice|white rice|brown rice)\s*(?:and)\s*(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)/
  ];
  
  // Test the first pattern manually
  const testPattern = /(\d+(?:\.\d+)?)\s*(?:chicken breast|chicken)\s*(?:with|and)\s*(\d+(?:\.\d+)?)\s*(?:g|gram|grams)?\s*(?:of\s*)?(rice|white rice|brown rice)/;
  const testMatch = lowerDesc.match(testPattern);
  console.log('Test pattern:', testPattern.source);
  console.log('Test match:', testMatch);
  
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const match = lowerDesc.match(pattern);
    console.log(`Testing pattern ${i}:`, pattern.source);
    console.log('Match result:', match);
    
    if (match) {
      console.log('Pattern matched! Processing...');
      if (pattern.source.includes('chicken breast|chicken.*with.*rice')) {
        // "1 chicken breast with 100g rice"
        components.push({
          name: 'chicken breast',
          quantity: parseFloat(match[1]) * 150 // Assume 150g per chicken breast
        });
        components.push({
          name: match[3] || 'rice',
          quantity: parseFloat(match[2])
        });
      } else if (pattern.source.includes('rice.*with.*chicken')) {
        // "100g rice with 1 chicken breast"
        components.push({
          name: match[2] || 'rice',
          quantity: parseFloat(match[1])
        });
        components.push({
          name: 'chicken breast',
          quantity: parseFloat(match[3]) * 150 // Assume 150g per chicken breast
        });
      } else if (pattern.source.includes('eggs.*with.*bread')) {
        // "2 eggs with 50g bread"
        components.push({
          name: 'egg',
          quantity: parseFloat(match[1]) * 50 // Assume 50g per egg
        });
        components.push({
          name: match[3] || 'bread',
          quantity: parseFloat(match[2])
        });
      } else if (pattern.source.includes('chicken.*and.*rice')) {
        // "1 chicken breast and 100g rice"
        components.push({
          name: 'chicken breast',
          quantity: parseFloat(match[1]) * 150
        });
        components.push({
          name: match[3] || 'rice',
          quantity: parseFloat(match[2])
        });
      } else if (pattern.source.includes('rice.*and.*chicken')) {
        // "100g rice and 1 chicken breast"
        components.push({
          name: match[2] || 'rice',
          quantity: parseFloat(match[1])
        });
        components.push({
          name: 'chicken breast',
          quantity: parseFloat(match[3]) * 150
        });
      }
      break; // Use first matching pattern
    }
  }
  
  return components;
}

// Simple food recognition for single items
function simpleFoodRecognition(foodDescription, foodDatabase) {
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
  const simpleFoodDatabase = {
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
  for (const [key, nutrition] of Object.entries(simpleFoodDatabase)) {
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
    if (!checkDatabaseConnection(res)) return;
    
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
    if (!checkDatabaseConnection(res)) return;
    
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

// Forgot password - generate reset token
app.post('/api/forgot-password', async (req, res) => {
  try {
    if (!checkDatabaseConnection(res)) return;
    
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return res.status(200).json({ 
        message: 'If that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token
    await pool.query(`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
    `, [uuidv4(), user.id, resetToken, expiresAt]);

    // Send password reset email using Mailjet
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      console.log('Password reset email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success to user for security (don't reveal email failure)
    }

    res.status(200).json({ 
      message: 'If that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Verify reset token
app.get('/api/verify-reset-token/:token', async (req, res) => {
  try {
    if (!checkDatabaseConnection(res)) return;
    
    const { token } = req.params;

    const result = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({ error: 'Failed to verify reset token' });
  }
});

// Reset password
app.post('/api/reset-password', async (req, res) => {
  try {
    if (!checkDatabaseConnection(res)) return;
    
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if token is valid
    const tokenResult = await pool.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const resetToken = tokenResult.rows[0];
    const userId = resetToken.user_id;

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    // Mark token as used
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [resetToken.id]);

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
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

// Generate AI Coach Response with Streaming
app.post('/api/ai/coach-response-stream', authenticateToken, async (req, res) => {
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

    // Set up Server-Sent Events headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Generate streaming AI response
    await generateStreamingAICoachResponse(message, userProfile, nutritionData, chatHistory, res);

  } catch (error) {
    console.error('AI Coach streaming response error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate AI response' })}\n\n`);
    res.end();
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
      
      // Return a mock response for testing with new format
      const mockFoods = [
        { name: 'Grilled Chicken Breast', calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6, quantity: 150, unit: 'g', confidence: 85 },
        { name: 'White Rice', calories_per_100g: 130, protein_per_100g: 2.7, carbs_per_100g: 28, fat_per_100g: 0.3, quantity: 100, unit: 'g', confidence: 90 },
        { name: 'Apple', calories_per_100g: 52, protein_per_100g: 0.3, carbs_per_100g: 14, fat_per_100g: 0.2, quantity: 1, unit: 'piece', confidence: 95 },
        { name: 'Banana', calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3, quantity: 1, unit: 'piece', confidence: 92 },
        { name: 'Bread Slice', calories_per_100g: 80, protein_per_100g: 3, carbs_per_100g: 15, fat_per_100g: 1, quantity: 1, unit: 'slice', confidence: 88 }
      ];
      
      const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)];
      
      return res.json({
        foods: [{
          id: `mock-${Date.now()}`,
          ...randomFood,
          source: 'Mock AI Recognition (API Key Not Configured)',
          isAIResult: true
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
              text: `You are a registered nutritionist and dietitian analyzing food images. Your job is to identify ALL food items visible and provide accurate nutritional information.

CRITICAL BEHAVIOUR
- Always detect MULTIPLE items visible in the image
- Normalise quantities to grams (g) with realistic estimates
- Adjust for cooking method and typical additions (oil, sauces, skin)
- Be cuisine-aware and map items to canonical names
- Output ONLY JSON. No text outside JSON.

OUTPUT SCHEMA (STRICT)
{
  "foods": [
    {
      "name": "canonical food name with method (e.g., 'fried eggs', 'grilled chicken breast')",
      "calories_per_100g": 150,
      "protein_per_100g": 10,
      "carbs_per_100g": 15,
      "fat_per_100g": 5,
      "estimated_quantity": 150,
      "unit": "g",
      "confidence": 0.9
    }
  ]
}

UNIT SELECTION RULES
- COUNTABLE ITEMS (use "piece" or "item"): eggs, chicken breasts, apples, bananas, bread slices, rotis, meat pieces, individual fruits
- WEIGHT ITEMS (use "g"): rice, pasta, vegetables, meat cuts, grains, powders, liquids

DEFAULT CONVERSIONS
- 1 egg (large): 50g, but log as "1 piece"
- 1 chicken breast (medium): 120g, but log as "1 piece" 
- 1 cup cooked rice: 150g (log as grams)
- 1 slice bread: 30g, but log as "1 piece"
- 1 apple (medium): 150g, but log as "1 piece"
- 1 banana (medium): 120g, but log as "1 piece"
- 1 roti/chapati: 40g, but log as "1 piece"
- Rice, pasta, vegetables: always log in grams

COOKING-METHOD ADJUSTMENTS
- Fried: add 1 tbsp (14g) oil per 100g food
- Grilled/boiled: no added oil
- Scrambled eggs: add 1 tsp (5g) butter/oil

QUALITY RULES
- Keep numbers realistic and internally consistent
- If you cannot identify a component clearly, estimate conservatively
- Provide confidence scores based on clarity of identification

Return ONLY the JSON object with the foods array.`
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
      max_tokens: 500
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
        foods = foodData.foods.map((food, index) => ({
          id: `ai-vision-${Date.now()}-${index}`,
          name: food.name || 'Unknown Food',
          calories_per_100g: Math.round(food.calories_per_100g || 0),
          protein_per_100g: Math.round((food.protein_per_100g || 0) * 10) / 10,
          carbs_per_100g: Math.round((food.carbs_per_100g || 0) * 10) / 10,
          fat_per_100g: Math.round((food.fat_per_100g || 0) * 10) / 10,
          quantity: food.estimated_quantity || 100,
          unit: food.unit || 'g',
          confidence: Math.round((food.confidence || 0.5) * 100),
          source: 'AI Vision Recognition',
          isAIResult: true
        }));
      } else {
        // Single food format (fallback)
        foods = [{
          id: `ai-vision-${Date.now()}-0`,
          name: foodData.name || 'Unknown Food',
          calories_per_100g: Math.round(foodData.calories_per_100g || 0),
          protein_per_100g: Math.round((foodData.protein_per_100g || 0) * 10) / 10,
          carbs_per_100g: Math.round((foodData.carbs_per_100g || 0) * 10) / 10,
          fat_per_100g: Math.round((foodData.fat_per_100g || 0) * 10) / 10,
          quantity: foodData.estimated_quantity || 100,
          unit: foodData.unit || 'g',
          confidence: Math.round((foodData.confidence || 0.5) * 100),
          source: 'AI Vision Recognition (Fallback)',
          isAIResult: true
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
      
      // Fallback response with new format
      res.json({
        foods: [{
          id: `fallback-${Date.now()}`,
          name: foodName,
          calories_per_100g: 150,
          protein_per_100g: 10,
          carbs_per_100g: 20,
          fat_per_100g: 5,
          quantity: 100,
          unit: 'g',
          confidence: 50,
          source: 'AI Vision Recognition (Fallback)',
          isAIResult: true
        }]
      });
    }

  } catch (error) {
    console.error('AI image recognition error:', error);
    res.status(500).json({ error: 'Failed to recognize food image' });
  }
});

// Root endpoint - must be before static file serving
app.get('/', (req, res) => {
  console.log('✅ Root endpoint hit - server is responding');
  console.log('✅ Request headers:', req.headers);
  console.log('✅ Request method:', req.method);
  console.log('✅ Request URL:', req.url);
  
  res.json({ 
    message: 'GymFreak API Server is running!',
    timestamp: new Date().toISOString(),
    status: 'OK',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    database: pool ? 'Connected' : 'Not connected',
    staticFiles: staticPath ? 'Found' : 'Not found',
    serverUptime: process.uptime()
  });
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  console.log('Health check endpoint hit');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: pool ? 'Connected' : 'Not connected',
    databaseUrl: databaseUrl ? 'Configured' : 'Not configured',
    environment: {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      POSTGRES_URL: process.env.POSTGRES_URL ? 'Set' : 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: PORT
    }
  });
});

// Serve static files from React build (try multiple possible locations)
const staticPaths = [
  path.join(__dirname, '../client/build'),
  path.join(__dirname, './client/build'),
  path.join(__dirname, 'client/build'),
  path.join(process.cwd(), 'client/build'),
  path.join(process.cwd(), 'build')
];

let staticPath = null;
console.log('Checking for static files...');
for (const staticPathOption of staticPaths) {
  console.log(`Checking path: ${staticPathOption}`);
  if (fs.existsSync(staticPathOption)) {
    staticPath = staticPathOption;
    console.log(`Found static files at: ${staticPathOption}`);
    break;
  } else {
    console.log(`Path does not exist: ${staticPathOption}`);
  }
}

if (staticPath) {
  app.use(express.static(staticPath));
  console.log(`Serving static files from: ${staticPath}`);
} else {
  console.log('Static files not found, serving API only');
  console.log('Checked paths:', staticPaths);
}

// Handle React routing, return all requests to React app (only if static files exist)
if (staticPath) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

console.log('Starting server...');
console.log('Port:', PORT);
console.log('Database URL available:', !!databaseUrl);
console.log('Pool initialized:', !!pool);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log('Environment variables:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  console.log('- POSTGRES_URL:', process.env.POSTGRES_URL ? 'Set' : 'Not set');
  console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'Set' : 'Not set');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
  console.log('✅ Server is ready to accept connections!');
  console.log('✅ Health check endpoint available at: /');
  console.log('✅ API health check available at: /api/health');
}).on('error', (err) => {
  console.error('❌ Server startup error:', err);
  console.error('❌ Error details:', err.message);
  console.error('❌ Error code:', err.code);
  process.exit(1);
});
