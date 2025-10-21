import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Clock, Utensils, Sparkles, Loader, Camera, CheckCircle } from 'lucide-react';
import CameraCapture from './CameraCapture';
import theme from '../theme';

interface Food {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
  isAIResult?: boolean;
  quantity?: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity: number;
  unit: string;
  meal_type: string;
  date: string;
  created_at: string;
}

const MealLogging: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('g');
  const [mealType, setMealType] = useState('breakfast');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // AI Recognition states
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [showAiSection, setShowAiSection] = useState(true);
  const [selectedAiItems, setSelectedAiItems] = useState<Set<number>>(new Set());
  const [itemQuantities, setItemQuantities] = useState<{[key: number]: string}>({});
  const [itemUnits, setItemUnits] = useState<{[key: number]: string}>({});
  const [removingItems, setRemovingItems] = useState<Set<number>>(new Set());
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await axios.get('/api/meals');
      setMeals(response.data);
    } catch (error) {
      console.error('Error fetching meals:', error);
    }
  };

  const searchFoods = async (query: string) => {
    if (query.length < 2) {
      setFoodResults([]);
      return;
    }

    try {
      const response = await axios.get(`/api/foods?search=${encodeURIComponent(query)}`);
      setFoodResults(response.data);
    } catch (error) {
      console.error('Error searching foods:', error);
    }
  };

  const recognizeFoodWithAI = async () => {
    if (!aiInput.trim()) return;

    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await axios.post('/api/ai/recognize-food', {
        foodDescription: aiInput
      });
      
      // Handle both single food and multiple components format
      const responseData = response.data;
      
      if (responseData.hasMultipleComponents && responseData.allComponents) {
        // New structured format with individual components
        setAiResult(responseData.allComponents);
        setMessage(`AI recognized ${responseData.allComponents.length} components: ${responseData.allComponents.map((item: any) => item.name).join(', ')}`);
      } else if (Array.isArray(responseData)) {
        // Already an array format
        setAiResult(responseData);
        setMessage(`AI recognized ${responseData.length} items: ${responseData.map((item: any) => item.name).join(', ')}`);
      } else {
        // Single food result - convert to array format
        setAiResult([responseData]);
        setMessage(`AI recognized: ${responseData.name}`);
      }
      
      setSelectedAiItems(new Set()); // Clear previous selections
      setShowAiSection(true);
    } catch (error: any) {
      setMessage('AI recognition failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setAiLoading(false);
    }
  };

  const selectAIResult = (foodIndex = 0) => {
    if (aiResult && Array.isArray(aiResult) && aiResult[foodIndex]) {
      const selectedFoodItem = aiResult[foodIndex];
      
      // Handle both old format (with calories, protein, etc.) and new format (with calories_per_100g, etc.)
      if (selectedFoodItem.calories_per_100g !== undefined) {
        // New format - already has per-100g values
        setSelectedFood({
          id: 'ai-' + Date.now() + '-' + foodIndex,
          name: selectedFoodItem.name,
          calories_per_100g: selectedFoodItem.calories_per_100g,
          protein_per_100g: selectedFoodItem.protein_per_100g,
          carbs_per_100g: selectedFoodItem.carbs_per_100g,
          fat_per_100g: selectedFoodItem.fat_per_100g,
          category: 'AI Recognized'
        });
        
        // Use smart unit selection and appropriate default quantity
        const suggestedUnit = getBestUnitForFood(selectedFoodItem.name);
        const defaultQuantity = suggestedUnit === 'piece' ? '2' : (selectedFoodItem.quantity ? selectedFoodItem.quantity.toString() : '100');
        setQuantity(defaultQuantity);
        setUnit(suggestedUnit);
      } else {
        // Old format - convert scaled values back to per-100g values
        const quantity = selectedFoodItem.quantity || 100;
        const scaleFactor = quantity / 100;
        
        setSelectedFood({
          id: 'ai-' + Date.now() + '-' + foodIndex,
          name: selectedFoodItem.name,
          calories_per_100g: selectedFoodItem.calories / scaleFactor,
          protein_per_100g: selectedFoodItem.protein / scaleFactor,
          carbs_per_100g: selectedFoodItem.carbs / scaleFactor,
          fat_per_100g: selectedFoodItem.fat / scaleFactor,
          category: 'AI Recognized'
        });
        
        // Use smart unit selection and appropriate default quantity
        const suggestedUnit = getBestUnitForFood(selectedFoodItem.name);
        const defaultQuantity = suggestedUnit === 'piece' ? '2' : (selectedFoodItem.quantity ? selectedFoodItem.quantity.toString() : '100');
        setQuantity(defaultQuantity);
        setUnit(suggestedUnit);
      }
      
      // Mark this item as selected
      setSelectedAiItems(prev => new Set(Array.from(prev).concat(foodIndex)));
    }
  };

  // const handleFoodItemClick = (foodIndex: number) => {
  //   selectAIResult(foodIndex);
  // };

  const clearAIResults = () => {
    setAiResult(null);
    setSelectedAiItems(new Set());
    setAiInput('');
  };

  // Function to determine the best unit for a food item
  const getBestUnitForFood = (foodName: string) => {
    const lowerName = foodName.toLowerCase();
    
    // Countable items
    if (lowerName.includes('egg') || lowerName.includes('chicken breast') || 
        lowerName.includes('apple') || lowerName.includes('banana') || 
        lowerName.includes('bread') || lowerName.includes('slice') ||
        lowerName.includes('roti') || lowerName.includes('chapati') ||
        lowerName.includes('naan') || lowerName.includes('tortilla')) {
      return 'piece';
    }
    
    // Items typically measured by slices
    if (lowerName.includes('bread') && !lowerName.includes('slice')) {
      return 'slice';
    }
    
    // Items typically measured by cups
    if (lowerName.includes('rice') || lowerName.includes('pasta') || 
        lowerName.includes('cereal') || lowerName.includes('oats')) {
      return 'cup';
    }
    
    // Default to grams for everything else
    return 'g';
  };

  const recognizeImageWithAI = async (imageData: string) => {
    try {
      console.log('Sending image for recognition...');
      const response = await axios.post('/api/ai/recognize-image', {
        imageData
      });

      console.log('Recognition response:', response.data);
      const recognizedFoods = response.data.foods || [response.data]; // Handle both formats
      setAiResult(recognizedFoods);
      setSelectedAiItems(new Set()); // Clear previous selections
      setShowAiSection(true);

      if (recognizedFoods.length === 1) {
        setMessage(`AI recognized: ${recognizedFoods[0].name} (${recognizedFoods[0].confidence}% confidence)`);
      } else {
        const foodNames = recognizedFoods.map((food: any) => food.name).join(', ');
        setMessage(`AI recognized ${recognizedFoods.length} items: ${foodNames}`);
      }
    } catch (error: any) {
      console.error('Error recognizing image:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      setMessage(`Failed to recognize food image: ${errorMessage}. Please try again.`);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchFoods(value);
  };

  const selectFood = (food: Food) => {
    setSelectedFood(food);
    setSearchTerm(food.name);
    setFoodResults([]);
  };

  const logMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood || !quantity) return;

    setLoading(true);
    setMessage('');

    try {
      const quantityNum = parseFloat(quantity);
      let multiplier = quantityNum / 100; // Default: assume quantity is in grams

      // Handle different units
      switch (unit) {
        case 'piece':
        case 'slice':
          // For countable items, use the quantity directly (not per 100g)
          multiplier = quantityNum;
          break;
        case 'cup':
          // Approximate: 1 cup ≈ 150g for most foods
          multiplier = quantityNum * 1.5;
          break;
        case 'tbsp':
          // Approximate: 1 tbsp ≈ 15g
          multiplier = quantityNum * 0.15;
          break;
        case 'tsp':
          // Approximate: 1 tsp ≈ 5g
          multiplier = quantityNum * 0.05;
          break;
        case 'kg':
          // 1 kg = 1000g
          multiplier = quantityNum * 10;
          break;
        case 'oz':
          // 1 oz ≈ 28g
          multiplier = quantityNum * 0.28;
          break;
        case 'lb':
          // 1 lb ≈ 454g
          multiplier = quantityNum * 4.54;
          break;
        case 'g':
        default:
          // Already in grams, divide by 100 to get per-100g multiplier
          multiplier = quantityNum / 100;
          break;
      }

      const mealData = {
        name: selectedFood.name,
        calories: Math.round(selectedFood.calories_per_100g * multiplier),
        protein: Math.round(selectedFood.protein_per_100g * multiplier * 10) / 10,
        carbs: Math.round(selectedFood.carbs_per_100g * multiplier * 10) / 10,
        fat: Math.round(selectedFood.fat_per_100g * multiplier * 10) / 10,
        quantity: quantityNum,
        unit: unit,
        mealType: mealType,
        date: new Date().toISOString().split('T')[0]
      };

      await axios.post('/api/meals', mealData);
      setMessage('Meal logged successfully!');
      setSelectedFood(null);
      setSearchTerm('');
      setQuantity('');
      fetchMeals();
    } catch (error: any) {
      setMessage('Error logging meal: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const deleteMeal = async (mealId: string) => {
    if (!window.confirm('Are you sure you want to delete this meal?')) return;

    try {
      await axios.delete(`/api/meals/${mealId}`);
      setMeals(meals.filter(meal => meal.id !== mealId));
      setMessage('Meal deleted successfully!');
    } catch (error: any) {
      setMessage('Error deleting meal: ' + (error.response?.data?.error || error.message));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ padding: '20px', background: theme.colors.primary.background, minHeight: '100vh' }}>
      <h1 className="text-center mb-4" style={{ 
        color: theme.colors.primary.text, 
        fontSize: theme.typography.fontSize.title,
        fontFamily: theme.typography.fontFamily.bold,
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing.lg
      }}>
        Meal Logging
      </h1>

      {/* Log New Meal */}
      <div className="card" style={{
        background: theme.colors.primary.surface,
        border: `1px solid ${theme.colors.primary.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        boxShadow: theme.shadows.glow.accent
      }}>
        <h3 style={{
          color: theme.colors.primary.text,
          fontSize: theme.typography.fontSize.subtitle,
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.md,
          display: 'flex',
          alignItems: 'center'
        }}>
          <Plus size={24} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
          Log New Meal
        </h3>

        {/* Quick Camera Button */}
        <div style={{ 
          marginBottom: theme.spacing.lg, 
          textAlign: 'center',
          padding: theme.spacing.lg,
          background: `linear-gradient(135deg, ${theme.colors.primary.surface}, ${theme.colors.primary.border})`,
          borderRadius: theme.borderRadius.lg,
          border: `2px dashed ${theme.colors.primary.accent}50`
        }}>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            style={{
              background: theme.gradients.accent,
              color: theme.colors.primary.text,
              border: 'none',
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              fontSize: theme.typography.fontSize.body,
              fontWeight: theme.typography.fontWeight.bold,
              display: 'flex',
              alignItems: 'center',
              margin: '0 auto',
              borderRadius: '25px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: theme.shadows.glow.accent,
              fontFamily: theme.typography.fontFamily.primary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 255, 127, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = theme.shadows.glow.accent;
            }}
          >
            <Camera size={24} style={{ marginRight: theme.spacing.md }} />
            📸 Take Photo of Food
          </button>
          <p style={{ 
            marginTop: theme.spacing.md, 
            fontSize: theme.typography.fontSize.bodySmall, 
            color: theme.colors.primary.textSecondary,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: '0',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Point your camera at food for instant AI recognition
          </p>
        </div>

        {message && (
          <div style={{
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
            fontFamily: theme.typography.fontFamily.primary,
            fontSize: theme.typography.fontSize.bodySmall,
            fontWeight: theme.typography.fontWeight.medium,
            background: message.includes('Error') 
              ? `linear-gradient(135deg, ${theme.colors.primary.error}20, ${theme.colors.primary.error}10)`
              : `linear-gradient(135deg, ${theme.colors.primary.accent}20, ${theme.colors.primary.accent}10)`,
            border: `1px solid ${message.includes('Error') ? theme.colors.primary.error : theme.colors.primary.accent}`,
            color: message.includes('Error') ? theme.colors.primary.error : theme.colors.primary.accent
          }}>
            {message}
          </div>
        )}

        {/* AI Food Recognition Section */}
        <div className="card" style={{ 
          marginBottom: theme.spacing.lg, 
          background: `linear-gradient(135deg, ${theme.colors.primary.accentSecondary}, #00BFA6)`, 
          color: theme.colors.primary.text,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          boxShadow: theme.shadows.glow.blue
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <h3 style={{ 
              margin: 0, 
              display: 'flex', 
              alignItems: 'center',
              fontSize: theme.typography.fontSize.subtitle,
              fontFamily: theme.typography.fontFamily.bold,
              fontWeight: theme.typography.fontWeight.bold
            }}>
              <Sparkles size={24} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.text }} />
              AI Food Recognition
            </h3>
            <button
              type="button"
              onClick={() => setShowAiSection(!showAiSection)}
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: '1px solid rgba(255,255,255,0.3)',
                color: theme.colors.primary.text,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.borderRadius.md,
                cursor: 'pointer',
                fontFamily: theme.typography.fontFamily.primary,
                fontSize: theme.typography.fontSize.bodySmall,
                fontWeight: theme.typography.fontWeight.medium,
                transition: 'all 0.3s ease'
              }}
            >
              {showAiSection ? 'Hide' : 'Show'} AI
            </button>
          </div>
          
          {showAiSection && (
            <div>
              <p style={{ 
                marginBottom: theme.spacing.md, 
                opacity: 0.9,
                fontFamily: theme.typography.fontFamily.primary,
                fontSize: theme.typography.fontSize.bodySmall,
                color: theme.colors.primary.text
              }}>
                Describe your food in natural language or take a photo to let AI extract the nutritional information!
              </p>
              
              {/* Camera Button - Full Width */}
              <div style={{ marginBottom: theme.spacing.lg }}>
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.borderRadius.lg,
                    color: theme.colors.primary.text,
                    fontFamily: theme.typography.fontFamily.primary,
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.medium,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginBottom: theme.spacing.sm
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <Camera size={20} style={{ marginRight: theme.spacing.sm }} />
                  Take Photo
                </button>
              </div>
              
              {/* Text Input and Recognize Button */}
              <div style={{ 
                display: 'flex', 
                gap: theme.spacing.md,
                alignItems: 'stretch'
              }}>
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="e.g., 'grilled chicken breast with rice and broccoli'"
                  style={{ 
                    flex: 1,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.borderRadius.lg,
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: theme.colors.primary.text,
                    fontFamily: theme.typography.fontFamily.primary,
                    fontSize: theme.typography.fontSize.body,
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid rgba(255,255,255,0.5)';
                    e.target.style.background = 'rgba(255,255,255,0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(255,255,255,0.3)';
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                  }}
                />
                <button
                  type="button"
                  onClick={recognizeFoodWithAI}
                  disabled={aiLoading || !aiInput.trim()}
                  style={{ 
                    background: aiLoading || !aiInput.trim() 
                      ? 'rgba(255,255,255,0.1)' 
                      : 'rgba(255,255,255,0.2)', 
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: theme.colors.primary.text,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.borderRadius.lg,
                    cursor: aiLoading || !aiInput.trim() ? 'not-allowed' : 'pointer',
                    fontFamily: theme.typography.fontFamily.primary,
                    fontSize: theme.typography.fontSize.body,
                    fontWeight: theme.typography.fontWeight.medium,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    transition: 'all 0.3s ease',
                    opacity: aiLoading || !aiInput.trim() ? 0.6 : 1,
                    minWidth: '120px',
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (!aiLoading && aiInput.trim()) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!aiLoading && aiInput.trim()) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {aiLoading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {aiLoading ? 'Analyzing...' : 'Recognize'}
                </button>
              </div>

              {aiResult && Array.isArray(aiResult) && (
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  background: 'rgba(255,255,255,0.1)', 
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>AI Recognition Result</h4>
                <button
                  onClick={clearAIResults}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                  }}
                >
                  Clear Results
                </button>
              </div>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.9 }}>
                Found {aiResult.length} food item{aiResult.length > 1 ? 's' : ''}. Edit quantities and log each item separately:
                {selectedAiItems.size > 0 && (
                  <span style={{ color: '#10b981', fontWeight: '600' }}>
                    {' '}({selectedAiItems.size} selected)
                  </span>
                )}
              </p>
                  
                  {aiResult.map((food, index) => {
                    const isSelected = selectedAiItems.has(index);
                    const suggestedUnit = getBestUnitForFood(food.name);
                    const itemQuantity = itemQuantities[index] || (suggestedUnit === 'piece' ? '2' : food.quantity?.toString() || '100');
                    const itemUnit = itemUnits[index] || suggestedUnit;
                    
                    // Calculate nutrition based on current quantity
                    const quantityNum = parseFloat(itemQuantity) || 0;
                    let multiplier = quantityNum / 100; // Default: assume quantity is in grams

                    // Handle different units
                    switch (itemUnit) {
                      case 'piece':
                      case 'item':
                      case 'slice':
                        // For countable items, use the quantity directly (not per 100g)
                        multiplier = quantityNum;
                        break;
                      case 'cup':
                        // Approximate: 1 cup ≈ 150g for most foods
                        multiplier = quantityNum * 1.5;
                        break;
                      case 'tbsp':
                        // Approximate: 1 tbsp ≈ 15g
                        multiplier = quantityNum * 0.15;
                        break;
                      case 'tsp':
                        // Approximate: 1 tsp ≈ 5g
                        multiplier = quantityNum * 0.05;
                        break;
                      case 'kg':
                        // 1 kg = 1000g
                        multiplier = quantityNum * 10;
                        break;
                      case 'oz':
                        // 1 oz ≈ 28g
                        multiplier = quantityNum * 0.28;
                        break;
                      case 'lb':
                        // 1 lb ≈ 454g
                        multiplier = quantityNum * 4.54;
                        break;
                      case 'g':
                      default:
                        // Already in grams, divide by 100 to get per-100g multiplier
                        multiplier = quantityNum / 100;
                        break;
                    }
                    
                    const calculatedCalories = Math.round(food.calories_per_100g * multiplier);
                    const calculatedProtein = Math.round(food.protein_per_100g * multiplier * 10) / 10;
                    const calculatedCarbs = Math.round(food.carbs_per_100g * multiplier * 10) / 10;
                    const calculatedFat = Math.round(food.fat_per_100g * multiplier * 10) / 10;
                    
                    return (
                      <div key={index} style={{ 
                        marginBottom: '16px', 
                        padding: '16px', 
                        background: isSelected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)', 
                        borderRadius: '8px',
                        border: isSelected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.3s ease-out',
                        transform: removingItems.has(index) ? 'translateX(-100%)' : 'translateX(0)',
                        opacity: removingItems.has(index) ? 0 : 1,
                        overflow: 'hidden'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <h5 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{food.name}</h5>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {removingItems.has(index) ? (
                              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '600' }}>
                                ✓ Logged!
                              </span>
                            ) : (
                              <span style={{ fontSize: '12px', opacity: 0.8 }}>{food.confidence}% confidence</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Quantity Input */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>Quantity:</label>
                            <input
                              type="number"
                              value={itemQuantity}
                              onChange={(e) => setItemQuantities(prev => ({...prev, [index]: e.target.value}))}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '14px'
                              }}
                              placeholder="100"
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>Unit:</label>
                            <select
                              value={itemUnit}
                              onChange={(e) => setItemUnits(prev => ({...prev, [index]: e.target.value}))}
                              style={{
                                width: '100%',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                color: '#fff',
                                fontSize: '14px'
                              }}
                            >
                              <option value="piece">piece(s)</option>
                              <option value="item">item(s)</option>
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="cup">cup(s)</option>
                              <option value="slice">slice(s)</option>
                              <option value="tbsp">tbsp</option>
                              <option value="tsp">tsp</option>
                            </select>
                          </div>
                        </div>
                        
                        {/* Nutrition Display */}
                        <div className="grid grid-2" style={{ fontSize: '12px', opacity: 0.9, marginBottom: '12px' }}>
                          <div><strong>Calories:</strong> {calculatedCalories} cal</div>
                          <div><strong>Protein:</strong> {calculatedProtein}g</div>
                          <div><strong>Carbs:</strong> {calculatedCarbs}g</div>
                          <div><strong>Fat:</strong> {calculatedFat}g</div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              const updatedFood = {
                                ...food,
                                quantity: quantityNum,
                                unit: itemUnit,
                                calories_per_100g: food.calories_per_100g,
                                protein_per_100g: food.protein_per_100g,
                                carbs_per_100g: food.carbs_per_100g,
                                fat_per_100g: food.fat_per_100g
                              };
                              setSelectedFood(updatedFood);
                              setQuantity(quantityNum.toString());
                              setUnit(itemUnit);
                              setSelectedAiItems(prev => new Set(Array.from(prev).concat(index)));
                              
                              // Remove the used item from AI results with animation
                              setRemovingItems(prev => new Set(Array.from(prev).concat(index)));
                              setTimeout(() => {
                                if (aiResult && Array.isArray(aiResult)) {
                                  const updatedResults = aiResult.filter((_, itemIndex) => itemIndex !== index);
                                  if (updatedResults.length === 0) {
                                    setAiResult(null);
                                    setSelectedAiItems(new Set());
                                  } else {
                                    setAiResult(updatedResults);
                                    // Update selected items indices
                                    const newSelectedItems = new Set<number>();
                                    selectedAiItems.forEach(selectedIndex => {
                                      if (selectedIndex < index) {
                                        newSelectedItems.add(selectedIndex);
                                      } else if (selectedIndex > index) {
                                        newSelectedItems.add(selectedIndex - 1);
                                      }
                                    });
                                    setSelectedAiItems(newSelectedItems);
                                  }
                                }
                                setRemovingItems(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(index);
                                  return newSet;
                                });
                              }, 300); // 300ms animation duration
                            }}
                            disabled={removingItems.has(index)}
                            style={{
                              flex: 1,
                              background: removingItems.has(index) ? 'rgba(59, 130, 246, 0.5)' : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '10px 16px',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: removingItems.has(index) ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s',
                              opacity: removingItems.has(index) ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!removingItems.has(index)) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            Use This Item
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                setLoading(true);
                                const mealData = {
                                  name: food.name,
                                  calories: calculatedCalories,
                                  protein: calculatedProtein,
                                  carbs: calculatedCarbs,
                                  fat: calculatedFat,
                                  quantity: quantityNum,
                                  unit: itemUnit,
                                  mealType: mealType,
                                  date: new Date().toISOString().split('T')[0]
                                };
                                await axios.post('/api/meals', mealData);
                                setMessage(`${food.name} logged successfully!`);
                                fetchMeals();
                                
                                // Remove the logged item from AI results with animation
                                setRemovingItems(prev => new Set(Array.from(prev).concat(index)));
                                setTimeout(() => {
                                  if (aiResult && Array.isArray(aiResult)) {
                                    const updatedResults = aiResult.filter((_, itemIndex) => itemIndex !== index);
                                    if (updatedResults.length === 0) {
                                      setAiResult(null);
                                      setSelectedAiItems(new Set());
                                    } else {
                                      setAiResult(updatedResults);
                                      // Update selected items indices
                                      const newSelectedItems = new Set<number>();
                                      selectedAiItems.forEach(selectedIndex => {
                                        if (selectedIndex < index) {
                                          newSelectedItems.add(selectedIndex);
                                        } else if (selectedIndex > index) {
                                          newSelectedItems.add(selectedIndex - 1);
                                        }
                                      });
                                      setSelectedAiItems(newSelectedItems);
                                    }
                                  }
                                  setRemovingItems(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(index);
                                    return newSet;
                                  });
                                }, 300); // 300ms animation duration
                              } catch (error: any) {
                                setMessage('Error logging meal: ' + (error.response?.data?.error || error.message));
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || removingItems.has(index)}
                            style={{
                              flex: 1,
                              background: removingItems.has(index) ? 'rgba(16, 185, 129, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '10px 16px',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: (loading || removingItems.has(index)) ? 'not-allowed' : 'pointer',
                              opacity: (loading || removingItems.has(index)) ? 0.6 : 1,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!loading && !removingItems.has(index)) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {loading ? 'Logging...' : 'Log This Item'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={logMeal}>
          <div style={{ marginBottom: theme.spacing.lg }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.md,
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.bold,
              fontWeight: theme.typography.fontWeight.semiBold
            }}>
              Search Food Database
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for food items..."
                style={{
                  width: '100%',
                  padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.lg,
                  border: `1px solid ${theme.colors.primary.border}`,
                  background: theme.colors.primary.surface,
                  color: theme.colors.primary.text,
                  fontFamily: theme.typography.fontFamily.primary,
                  fontSize: theme.typography.fontSize.body,
                  outline: 'none',
                  transition: 'all 0.3s ease',
                  boxShadow: theme.shadows.normal.sm
                }}
                onFocus={(e) => {
                  e.target.style.border = `1px solid ${theme.colors.primary.accent}`;
                  e.target.style.boxShadow = theme.shadows.glow.accent;
                }}
                onBlur={(e) => {
                  e.target.style.border = `1px solid ${theme.colors.primary.border}`;
                  e.target.style.boxShadow = theme.shadows.normal.sm;
                }}
              />
              {foodResults.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: theme.colors.primary.surface,
                  border: `1px solid ${theme.colors.primary.border}`,
                  borderRadius: theme.borderRadius.lg,
                  marginTop: theme.spacing.sm,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 10,
                  boxShadow: theme.shadows.normal.lg
                }}>
                  {foodResults.map(food => (
                    <div
                      key={food.id}
                      onClick={() => selectFood(food)}
                      style={{
                        padding: theme.spacing.md,
                        borderBottom: `1px solid ${theme.colors.primary.border}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: theme.typography.fontFamily.primary
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = theme.colors.primary.accent + '20';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{
                        color: theme.colors.primary.text,
                        fontSize: theme.typography.fontSize.body,
                        fontWeight: theme.typography.fontWeight.medium,
                        marginBottom: theme.spacing.xs
                      }}>
                        {food.name}
                      </div>
                      <div style={{
                        color: theme.colors.primary.textSecondary,
                        fontSize: theme.typography.fontSize.bodySmall,
                        fontFamily: theme.typography.fontFamily.primary
                      }}>
                        {food.calories_per_100g} cal, {food.protein_per_100g}g protein, {food.carbs_per_100g}g carbs, {food.fat_per_100g}g fat per 100g
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedFood && (
            <div style={{
              background: theme.colors.primary.surface,
              border: `1px solid ${theme.colors.primary.border}`,
              borderRadius: theme.borderRadius.lg,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.lg,
              boxShadow: theme.shadows.normal.sm
            }}>
              <h4 style={{
                color: theme.colors.primary.text,
                fontSize: theme.typography.fontSize.body,
                fontFamily: theme.typography.fontFamily.bold,
                fontWeight: theme.typography.fontWeight.semiBold,
                marginBottom: theme.spacing.lg,
                display: 'flex',
                alignItems: 'center'
              }}>
                <CheckCircle size={20} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
                Selected: {selectedFood.name}
              </h4>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: theme.spacing.lg,
                marginBottom: theme.spacing.lg
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.sm,
                    color: theme.colors.primary.text,
                    fontSize: theme.typography.fontSize.bodySmall,
                    fontFamily: theme.typography.fontFamily.primary,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    min="0.1"
                    step="0.1"
                    required
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.primary.border}`,
                      background: theme.colors.primary.background,
                      color: theme.colors.primary.text,
                      fontFamily: theme.typography.fontFamily.primary,
                      fontSize: theme.typography.fontSize.body,
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = `1px solid ${theme.colors.primary.accent}`;
                      e.target.style.boxShadow = theme.shadows.glow.accent;
                    }}
                    onBlur={(e) => {
                      e.target.style.border = `1px solid ${theme.colors.primary.border}`;
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.sm,
                    color: theme.colors.primary.text,
                    fontSize: theme.typography.fontSize.bodySmall,
                    fontFamily: theme.typography.fontFamily.primary,
                    fontWeight: theme.typography.fontWeight.medium
                  }}>
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      borderRadius: theme.borderRadius.md,
                      border: `1px solid ${theme.colors.primary.border}`,
                      background: theme.colors.primary.background,
                      color: theme.colors.primary.text,
                      fontFamily: theme.typography.fontFamily.primary,
                      fontSize: theme.typography.fontSize.body,
                      outline: 'none',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onFocus={(e) => {
                      e.target.style.border = `1px solid ${theme.colors.primary.accent}`;
                      e.target.style.boxShadow = theme.shadows.glow.accent;
                    }}
                    onBlur={(e) => {
                      e.target.style.border = `1px solid ${theme.colors.primary.border}`;
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="piece">Piece(s)</option>
                    <option value="item">Item(s)</option>
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="lb">Pounds (lb)</option>
                    <option value="cup">Cup(s)</option>
                    <option value="slice">Slice(s)</option>
                    <option value="tbsp">Tablespoons</option>
                    <option value="tsp">Teaspoons</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.primary.text,
                  fontSize: theme.typography.fontSize.bodySmall,
                  fontFamily: theme.typography.fontFamily.primary,
                  fontWeight: theme.typography.fontWeight.medium
                }}>
                  Meal Type
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.primary.border}`,
                    background: theme.colors.primary.background,
                    color: theme.colors.primary.text,
                    fontFamily: theme.typography.fontFamily.primary,
                    fontSize: theme.typography.fontSize.body,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.border = `1px solid ${theme.colors.primary.accent}`;
                    e.target.style.boxShadow = theme.shadows.glow.accent;
                  }}
                  onBlur={(e) => {
                    e.target.style.border = `1px solid ${theme.colors.primary.border}`;
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading 
                    ? theme.colors.primary.border 
                    : theme.gradients.accent,
                  color: theme.colors.primary.text,
                  border: 'none',
                  padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                  borderRadius: theme.borderRadius.lg,
                  fontSize: theme.typography.fontSize.body,
                  fontWeight: theme.typography.fontWeight.bold,
                  fontFamily: theme.typography.fontFamily.primary,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: loading ? 'none' : theme.shadows.glow.accent,
                  opacity: loading ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: theme.spacing.sm
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(0, 255, 127, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = theme.shadows.glow.accent;
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Logging...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Log Meal
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Recent Meals */}
      <div className="card">
        <h3 className="mb-4">
          <Utensils size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Recent Meals
        </h3>

        {meals.length === 0 ? (
          <p className="text-muted text-center">No meals logged yet. Start by logging your first meal above!</p>
        ) : (
          <div>
            {meals.map(meal => (
              <div key={meal.id} className="meal-item">
                <div className="meal-info">
                  <h4>{meal.name}</h4>
                  <div className="meal-details">
                    <span style={{ marginRight: '16px' }}>
                      <Clock size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {formatDate(meal.date)} at {formatTime(meal.created_at)}
                    </span>
                    <span style={{ marginRight: '16px' }}>
                      {meal.quantity} {meal.unit}
                    </span>
                    <span style={{ textTransform: 'capitalize' }}>
                      {meal.meal_type}
                    </span>
                  </div>
                  <div className="meal-details">
                    {meal.protein}g protein • {meal.carbs}g carbs • {meal.fat}g fat
                  </div>
                </div>
                <div className="flex flex-center gap-2">
                  <div className="meal-calories">{meal.calories} cal</div>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px', minWidth: 'auto' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onImageCapture={recognizeImageWithAI}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default MealLogging;
