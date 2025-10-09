import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Flame, Target, TrendingUp, Calendar, Bot, Utensils } from 'lucide-react';

interface TDEE {
  tdee: number;
}

interface NutritionSummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [tdee, setTdee] = useState<number>(0);
  const [nutritionSummary, setNutritionSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileResponse, nutritionResponse] = await Promise.all([
          axios.get('/api/profile'),
          axios.get('/api/nutrition/summary')
        ]);

        setTdee(profileResponse.data.tdee);
        setNutritionSummary(nutritionResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <h2>Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  const caloriesConsumed = nutritionSummary?.total_calories || 0;
  const caloriesRemaining = Math.max(0, tdee - caloriesConsumed);
  const proteinConsumed = nutritionSummary?.total_protein || 0;
  const carbsConsumed = nutritionSummary?.total_carbs || 0;
  const fatConsumed = nutritionSummary?.total_fat || 0;

  return (
    <div>
      <h1 className="text-center mb-4">Dashboard</h1>
      
      {/* TDEE Display */}
      <div className="tdee-display">
        <h2>Your Daily Calorie Goal</h2>
        <div className="tdee-value">{tdee.toLocaleString()}</div>
        <div className="tdee-label">calories per day</div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value" style={{ color: caloriesConsumed > tdee ? '#dc3545' : '#28a745' }}>
            {caloriesConsumed.toLocaleString()}
          </div>
          <div className="stat-label">Calories Consumed</div>
        </div>

        <div className="stat-card">
          <div className="stat-value" style={{ color: caloriesRemaining > 0 ? '#28a745' : '#dc3545' }}>
            {caloriesRemaining.toLocaleString()}
          </div>
          <div className="stat-label">Calories Remaining</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{proteinConsumed.toFixed(1)}g</div>
          <div className="stat-label">Protein</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{carbsConsumed.toFixed(1)}g</div>
          <div className="stat-label">Carbs</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{fatConsumed.toFixed(1)}g</div>
          <div className="stat-label">Fat</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            {tdee > 0 ? Math.round((caloriesConsumed / tdee) * 100) : 0}%
          </div>
          <div className="stat-label">Goal Progress</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="mb-4">Quick Actions</h3>
        <div className="grid grid-2">
          <a href="/meals" className="btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            <Flame size={24} style={{ marginBottom: '8px' }} />
            <div>Log Meal</div>
          </a>
          
          <a href="/ai-coach" className="btn" style={{ textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
            <Bot size={24} style={{ marginBottom: '8px' }} />
            <div>AI Coach</div>
          </a>
          
          <a href="/diet-planning" className="btn" style={{ textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: 'none' }}>
            <Utensils size={24} style={{ marginBottom: '8px' }} />
            <div>Diet Planning</div>
          </a>
          
          <a href="/profile" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            <Target size={24} style={{ marginBottom: '8px' }} />
            <div>Update Profile</div>
          </a>
          
          <a href="/nutrition" className="btn btn-secondary" style={{ textDecoration: 'none', textAlign: 'center' }}>
            <TrendingUp size={24} style={{ marginBottom: '8px' }} />
            <div>View Nutrition</div>
          </a>
        </div>
      </div>

      {/* Profile Completion Notice */}
      {(!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) && (
        <div className="card" style={{ background: '#fff3cd', border: '1px solid #ffeaa7' }}>
          <h3 style={{ color: '#856404', marginBottom: '12px' }}>
            Complete Your Profile
          </h3>
          <p style={{ color: '#856404', marginBottom: '16px' }}>
            To get accurate TDEE calculations, please complete your profile with your height, weight, age, gender, and activity level.
          </p>
          <a href="/profile" className="btn" style={{ textDecoration: 'none' }}>
            Complete Profile
          </a>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
