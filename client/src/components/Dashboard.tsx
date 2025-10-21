import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { Flame, Target, TrendingUp, Bot, Utensils } from 'lucide-react';
import theme from '../theme';

// interface TDEE {
//   tdee: number;
// }

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
          <h2 className="text-title" style={{ color: theme.colors.primary.text }}>Loading dashboard...</h2>
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
    <div style={{ padding: '20px', background: theme.colors.primary.background, minHeight: '100vh' }}>
      <h1 className="text-center mb-4 text-title" style={{ 
        color: theme.colors.primary.text, 
        marginBottom: theme.spacing.lg,
        fontFamily: theme.typography.fontFamily.bold 
      }}>
        Dashboard
      </h1>
      
      {/* TDEE Display */}
      <div style={{
        background: theme.gradients.accent,
        color: theme.colors.primary.text,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.lg,
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        boxShadow: theme.shadows.glow.accent
      }}>
        <h2 style={{ 
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.fontSize.subtitle,
          marginBottom: theme.spacing.md 
        }}>
          Your Daily Calorie Goal
        </h2>
        <div style={{ 
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: '48px',
          fontWeight: theme.typography.fontWeight.bold,
          margin: `${theme.spacing.md} 0`,
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {tdee.toLocaleString()}
        </div>
        <div style={{ 
          fontSize: theme.typography.fontSize.body,
          opacity: 0.9,
          fontFamily: theme.typography.fontFamily.primary
        }}>
          calories per day
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing.xl
      }}>
        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: caloriesConsumed > tdee ? theme.colors.primary.error : theme.colors.primary.accent,
            marginBottom: theme.spacing.sm
          }}>
            {caloriesConsumed.toLocaleString()}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Calories Consumed
          </div>
        </div>

        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: caloriesRemaining > 0 ? theme.colors.primary.accent : theme.colors.primary.error,
            marginBottom: theme.spacing.sm
          }}>
            {caloriesRemaining.toLocaleString()}
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Calories Remaining
          </div>
        </div>

        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary.accent,
            marginBottom: theme.spacing.sm
          }}>
            {proteinConsumed.toFixed(1)}g
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Protein
          </div>
        </div>

        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary.accentSecondary,
            marginBottom: theme.spacing.sm
          }}>
            {carbsConsumed.toFixed(1)}g
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Carbs
          </div>
        </div>

        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary.accent,
            marginBottom: theme.spacing.sm
          }}>
            {fatConsumed.toFixed(1)}g
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Fat
          </div>
        </div>

        <div className="card" style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.border}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          <div style={{ 
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: '32px',
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.primary.accent,
            marginBottom: theme.spacing.sm
          }}>
            {tdee > 0 ? Math.round((caloriesConsumed / tdee) * 100) : 0}%
          </div>
          <div style={{ 
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontFamily: theme.typography.fontFamily.primary
          }}>
            Goal Progress
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{
        background: theme.colors.primary.surface,
        border: `1px solid ${theme.colors.primary.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg
      }}>
        <h3 style={{ 
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.fontSize.subtitle,
          color: theme.colors.primary.text,
          marginBottom: theme.spacing.lg
        }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: theme.spacing.md
        }}>
          <a href="/meals" style={{ 
            textDecoration: 'none', 
            textAlign: 'center',
            background: theme.gradients.accent,
            color: theme.colors.primary.text,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            transition: 'all 0.3s ease',
            boxShadow: theme.shadows.glow.accent,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <Flame size={24} />
            <div>Log Meal</div>
          </a>
          
          <a href="/ai-coach" style={{ 
            textDecoration: 'none', 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${theme.colors.primary.accentSecondary}, #00BFA6)`,
            color: theme.colors.primary.text,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            transition: 'all 0.3s ease',
            boxShadow: theme.shadows.glow.blue,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <Bot size={24} />
            <div>AI Coach</div>
          </a>
          
          <a href="/diet-planning" style={{ 
            textDecoration: 'none', 
            textAlign: 'center',
            background: `linear-gradient(135deg, #f093fb, #f5576c)`,
            color: theme.colors.primary.text,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <Utensils size={24} />
            <div>Diet Planning</div>
          </a>
          
          <a href="/profile" style={{ 
            textDecoration: 'none', 
            textAlign: 'center',
            background: 'transparent',
            color: theme.colors.primary.accent,
            border: `2px solid ${theme.colors.primary.accent}`,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <Target size={24} />
            <div>Update Profile</div>
          </a>
          
          <a href="/nutrition" style={{ 
            textDecoration: 'none', 
            textAlign: 'center',
            background: 'transparent',
            color: theme.colors.primary.accent,
            border: `2px solid ${theme.colors.primary.accent}`,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            transition: 'all 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <TrendingUp size={24} />
            <div>View Nutrition</div>
          </a>
        </div>
      </div>

      {/* Profile Completion Notice */}
      {(!user?.height || !user?.weight || !user?.age || !user?.gender || !user?.activityLevel) && (
        <div className="card" style={{ 
          background: `linear-gradient(135deg, ${theme.colors.primary.surface}, ${theme.colors.primary.border})`,
          border: `2px solid ${theme.colors.primary.accent}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          boxShadow: theme.shadows.glow.accent
        }}>
          <h3 style={{ 
            color: theme.colors.primary.accent, 
            marginBottom: theme.spacing.md,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.fontSize.subtitle
          }}>
            Complete Your Profile
          </h3>
          <p style={{ 
            color: theme.colors.primary.textSecondary, 
            marginBottom: theme.spacing.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontSize: theme.typography.fontSize.body
          }}>
            To get accurate TDEE calculations, please complete your profile with your height, weight, age, gender, and activity level.
          </p>
          <a href="/profile" style={{ 
            textDecoration: 'none',
            background: theme.gradients.accent,
            color: theme.colors.primary.text,
            padding: `${theme.spacing.md} ${theme.spacing.lg}`,
            borderRadius: theme.borderRadius.lg,
            fontFamily: theme.typography.fontFamily.primary,
            fontWeight: theme.typography.fontWeight.semiBold,
            fontSize: theme.typography.fontSize.button,
            display: 'inline-block',
            transition: 'all 0.3s ease',
            boxShadow: theme.shadows.glow.accent
          }}>
            Complete Profile
          </a>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
