import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Bot, User, MessageCircle, Target, TrendingUp } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AICoach: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [nutritionData, setNutritionData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history and nutrition data when component mounts
    loadChatHistory();
    loadNutritionData();
  }, [user?.id]);

  const loadNutritionData = async () => {
    try {
      const response = await axios.get('/api/ai/nutrition-summary');
      setNutritionData(response.data);
    } catch (error) {
      console.error('Failed to load nutrition data:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await axios.get('/api/chat/messages');
      const savedMessages = response.data.map((msg: any) => ({
        id: msg.id,
        text: msg.message,
        sender: msg.sender,
        timestamp: new Date(msg.timestamp)
      }));
      
      // If no saved messages, add welcome message
      if (savedMessages.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome',
          text: `Hi ${user?.name || 'there'}! I'm your AI Diet Coach. I can help you with nutrition advice, meal planning, and reaching your fitness goals. What would you like to know?`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        // Save the welcome message
        saveMessage(welcomeMessage);
      } else {
        setMessages(savedMessages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      // Fallback to welcome message if loading fails
      const welcomeMessage: Message = {
        id: 'welcome',
        text: `Hi ${user?.name || 'there'}! I'm your AI Diet Coach. I can help you with nutrition advice, meal planning, and reaching your fitness goals. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  };

  const saveMessage = async (message: Message) => {
    try {
      await axios.post('/api/chat/messages', {
        message: message.text,
        sender: message.sender
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const clearChat = async () => {
    if (window.confirm('Are you sure you want to clear all chat messages? This action cannot be undone.')) {
      try {
        await axios.delete('/api/chat/messages');
        setMessages([]);
        // Add new welcome message
        const welcomeMessage: Message = {
          id: 'welcome',
          text: `Hi ${user?.name || 'there'}! I'm your AI Diet Coach. I can help you with nutrition advice, meal planning, and reaching your fitness goals. What would you like to know?`,
          sender: 'ai',
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
        saveMessage(welcomeMessage);
      } catch (error) {
        console.error('Failed to clear chat:', error);
      }
    }
  };

  const generateAIResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Get user context
    const tdee = nutritionData?.tdee || 0;
    const consumedCalories = nutritionData?.consumed?.calories || 0;
    const remainingCalories = nutritionData?.remaining?.calories || 0;
    const consumedProtein = nutritionData?.consumed?.protein || 0;
    const remainingProtein = nutritionData?.remaining?.protein || 0;
    const progressCalories = nutritionData?.progress?.calories || 0;
    
    const userName = user?.name || 'there';
    const userWeight = user?.weight || 0;
    const userHeight = user?.height || 0;
    const userAge = user?.age || 0;
    const userGender = user?.gender || '';
    const userActivity = user?.activityLevel || '';

    // Specific food recommendations
    if (message.includes('bolognese') || message.includes('pasta')) {
      if (tdee > 0) {
        const pastaCalories = 200; // per serving
        const newRemaining = remainingCalories - pastaCalories;
        return `Bolognese pasta can fit into your diet! A typical serving has about ${pastaCalories} calories.\n\n**Your current balance:**\n• Consumed today: ${consumedCalories} calories (${progressCalories}% of goal)\n• Remaining: ${remainingCalories} calories\n• After pasta: ${newRemaining} calories remaining\n\n**Tips for a healthier version:**\n• Use whole wheat pasta for more fiber\n• Add extra vegetables (carrots, celery, mushrooms)\n• Use lean ground turkey instead of beef\n• Control portion size (1 cup cooked pasta)\n• Pair with a side salad for more nutrients\n\nWould you like me to suggest a complete meal plan for today?`;
      }
      return `Bolognese pasta can be part of a balanced diet! A typical serving has about 200 calories. For a healthier version, use whole wheat pasta, add extra vegetables, and control your portion size. Pair it with a side salad for more nutrients!`;
    }

    if (message.includes('chicken burger') || message.includes('burger')) {
      if (tdee > 0) {
        const burgerCalories = 350; // typical chicken burger
        const newRemaining = remainingCalories - burgerCalories;
        return `A chicken burger can definitely fit into your diet! A typical chicken burger has about ${burgerCalories} calories.\n\n**Your current balance:**\n• Consumed today: ${consumedCalories} calories (${progressCalories}% of goal)\n• Remaining: ${remainingCalories} calories\n• After burger: ${newRemaining} calories remaining\n\n**To make it healthier:**\n• Choose grilled chicken over fried\n• Skip the mayo, use mustard or avocado\n• Add extra vegetables (lettuce, tomato, onion)\n• Use whole grain bun if available\n• Skip the fries, have a side salad instead\n\n**Your protein needs:** ${userWeight ? Math.round(userWeight * 1.6) : '1.6-2.2g per kg'} grams daily - this burger provides about 25-30g!`;
      }
      return `A chicken burger can be a good choice! It typically has about 350 calories and provides good protein. To make it healthier, choose grilled over fried, skip the mayo, add extra vegetables, and pair with a side salad instead of fries.`;
    }

    if (message.includes('pizza')) {
      if (tdee > 0) {
        const pizzaCalories = 300; // per slice
        const newRemaining = remainingCalories - pizzaCalories;
        return `Pizza can fit into your diet in moderation! One slice typically has about ${pizzaCalories} calories.\n\n**Your current balance:**\n• Consumed today: ${consumedCalories} calories (${progressCalories}% of goal)\n• Remaining: ${remainingCalories} calories\n• After pizza: ${newRemaining} calories remaining\n\n**Healthier pizza tips:**\n• Choose thin crust over thick\n• Load up on vegetables as toppings\n• Go for lean proteins (chicken, turkey)\n• Limit cheese and high-fat meats\n• Have a side salad with it\n• Stick to 1-2 slices maximum\n\n**Better alternatives:** Try making a cauliflower crust pizza or a Greek yogurt-based crust!`;
      }
      return `Pizza can be enjoyed in moderation! One slice typically has about 300 calories. For a healthier version, choose thin crust, load up on vegetables, use lean proteins, and limit high-fat toppings. Consider cauliflower crust as an alternative!`;
    }

    if (message.includes('rice') || message.includes('fried rice')) {
      if (tdee > 0) {
        const riceCalories = 150; // per cup cooked
        const newRemaining = remainingCalories - riceCalories;
        return `Rice is a great carbohydrate source! One cup of cooked rice has about ${riceCalories} calories.\n\n**Your current balance:**\n• Consumed today: ${consumedCalories} calories (${progressCalories}% of goal)\n• Remaining: ${remainingCalories} calories\n• After rice: ${newRemaining} calories remaining\n\n**Rice recommendations:**\n• Choose brown rice over white for more fiber\n• Control portion size (1 cup = 1 serving)\n• Pair with lean protein and vegetables\n• For fried rice, use minimal oil and add lots of vegetables\n• Consider quinoa as a higher-protein alternative\n\n**Your carb needs:** About 45-65% of your daily calories should come from carbs. That's roughly ${Math.round(tdee * 0.5 / 4)} grams for you!`;
      }
      return `Rice is an excellent carbohydrate source! One cup of cooked rice has about 150 calories. Choose brown rice over white for more fiber, control your portion size, and pair it with lean protein and vegetables for a balanced meal.`;
    }

    // Greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `Hello ${userName}! I'm your AI Diet Coach. I can help you with personalized nutrition advice based on your profile. What would you like to know about your diet or specific foods?`;
    }

    // Calorie-related queries
    if (message.includes('calorie') || message.includes('calories')) {
      if (tdee > 0) {
        return `Based on your profile (${userHeight}cm, ${userWeight}kg, ${userAge} years, ${userGender}, ${userActivity.replace('_', ' ')} activity), your daily calorie target is **${tdee} calories**.\n\n**Your current balance:**\n• Consumed today: **${consumedCalories} calories** (${progressCalories}% of goal)\n• Remaining: **${remainingCalories} calories**\n• Protein consumed: ${consumedProtein}g / ${Math.round(userWeight * 1.6)}g\n\n**Recommended breakdown:**\n• Breakfast: ${Math.round(tdee * 0.25)} calories\n• Lunch: ${Math.round(tdee * 0.35)} calories\n• Dinner: ${Math.round(tdee * 0.30)} calories\n• Snacks: ${Math.round(tdee * 0.10)} calories\n\nWould you like me to suggest specific meal ideas to reach your remaining target?`;
      }
      return `I'd be happy to help with calorie information! To give you personalized advice, please complete your profile with your height, weight, age, gender, and activity level.`;
    }

    // Weight loss queries
    if (message.includes('lose weight') || message.includes('weight loss') || message.includes('lose fat')) {
      if (tdee > 0) {
        const deficit = Math.round(tdee * 0.2); // 20% deficit
        const targetCalories = tdee - deficit;
        const proteinNeeds = Math.round(userWeight * 1.6);
        return `For healthy weight loss, I recommend a **${deficit} calorie deficit** per day (20% below your TDEE of ${tdee}).\n\n**Your daily targets:**\n• Calories: ${targetCalories}\n• Protein: ${proteinNeeds}g (crucial for preserving muscle)\n• Carbs: ${Math.round(targetCalories * 0.45 / 4)}g\n• Fat: ${Math.round(targetCalories * 0.25 / 9)}g\n\n**Key strategies:**\n• Focus on whole foods and lean proteins\n• Eat plenty of vegetables (aim for 5+ servings)\n• Stay hydrated (2-3 liters daily)\n• Include strength training to preserve muscle\n• Be patient - aim for 0.5-1kg loss per week`;
      }
      return `Weight loss requires a sustainable calorie deficit. I can give you specific recommendations once your profile is complete. Focus on whole foods, lean proteins, and regular exercise!`;
    }

    // Muscle gain queries
    if (message.includes('muscle') || message.includes('gain weight') || message.includes('bulk')) {
      if (tdee > 0) {
        const surplus = Math.round(tdee * 0.1); // 10% surplus
        const targetCalories = tdee + surplus;
        const proteinNeeds = Math.round(userWeight * 2.2);
        return `For muscle gain, aim for a **${surplus} calorie surplus** above your TDEE of ${tdee}.\n\n**Your daily targets:**\n• Calories: ${targetCalories}\n• Protein: ${proteinNeeds}g (2.2g per kg body weight)\n• Carbs: ${Math.round(targetCalories * 0.5 / 4)}g (for energy and recovery)\n• Fat: ${Math.round(targetCalories * 0.25 / 9)}g\n\n**Key strategies:**\n• Prioritize protein at every meal\n• Eat within 2 hours post-workout\n• Include compound exercises (squats, deadlifts, bench press)\n• Get 7-9 hours of sleep for recovery\n• Be consistent with your training and nutrition`;
      }
      return `Muscle gain requires a calorie surplus and adequate protein. I can provide specific recommendations once your profile is complete. Focus on protein-rich foods and progressive strength training!`;
    }

    // Protein queries
    if (message.includes('protein')) {
      const proteinNeeds = userWeight ? Math.round(userWeight * 1.6) : '1.6-2.2g per kg';
      const proteinCalories = userWeight ? Math.round(userWeight * 1.6 * 4) : 0;
      return `Protein is crucial for muscle repair and growth! Based on your weight of ${userWeight}kg, aim for **${proteinNeeds} grams daily** (${proteinCalories} calories).\n\n**Best protein sources:**\n• Chicken breast: 31g per 100g\n• Fish: 25g per 100g\n• Eggs: 6g per large egg\n• Greek yogurt: 20g per cup\n• Legumes: 15g per cup\n• Protein powder: 25g per scoop\n\n**Timing tips:**\n• Spread protein throughout the day\n• Have protein within 2 hours post-workout\n• Include protein in every meal and snack`;
    }

    // Meal planning queries
    if (message.includes('meal') || message.includes('plan') || message.includes('what should i eat')) {
      if (tdee > 0) {
        const breakfastCal = Math.round(tdee * 0.25);
        const lunchCal = Math.round(tdee * 0.35);
        const dinnerCal = Math.round(tdee * 0.30);
        const snackCal = Math.round(tdee * 0.10);
        return `Here's a personalized meal plan for your ${tdee} calorie target:\n\n**Breakfast (${breakfastCal} cal):**\n• Oatmeal with berries and nuts\n• Greek yogurt with granola\n• Scrambled eggs with whole grain toast\n\n**Lunch (${lunchCal} cal):**\n• Grilled chicken salad with quinoa\n• Turkey and avocado wrap\n• Salmon with sweet potato and vegetables\n\n**Dinner (${dinnerCal} cal):**\n• Lean protein with brown rice and vegetables\n• Stir-fry with tofu and mixed vegetables\n• Baked fish with roasted vegetables\n\n**Snacks (${snackCal} cal):**\n• Apple with almond butter\n• Greek yogurt with honey\n• Mixed nuts and dried fruit`;
      }
      return `For effective meal planning, I recommend 3 main meals + 1-2 snacks, including protein, carbs, and healthy fats in each meal. Complete your profile for personalized meal suggestions!`;
    }

    // Hydration queries
    if (message.includes('water') || message.includes('hydrat') || message.includes('drink')) {
      const waterNeeds = userWeight ? Math.round(userWeight * 35) : 2500; // ml per day
      return `Staying hydrated is essential! Based on your weight of ${userWeight}kg, aim for **${waterNeeds}ml (${Math.round(waterNeeds/1000)} liters)** daily.\n\n**Hydration tips:**\n• Drink water before meals (helps with portion control)\n• Keep a water bottle with you at all times\n• Add lemon, cucumber, or mint for flavor\n• Monitor urine color (pale yellow = well hydrated)\n• Increase intake during workouts\n• Get hydration from fruits and vegetables too!`;
    }

    // Exercise and nutrition timing
    if (message.includes('workout') || message.includes('exercise') || message.includes('before') || message.includes('after')) {
      if (tdee > 0) {
        const preWorkoutCal = Math.round(tdee * 0.1);
        const postWorkoutCal = Math.round(tdee * 0.15);
        return `Nutrition timing around workouts is crucial for your goals!\n\n**Pre-workout (${preWorkoutCal} calories, 1-2 hours before):**\n• Banana with almond butter\n• Oatmeal with berries\n• Greek yogurt with granola\n• Focus on carbs for energy\n\n**Post-workout (${postWorkoutCal} calories, within 2 hours):**\n• Protein shake with fruit\n• Chicken with rice and vegetables\n• Greek yogurt with honey\n• Focus on protein + carbs for recovery\n\n**During workout:**\n• Water for sessions under 1 hour\n• Electrolyte drink for longer sessions`;
      }
      return `Nutrition timing around workouts is important! Eat carbs 1-2 hours before for energy, and protein + carbs within 2 hours after for recovery. Stay hydrated throughout your workout!`;
    }

    // General nutrition advice
    if (message.includes('healthy') || message.includes('nutrit') || message.includes('diet')) {
      if (tdee > 0) {
        return `Here's your personalized nutrition guide for ${tdee} calories daily:\n\n**Macro breakdown:**\n• Protein: ${Math.round(userWeight * 1.6)}g (${Math.round(userWeight * 1.6 * 4)} cal)\n• Carbs: ${Math.round(tdee * 0.45 / 4)}g (${Math.round(tdee * 0.45)} cal)\n• Fat: ${Math.round(tdee * 0.25 / 9)}g (${Math.round(tdee * 0.25)} cal)\n\n**Food priorities:**\n• Lean proteins (chicken, fish, eggs, legumes)\n• Complex carbs (oats, quinoa, sweet potatoes)\n• Healthy fats (avocado, nuts, olive oil)\n• 5+ servings of vegetables daily\n• 2-3 servings of fruit daily\n• Limit processed foods and added sugars`;
      }
      return `A balanced diet includes lean proteins, complex carbohydrates, healthy fats, plenty of vegetables and fruits, and adequate hydration. Complete your profile for personalized macro targets!`;
    }

    // Motivation and encouragement
    if (message.includes('motivat') || message.includes('encourag') || message.includes('struggl') || message.includes('difficult')) {
      return `I understand that staying consistent can be challenging! Remember:\n\n• Progress takes time - be patient with yourself\n• Small, consistent changes lead to big results\n• Every healthy choice counts\n• It's okay to have setbacks - just get back on track\n• You're stronger than you think!\n\n**Your current stats:** ${userHeight}cm, ${userWeight}kg, ${userAge} years - you're already taking steps to improve your health! What specific challenge are you facing? I'm here to help!`;
    }

    // Default response with personalized context
    if (tdee > 0) {
      return `I'm here to help with your nutrition and fitness goals! Based on your profile, your daily calorie target is ${tdee} calories. I can assist with meal planning, specific food recommendations, macro targets, and personalized advice. What specific question do you have about your diet?`;
    }
    
    return `I'm here to help with your nutrition and fitness goals! I can assist with meal planning, calorie targets, protein needs, weight management, and general nutrition advice. Complete your profile for personalized recommendations!`;
  };

  const calculateTDEE = (height: number, weight: number, age: number, gender: string, activityLevel: string): number => {
    let bmr;
    if (gender.toLowerCase() === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    const activityMultipliers = {
      'sedentary': 1.2,
      'light': 1.375,
      'moderate': 1.55,
      'active': 1.725,
      'very_active': 1.9
    };

    return Math.round(bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    saveMessage(userMessage); // Save user message
    setInputText('');
    setIsTyping(true);

    try {
      // Call OpenAI-powered AI Coach endpoint
      const response = await axios.post('/api/ai/coach-response', {
        message: inputText
      });

      const aiResponse = response.data.response;
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      saveMessage(aiMessage); // Save AI response
    } catch (error) {
      console.error('Failed to get AI response:', error);
      // Fallback to rule-based response if OpenAI fails
      const fallbackResponse = generateAIResponse(inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      saveMessage(aiMessage);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div style={{ 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <h1 className="text-center mb-6" style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 'bold' }}>
        AI Diet Coach
      </h1>
      
      {/* User Profile Summary */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <h3 className="mb-4" style={{ color: '#ffffff', fontSize: '1.5rem' }}>
          <Target size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#4ade80' }} />
          Your Profile Summary
        </h3>
        <div className="grid grid-2" style={{ gap: '16px' }}>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Name:</strong> {user?.name || 'Not set'}
          </div>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Height:</strong> {user?.height ? `${user.height} cm` : 'Not set'}
          </div>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Weight:</strong> {user?.weight ? `${user.weight} kg` : 'Not set'}
          </div>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Age:</strong> {user?.age ? `${user.age} years` : 'Not set'}
          </div>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Gender:</strong> {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'}
          </div>
          <div style={{ color: '#f8fafc', fontSize: '14px' }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>Activity Level:</strong> {user?.activityLevel ? user.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}
          </div>
        </div>
        {(!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) && (
          <div className="mt-4 p-3" style={{ 
            background: 'rgba(255, 193, 7, 0.2)', 
            borderRadius: '8px', 
            border: '1px solid rgba(255, 193, 7, 0.3)',
            color: '#fbbf24'
          }}>
            <strong>Note:</strong> Complete your profile for personalized advice!
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <MessageCircle size={24} style={{ marginRight: '8px', color: '#4ade80' }} />
            <h3 style={{ color: '#ffffff', fontSize: '1.5rem' }}>Chat with AI Coach</h3>
          </div>
          <button
            onClick={clearChat}
            style={{ 
              fontSize: '12px', 
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.8)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 1)'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(239, 68, 68, 0.8)'}
          >
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div 
          style={{ 
            height: '500px', 
            overflowY: 'auto', 
            borderRadius: '12px', 
            padding: '20px',
            marginBottom: '20px',
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            position: 'relative'
          }}
        >
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            pointerEvents: 'none'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{ 
                  display: 'flex', 
                  marginBottom: '16px', 
                  width: '100%',
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{ 
                    display: 'flex', 
                    alignItems: 'flex-end', 
                    maxWidth: '300px',
                    width: 'fit-content',
                    flexDirection: message.sender === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: message.sender === 'user' ? '#4ade80' : '#6b7280',
                      color: '#ffffff',
                      marginLeft: message.sender === 'user' ? '8px' : '0px',
                      marginRight: message.sender === 'user' ? '0px' : '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      fontSize: '12px'
                    }}
                  >
                    {message.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  
                  {/* Message Bubble */}
                  <div
                    style={{
                      padding: '12px 16px',
                      backgroundColor: message.sender === 'user' ? '#4ade80' : '#ffffff',
                      color: message.sender === 'user' ? '#ffffff' : '#1f2937',
                      maxWidth: '250px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                      borderRadius: message.sender === 'user' 
                        ? '18px 18px 4px 18px' 
                        : '18px 18px 18px 4px',
                      position: 'relative',
                      wordWrap: 'break-word',
                      transition: 'all 0.2s ease-out'
                    }}
                  >
                    {/* Message Text */}
                    <div className="text-sm whitespace-pre-line" style={{ 
                      lineHeight: '1.3',
                      color: message.sender === 'user' ? '#ffffff' : '#1f2937',
                      fontWeight: '400'
                    }}>
                      {message.text}
                    </div>
                    
                    {/* Timestamp */}
                    <div style={{ 
                      textAlign: message.sender === 'user' ? 'right' : 'left',
                      fontSize: '10px',
                      color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : 'rgba(107, 114, 128, 0.8)',
                      marginTop: '4px'
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', width: 'fit-content' }}>
                  {/* AI Avatar */}
                  <div style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: '#6b7280',
                    color: '#ffffff',
                    marginRight: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                    fontSize: '12px'
                  }}>
                    <Bot size={14} />
                  </div>
                  
                  {/* Typing Bubble */}
                  <div style={{
                    backgroundColor: '#ffffff',
                    padding: '12px 16px',
                    borderRadius: '18px 18px 18px 4px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                    maxWidth: '120px'
                  }}>
                    <div className="flex items-center">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about nutrition, meal planning, or your fitness goals..."
            disabled={isTyping}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '25px',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '14px',
              outline: 'none',
              backdropFilter: 'blur(10px)',
              fontWeight: '400'
            }}
            onFocus={(e) => (e.target as HTMLInputElement).style.border = '1px solid #4ade80'}
            onBlur={(e) => (e.target as HTMLInputElement).style.border = '1px solid rgba(255, 255, 255, 0.2)'}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            style={{
              padding: '12px',
              borderRadius: '50%',
              border: 'none',
              background: inputText.trim() && !isTyping ? '#4ade80' : 'rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Quick Tips */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '24px',
        marginTop: '24px',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <h3 className="mb-4" style={{ color: '#ffffff', fontSize: '1.5rem' }}>
          <TrendingUp size={24} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#4ade80' }} />
          Quick Tips
        </h3>
        <div className="grid grid-2" style={{ gap: '16px' }}>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(59, 130, 246, 0.2)', 
            borderRadius: '12px',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: '#f8fafc',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#60a5fa', fontWeight: '600' }}>💡 Try asking:</strong> "What should I eat before a workout?"
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(34, 197, 94, 0.2)', 
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: '#f8fafc',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#4ade80', fontWeight: '600' }}>🍎 Nutrition:</strong> "How much protein do I need daily?"
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(168, 85, 247, 0.2)', 
            borderRadius: '12px',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            color: '#f8fafc',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#a855f7', fontWeight: '600' }}>🎯 Goals:</strong> "Help me plan my meals for weight loss"
          </div>
          <div style={{ 
            padding: '16px', 
            background: 'rgba(249, 115, 22, 0.2)', 
            borderRadius: '12px',
            border: '1px solid rgba(249, 115, 22, 0.3)',
            color: '#f8fafc',
            fontSize: '14px'
          }}>
            <strong style={{ color: '#fb923c', fontWeight: '600' }}>💪 Fitness:</strong> "What's the best post-workout meal?"
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
