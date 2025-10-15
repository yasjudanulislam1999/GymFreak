import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Trash2, Clock, Utensils, Sparkles, Loader, Camera } from 'lucide-react';
import CameraCapture from './CameraCapture';

interface Food {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  category: string;
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
  
  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

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
      
      // Convert single food result to array format to match image recognition
      const recognizedFood = response.data;
      setAiResult([recognizedFood]);
      setShowAiSection(true);
      setMessage(`AI recognized: ${recognizedFood.name}`);
    } catch (error: any) {
      setMessage('AI recognition failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setAiLoading(false);
    }
  };

  const selectAIResult = (foodIndex = 0) => {
    if (aiResult && Array.isArray(aiResult) && aiResult[foodIndex]) {
      const selectedFoodItem = aiResult[foodIndex];
      
      // Convert AI scaled values back to per-100g values for consistent frontend calculation
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
      
      // Preserve the AI-detected quantity and unit (don't reset to 100g)
      setQuantity(selectedFoodItem.quantity ? selectedFoodItem.quantity.toString() : '100');
      setUnit(selectedFoodItem.unit || 'g');
      
      setShowAiSection(false);
      setAiInput('');
      setAiResult(null);
    }
  };

  const handleFoodItemClick = (foodIndex: number) => {
    selectAIResult(foodIndex);
  };

  const recognizeImageWithAI = async (imageData: string) => {
    setImageLoading(true);
    try {
      console.log('Sending image for recognition...');
      const response = await axios.post('/api/ai/recognize-image', {
        imageData
      });
      
      console.log('Recognition response:', response.data);
      const recognizedFoods = response.data.foods || [response.data]; // Handle both formats
      setAiResult(recognizedFoods);
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
    } finally {
      setImageLoading(false);
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
    <div>
      <h1 className="text-center mb-4">Meal Logging</h1>

      {/* Log New Meal */}
      <div className="card">
        <h3 className="mb-4">
          <Plus size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Log New Meal
        </h3>

        {/* Quick Camera Button */}
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setShowCamera(true)}
            className="btn"
            style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
              color: 'white', 
              border: 'none',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              margin: '0 auto'
            }}
          >
            <Camera size={20} style={{ marginRight: '8px' }} />
            📸 Take Photo of Food
          </button>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            Point your camera at food for instant AI recognition
          </p>
        </div>

        {message && (
          <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        {/* AI Food Recognition Section */}
        <div className="card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <div className="flex flex-between mb-4">
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <Sparkles size={24} style={{ marginRight: '8px' }} />
              AI Food Recognition
            </h3>
            <button
              type="button"
              onClick={() => setShowAiSection(!showAiSection)}
              className="btn"
              style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              {showAiSection ? 'Hide' : 'Show'} AI
            </button>
          </div>
          
          {showAiSection && (
            <div>
              <p style={{ marginBottom: '16px', opacity: 0.9 }}>
                Describe your food in natural language or take a photo to let AI extract the nutritional information!
              </p>
              
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}
                >
                  <Camera size={18} style={{ marginRight: '8px' }} />
                  Take Photo
                </button>
              </div>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  className="form-input"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="e.g., 'grilled chicken breast with rice and broccoli'"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={recognizeFoodWithAI}
                  disabled={aiLoading || !aiInput.trim()}
                  className="btn"
                  style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}
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
                  <h4 style={{ margin: '0 0 12px 0' }}>AI Recognition Result</h4>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.9 }}>
                    Found {aiResult.length} food item{aiResult.length > 1 ? 's' : ''}. Click on any item to use it:
                  </p>
                  
                  {aiResult.map((food, index) => (
                    <div key={index} style={{ 
                      marginBottom: '12px', 
                      padding: '12px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.05)'}
                    onClick={() => handleFoodItemClick(index)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h5 style={{ margin: 0, color: '#fff' }}>{food.name}</h5>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>{food.confidence}% confidence</span>
                      </div>
                      <div className="grid grid-3" style={{ fontSize: '12px', opacity: 0.9 }}>
                        <div><strong>Quantity:</strong> {food.quantity} {food.unit}</div>
                        <div><strong>Calories:</strong> {food.calories} cal</div>
                        <div><strong>Protein:</strong> {food.protein}g</div>
                        <div><strong>Carbs:</strong> {food.carbs}g</div>
                        <div><strong>Fat:</strong> {food.fat}g</div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '11px'
                          }}>
                            Click to use
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <form onSubmit={logMeal}>
          <div className="form-group">
            <label className="form-label">Search Food Database</label>
            <div className="food-search">
              <input
                type="text"
                className="form-input"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search for food items..."
              />
              {foodResults.length > 0 && (
                <div className="food-results">
                  {foodResults.map(food => (
                    <div
                      key={food.id}
                      className="food-result-item"
                      onClick={() => selectFood(food)}
                    >
                      <div className="food-name">{food.name}</div>
                      <div className="food-macros">
                        {food.calories_per_100g} cal, {food.protein_per_100g}g protein, {food.carbs_per_100g}g carbs, {food.fat_per_100g}g fat per 100g
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedFood && (
            <>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    min="0.1"
                    step="0.1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select
                    className="form-select"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="g">Grams (g)</option>
                    <option value="kg">Kilograms (kg)</option>
                    <option value="oz">Ounces (oz)</option>
                    <option value="lb">Pounds (lb)</option>
                    <option value="cup">Cups</option>
                    <option value="tbsp">Tablespoons</option>
                    <option value="tsp">Teaspoons</option>
                    <option value="piece">Pieces</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select
                  className="form-select"
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <button type="submit" className="btn" disabled={loading}>
                {loading ? 'Logging...' : 'Log Meal'}
              </button>
            </>
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
