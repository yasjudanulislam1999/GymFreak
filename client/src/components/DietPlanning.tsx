import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Target, Calendar, Utensils, TrendingUp, Loader } from 'lucide-react';

const DietPlanning: React.FC = () => {
  const { user } = useAuth();
  const [goal, setGoal] = useState('maintain');
  const [dietPlan, setDietPlan] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateDietPlan = async () => {
    if (!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) {
      setError('Please complete your profile first to get a personalized diet plan.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/ai/diet-plan', { goal });
      setDietPlan(response.data.dietPlan);
    } catch (error) {
      console.error('Failed to generate diet plan:', error);
      setError('Failed to generate diet plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-center mb-4">AI Diet Planning</h1>
      
      {/* User Profile Summary */}
      <div className="card mb-4">
        <h3 className="mb-4">
          <Target size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Your Profile Summary
        </h3>
        <div className="grid grid-2">
          <div>
            <strong>Name:</strong> {user?.name || 'Not set'}
          </div>
          <div>
            <strong>Height:</strong> {user?.height ? `${user.height} cm` : 'Not set'}
          </div>
          <div>
            <strong>Weight:</strong> {user?.weight ? `${user.weight} kg` : 'Not set'}
          </div>
          <div>
            <strong>Age:</strong> {user?.age ? `${user.age} years` : 'Not set'}
          </div>
          <div>
            <strong>Gender:</strong> {user?.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : 'Not set'}
          </div>
          <div>
            <strong>Activity Level:</strong> {user?.activityLevel ? user.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Not set'}
          </div>
        </div>
        {(!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) && (
          <div className="mt-4 p-3" style={{ background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeaa7' }}>
            <strong>Note:</strong> Complete your profile for personalized diet planning!
          </div>
        )}
      </div>

      {/* Goal Selection */}
      <div className="card mb-4">
        <h3 className="mb-4">
          <Calendar size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Select Your Goal
        </h3>
        <div className="grid grid-3">
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="goal"
              value="maintain"
              checked={goal === 'maintain'}
              onChange={(e) => setGoal(e.target.value)}
              className="mr-2"
            />
            <div>
              <strong>Maintain Weight</strong>
              <div className="text-sm text-gray-600">Keep current weight</div>
            </div>
          </label>
          
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="goal"
              value="lose"
              checked={goal === 'lose'}
              onChange={(e) => setGoal(e.target.value)}
              className="mr-2"
            />
            <div>
              <strong>Lose Weight</strong>
              <div className="text-sm text-gray-600">Healthy weight loss</div>
            </div>
          </label>
          
          <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="goal"
              value="gain"
              checked={goal === 'gain'}
              onChange={(e) => setGoal(e.target.value)}
              className="mr-2"
            />
            <div>
              <strong>Gain Weight</strong>
              <div className="text-sm text-gray-600">Muscle building</div>
            </div>
          </label>
        </div>
        
        <div className="mt-4">
          <button
            onClick={generateDietPlan}
            disabled={loading || (!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel)}
            className="btn w-full"
          >
            {loading ? (
              <>
                <Loader className="animate-spin mr-2" size={16} />
                Generating Diet Plan...
              </>
            ) : (
              <>
                <Utensils size={16} className="mr-2" />
                Generate Personalized Diet Plan
              </>
            )}
          </button>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Generated Diet Plan */}
      {dietPlan && (
        <div className="card">
          <h3 className="mb-4">
            <TrendingUp size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Your Personalized Diet Plan
          </h3>
          <div 
            className="prose max-w-none"
            style={{ 
              whiteSpace: 'pre-line',
              lineHeight: '1.6',
              fontSize: '14px'
            }}
          >
            {dietPlan}
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <strong>💡 Tip:</strong> This diet plan is generated based on your current profile and nutrition data. 
            For best results, consult with a healthcare professional before making significant dietary changes.
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mt-4">
        <h3 className="mb-4">Quick Actions</h3>
        <div className="grid grid-2">
          <a href="/meals" className="btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
            <Utensils size={24} style={{ marginBottom: '8px' }} />
            <div>Log Meals</div>
          </a>
          
          <a href="/ai-coach" className="btn" style={{ textDecoration: 'none', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}>
            <Target size={24} style={{ marginBottom: '8px' }} />
            <div>AI Coach</div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DietPlanning;
