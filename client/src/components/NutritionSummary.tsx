import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Calendar, TrendingUp, Target, Flame } from 'lucide-react';

interface NutritionData {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

// interface TDEE {
//   tdee: number;
// }

const NutritionSummary: React.FC = () => {
  const [nutritionData, setNutritionData] = useState<NutritionData | null>(null);
  const [tdee, setTdee] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const [nutritionResponse, profileResponse] = await Promise.all([
        axios.get(`/api/nutrition/summary?date=${selectedDate}`),
        axios.get('/api/profile')
      ]);

      setNutritionData(nutritionResponse.data);
      setTdee(profileResponse.data.tdee);
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <h2>Loading nutrition data...</h2>
        </div>
      </div>
    );
  }

  const calories = nutritionData?.total_calories || 0;
  const protein = nutritionData?.total_protein || 0;
  const carbs = nutritionData?.total_carbs || 0;
  const fat = nutritionData?.total_fat || 0;

  // Calculate calories from macros
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

  // Chart data
  const macroData = [
    { name: 'Protein', value: protein, calories: proteinCalories, color: '#8884d8' },
    { name: 'Carbs', value: carbs, calories: carbsCalories, color: '#82ca9d' },
    { name: 'Fat', value: fat, calories: fatCalories, color: '#ffc658' }
  ];

  const calorieData = [
    { name: 'Consumed', value: calories, color: '#667eea' },
    { name: 'Remaining', value: Math.max(0, tdee - calories), color: '#e1e5e9' }
  ];

  const calorieProgress = tdee > 0 ? (calories / tdee) * 100 : 0;

  return (
    <div>
      <h1 className="text-center mb-4">Nutrition Summary</h1>

      {/* Date Selector */}
      <div className="card">
        <div className="flex flex-between">
          <h3>
            <Calendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            {formatDate(selectedDate)}
          </h3>
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ width: 'auto' }}
          />
        </div>
      </div>

      {/* Calorie Overview */}
      <div className="card">
        <h3 className="mb-4">
          <Flame size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Calorie Overview
        </h3>
        
        <div className="grid grid-2">
          <div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#667eea' }}>
                {calories.toLocaleString()}
              </div>
              <div className="stat-label">Calories Consumed</div>
            </div>
          </div>
          
          <div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#28a745' }}>
                {Math.max(0, tdee - calories).toLocaleString()}
              </div>
              <div className="stat-label">Calories Remaining</div>
            </div>
          </div>
        </div>

        {/* Calorie Progress Bar */}
        <div className="mt-4">
          <div className="flex flex-between mb-2">
            <span>Daily Goal Progress</span>
            <span>{calorieProgress.toFixed(1)}%</span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '20px', 
            backgroundColor: '#e1e5e9', 
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${Math.min(calorieProgress, 100)}%`,
              height: '100%',
              backgroundColor: calorieProgress > 100 ? '#dc3545' : '#667eea',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <div className="text-center mt-2 text-muted">
            Goal: {tdee.toLocaleString()} calories
          </div>
        </div>
      </div>

      {/* Macronutrients */}
      <div className="card">
        <h3 className="mb-4">
          <TrendingUp size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Macronutrients
        </h3>

        <div className="grid grid-3">
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#8884d8' }}>
              {protein.toFixed(1)}g
            </div>
            <div className="stat-label">Protein</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>
              {proteinCalories.toFixed(0)} cal
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: '#82ca9d' }}>
              {carbs.toFixed(1)}g
            </div>
            <div className="stat-label">Carbohydrates</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>
              {carbsCalories.toFixed(0)} cal
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-value" style={{ color: '#ffc658' }}>
              {fat.toFixed(1)}g
            </div>
            <div className="stat-label">Fat</div>
            <div className="text-muted" style={{ fontSize: '12px' }}>
              {fatCalories.toFixed(0)} cal
            </div>
          </div>
        </div>

        {/* Macro Distribution Chart */}
        <div style={{ height: '300px', marginTop: '24px' }}>
          <h4 className="text-center mb-4">Macro Distribution</h4>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={macroData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {macroData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}g`, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Goal vs Consumed */}
      <div className="card">
        <h3 className="mb-4">
          <Target size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Daily Goal vs Consumed
        </h3>

        <div style={{ height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={calorieData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}`, 'Calories']} />
              <Bar dataKey="value" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="card">
        <h3 className="mb-4">Summary</h3>
        <div className="grid grid-2">
          <div>
            <strong>Total Calories:</strong> {calories.toLocaleString()}
          </div>
          <div>
            <strong>Daily Goal:</strong> {tdee.toLocaleString()}
          </div>
          <div>
            <strong>Protein:</strong> {protein.toFixed(1)}g ({((proteinCalories / totalMacroCalories) * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Carbs:</strong> {carbs.toFixed(1)}g ({((carbsCalories / totalMacroCalories) * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Fat:</strong> {fat.toFixed(1)}g ({((fatCalories / totalMacroCalories) * 100).toFixed(1)}%)
          </div>
          <div>
            <strong>Goal Status:</strong> 
            <span style={{ 
              color: calorieProgress > 100 ? '#dc3545' : calorieProgress >= 90 ? '#28a745' : '#ffc107',
              marginLeft: '8px'
            }}>
              {calorieProgress > 100 ? 'Over Goal' : calorieProgress >= 90 ? 'On Track' : 'Under Goal'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionSummary;
