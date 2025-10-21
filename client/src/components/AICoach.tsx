import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Send, Bot, User, MessageCircle, Target, TrendingUp } from 'lucide-react';
import theme from '../theme';

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

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load chat history and nutrition data when component mounts
    loadChatHistory();
    loadNutritionData();
  }, [user?.id, loadChatHistory, loadNutritionData]);

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
    // const remainingProtein = nutritionData?.remaining?.protein || 0;
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

  // const calculateTDEE = (height: number, weight: number, age: number, gender: string, activityLevel: string): number => {
  //   let bmr;
  //   if (gender.toLowerCase() === 'male') {
  //     bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  //   } else {
  //     bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  //   }

  //   const activityMultipliers = {
  //     'sedentary': 1.2,
  //     'light': 1.375,
  //     'moderate': 1.55,
  //     'active': 1.725,
  //     'very_active': 1.9
  //   };

  //   return Math.round(bmr * (activityMultipliers[activityLevel as keyof typeof activityMultipliers] || 1.2));
  // };

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
      // Create a placeholder AI message for streaming (but don't show it until we have content)
      const aiMessageId = (Date.now() + 1).toString();
      let aiMessageAdded = false;

      // Use fetch with streaming
      const response = await fetch('/api/ai/coach-response-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: inputText })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  fullResponse += data.content;
                  
                  // Add the AI message to the chat if it's the first chunk
                  if (!aiMessageAdded) {
                    const aiMessage: Message = {
                      id: aiMessageId,
                      text: fullResponse,
                      sender: 'ai',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, aiMessage]);
                    aiMessageAdded = true;
                    setIsTyping(false); // Stop showing typing indicator once message appears
                  } else {
                    // Update the existing AI message with new content
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, text: fullResponse }
                        : msg
                    ));
                  }
                  
                  // Add a small delay to make streaming more visible
                  await new Promise(resolve => setTimeout(resolve, 50));
                } else if (data.type === 'complete') {
                  // Finalize the message
                  const finalText = data.fullResponse || fullResponse;
                  
                  if (!aiMessageAdded) {
                    // If no chunks were received, add the complete message
                    const aiMessage: Message = {
                      id: aiMessageId,
                      text: finalText,
                      sender: 'ai',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, aiMessage]);
                  } else {
                    // Update the existing message
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, text: finalText }
                        : msg
                    ));
                  }
                  
                  // Save the complete AI response
                  const finalMessage: Message = {
                    id: aiMessageId,
                    text: finalText,
                    sender: 'ai',
                    timestamp: new Date()
                  };
                  saveMessage(finalMessage);
                  
                  setIsTyping(false); // Ensure typing indicator is hidden
                  return;
                } else if (data.type === 'error') {
                  // Handle error
                  if (!aiMessageAdded) {
                    const aiMessage: Message = {
                      id: aiMessageId,
                      text: data.content || 'Sorry, I encountered an error.',
                      sender: 'ai',
                      timestamp: new Date()
                    };
                    setMessages(prev => [...prev, aiMessage]);
                  } else {
                    setMessages(prev => prev.map(msg => 
                      msg.id === aiMessageId 
                        ? { ...msg, text: data.content || 'Sorry, I encountered an error.' }
                        : msg
                    ));
                  }
                  setIsTyping(false); // Ensure typing indicator is hidden
                  return;
                }
              } catch (parseError) {
                console.error('Error parsing streaming data:', parseError);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Failed to get AI response:', error);
      setIsTyping(false);
      
      // Fallback to rule-based response if streaming fails
      const fallbackResponse = generateAIResponse(inputText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      saveMessage(aiMessage);
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
      <style>
        {`
          @keyframes typing {
            0%, 60%, 100% {
              transform: translateY(0);
              opacity: 0.4;
            }
            30% {
              transform: translateY(-10px);
              opacity: 1;
            }
          }
          
          @keyframes fadeInText {
            from {
              opacity: 0;
              transform: translateY(5px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes blink {
            0%, 50% {
              opacity: 1;
            }
            51%, 100% {
              opacity: 0;
            }
          }
        `}
      </style>
      <h1 className="text-center mb-6" style={{ 
        color: theme.colors.primary.text, 
        fontSize: '2.5rem', 
        fontWeight: theme.typography.fontWeight.bold,
        fontFamily: theme.typography.fontFamily.bold,
        marginBottom: theme.spacing.xl
      }}>
        AI Diet Coach
      </h1>
      
      {/* User Profile Summary */}
      <div style={{
        background: theme.colors.primary.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        border: `1px solid ${theme.colors.primary.border}`,
        boxShadow: theme.shadows.glow.accent
      }}>
        <h3 className="mb-4" style={{ 
          color: theme.colors.primary.text, 
          fontSize: theme.typography.fontSize.subtitle,
          fontFamily: theme.typography.fontFamily.bold,
          marginBottom: theme.spacing.md
        }}>
          <Target size={24} style={{ 
            marginRight: theme.spacing.sm, 
            verticalAlign: 'middle', 
            color: theme.colors.primary.accent 
          }} />
          Your Profile Summary
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: theme.spacing.md 
        }}>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Name:</strong> {user?.name || 'Not set'}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Height:</strong> {user?.height ? `${user.height} cm` : 'Not set'}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Weight:</strong> {user?.weight ? `${user.weight} kg` : 'Not set'}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Age:</strong> {user?.age ? `${user.age} years` : 'Not set'}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Gender:</strong> {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary, 
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>Activity Level:</strong> {user?.activityLevel ? user.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}
          </div>
        </div>
        {(!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) && (
          <div style={{ 
            marginTop: theme.spacing.md,
            padding: theme.spacing.md,
            background: `linear-gradient(135deg, ${theme.colors.primary.surface}, ${theme.colors.primary.border})`,
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.primary.accent}`,
            color: theme.colors.primary.accent,
            fontFamily: theme.typography.fontFamily.primary,
            fontSize: theme.typography.fontSize.bodySmall
          }}>
            <strong style={{ fontWeight: theme.typography.fontWeight.semiBold }}>Note:</strong> Complete your profile for personalized advice!
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div style={{
        background: theme.colors.primary.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        border: `1px solid ${theme.colors.primary.border}`,
        boxShadow: theme.shadows.glow.accent
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MessageCircle size={24} style={{ 
              marginRight: theme.spacing.sm, 
              color: theme.colors.primary.accent 
            }} />
            <h3 style={{ 
              color: theme.colors.primary.text, 
              fontSize: theme.typography.fontSize.subtitle,
              fontFamily: theme.typography.fontFamily.bold
            }}>Chat with AI Coach</h3>
          </div>
          <button
            onClick={clearChat}
            style={{ 
              fontSize: theme.typography.fontSize.caption, 
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              background: theme.colors.primary.error,
              color: theme.colors.primary.text,
              border: 'none',
              borderRadius: theme.borderRadius.md,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontFamily: theme.typography.fontFamily.primary,
              fontWeight: theme.typography.fontWeight.medium
            }}
            onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#e53e3e'}
            onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = theme.colors.primary.error}
          >
            Clear Chat
          </button>
        </div>

        {/* Messages */}
        <div 
          style={{ 
            height: '500px', 
            overflowY: 'auto', 
            borderRadius: theme.borderRadius.md, 
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            background: theme.colors.primary.background,
            border: `1px solid ${theme.colors.primary.border}`,
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
                      backgroundColor: message.sender === 'user' ? theme.colors.primary.accent : theme.colors.primary.accentSecondary,
                      color: theme.colors.primary.text,
                      marginLeft: message.sender === 'user' ? theme.spacing.sm : '0px',
                      marginRight: message.sender === 'user' ? '0px' : theme.spacing.sm,
                      boxShadow: theme.shadows.glow.accent,
                      fontSize: '12px'
                    }}
                  >
                    {message.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  
                  {/* Message Bubble */}
                  <div
                    style={{
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      backgroundColor: message.sender === 'user' ? theme.colors.primary.accent : theme.colors.primary.surface,
                      color: message.sender === 'user' ? theme.colors.primary.text : theme.colors.primary.text,
                      maxWidth: '250px',
                      boxShadow: message.sender === 'user' ? theme.shadows.glow.accent : theme.shadows.normal.sm,
                      borderRadius: message.sender === 'user' 
                        ? `${theme.borderRadius.lg} ${theme.borderRadius.lg} ${theme.borderRadius.sm} ${theme.borderRadius.lg}` 
                        : `${theme.borderRadius.lg} ${theme.borderRadius.lg} ${theme.borderRadius.lg} ${theme.borderRadius.sm}`,
                      position: 'relative',
                      wordWrap: 'break-word',
                      transition: 'all 0.2s ease-out',
                      border: message.sender === 'ai' ? `1px solid ${theme.colors.primary.border}` : 'none'
                    }}
                  >
                    {/* Message Text */}
                    <div className="text-sm whitespace-pre-line" style={{ 
                      lineHeight: theme.typography.lineHeight.normal,
                      color: message.sender === 'user' ? theme.colors.primary.text : theme.colors.primary.text,
                      fontWeight: theme.typography.fontWeight.regular,
                      fontFamily: theme.typography.fontFamily.primary,
                      fontSize: theme.typography.fontSize.bodySmall,
                      animation: message.sender === 'ai' && message.text ? 'fadeInText 0.3s ease-in' : 'none',
                      position: 'relative'
                    }}>
                      {message.text}
                      {message.sender === 'ai' && isTyping && message.text && (
                        <span style={{
                          display: 'inline-block',
                          width: '2px',
                          height: '16px',
                          backgroundColor: theme.colors.primary.accent,
                          marginLeft: '2px',
                          animation: 'blink 1s infinite'
                        }}></span>
                      )}
                    </div>
                    
                    {/* Timestamp */}
                    <div style={{ 
                      textAlign: message.sender === 'user' ? 'right' : 'left',
                      fontSize: theme.typography.fontSize.caption,
                      color: message.sender === 'user' ? 'rgba(255, 255, 255, 0.8)' : theme.colors.primary.textSecondary,
                      marginTop: theme.spacing.xs,
                      fontFamily: theme.typography.fontFamily.primary
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'flex-start', 
                marginBottom: theme.spacing.md, 
                width: '100%' 
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  width: 'fit-content' 
                }}>
                  {/* AI Avatar */}
                  <div style={{
                    flexShrink: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: theme.colors.primary.accentSecondary,
                    color: theme.colors.primary.text,
                    marginRight: theme.spacing.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: theme.shadows.glow.blue,
                    fontSize: '12px'
                  }}>
                    <Bot size={14} />
                  </div>
                  
                  {/* Typing Bubble */}
                  <div style={{
                    backgroundColor: theme.colors.primary.surface,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: `${theme.borderRadius.lg} ${theme.borderRadius.lg} ${theme.borderRadius.lg} ${theme.borderRadius.sm}`,
                    boxShadow: theme.shadows.normal.sm,
                    border: `1px solid ${theme.colors.primary.border}`,
                    maxWidth: '120px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.xs }}>
                      <span style={{ 
                        fontSize: theme.typography.fontSize.caption, 
                        color: theme.colors.primary.textSecondary, 
                        marginRight: theme.spacing.sm,
                        fontFamily: theme.typography.fontFamily.primary
                      }}>AI is typing</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          backgroundColor: theme.colors.primary.accent,
                          borderRadius: '50%',
                          animation: 'typing 1.4s infinite ease-in-out'
                        }}></div>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          backgroundColor: theme.colors.primary.accent,
                          borderRadius: '50%',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.2s'
                        }}></div>
                        <div style={{
                          width: '4px',
                          height: '4px',
                          backgroundColor: theme.colors.primary.accent,
                          borderRadius: '50%',
                          animation: 'typing 1.4s infinite ease-in-out',
                          animationDelay: '0.4s'
                        }}></div>
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
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about nutrition, meal planning, or your fitness goals..."
            disabled={isTyping}
            style={{
              flex: 1,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: '25px',
              border: `1px solid ${theme.colors.primary.border}`,
              background: theme.colors.primary.surface,
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.bodySmall,
              outline: 'none',
              fontFamily: theme.typography.fontFamily.primary,
              fontWeight: theme.typography.fontWeight.regular,
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => (e.target as HTMLInputElement).style.border = `1px solid ${theme.colors.primary.accent}`}
            onBlur={(e) => (e.target as HTMLInputElement).style.border = `1px solid ${theme.colors.primary.border}`}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isTyping}
            style={{
              padding: theme.spacing.md,
              borderRadius: '50%',
              border: 'none',
              background: inputText.trim() && !isTyping ? theme.gradients.accent : theme.colors.primary.border,
              color: theme.colors.primary.text,
              cursor: inputText.trim() && !isTyping ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s ease',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: inputText.trim() && !isTyping ? theme.shadows.glow.accent : theme.shadows.normal.sm
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Quick Tips */}
      <div style={{
        background: theme.colors.primary.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginTop: theme.spacing.lg,
        border: `1px solid ${theme.colors.primary.border}`,
        boxShadow: theme.shadows.glow.accent
      }}>
        <h3 style={{ 
          color: theme.colors.primary.text, 
          fontSize: theme.typography.fontSize.subtitle,
          fontFamily: theme.typography.fontFamily.bold,
          marginBottom: theme.spacing.md
        }}>
          <TrendingUp size={24} style={{ 
            marginRight: theme.spacing.sm, 
            verticalAlign: 'middle', 
            color: theme.colors.primary.accent 
          }} />
          Quick Tips
        </h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: theme.spacing.md 
        }}>
          <div style={{ 
            padding: theme.spacing.md, 
            background: `linear-gradient(135deg, ${theme.colors.primary.accentSecondary}20, ${theme.colors.primary.accent}20)`, 
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.primary.accentSecondary}50`,
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accentSecondary, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>💡 Try asking:</strong> "What should I eat before a workout?"
          </div>
          <div style={{ 
            padding: theme.spacing.md, 
            background: `linear-gradient(135deg, ${theme.colors.primary.accent}20, #00BFA620)`, 
            borderRadius: theme.borderRadius.md,
            border: `1px solid ${theme.colors.primary.accent}50`,
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: theme.colors.primary.accent, 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>🍎 Nutrition:</strong> "How much protein do I need daily?"
          </div>
          <div style={{ 
            padding: theme.spacing.md, 
            background: `linear-gradient(135deg, #a855f720, #8b5cf620)`, 
            borderRadius: theme.borderRadius.md,
            border: '1px solid #a855f750',
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: '#a855f7', 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>🎯 Goals:</strong> "Help me plan my meals for weight loss"
          </div>
          <div style={{ 
            padding: theme.spacing.md, 
            background: `linear-gradient(135deg, #fb923c20, #f9731620)`, 
            borderRadius: theme.borderRadius.md,
            border: '1px solid #fb923c50',
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ 
              color: '#fb923c', 
              fontWeight: theme.typography.fontWeight.semiBold 
            }}>💪 Fitness:</strong> "What's the best post-workout meal?"
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICoach;
