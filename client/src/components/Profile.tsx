import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Ruler, Weight, Calendar, Users, Activity, Save } from 'lucide-react';
import theme from '../theme';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: '',
    activityLevel: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        height: user.height?.toString() || '',
        weight: user.weight?.toString() || '',
        age: user.age?.toString() || '',
        gender: user.gender || '',
        activityLevel: user.activityLevel || ''
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const profileData = {
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        gender: formData.gender || undefined,
        activityLevel: formData.activityLevel || undefined,
      };

      await updateProfile(profileData);
      setMessage('Profile updated successfully!');
    } catch (error: any) {
      setMessage('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: theme.spacing.xl,
        color: theme.colors.primary.text,
        fontSize: theme.typography.fontSize.title,
        fontFamily: theme.typography.fontFamily.bold,
        fontWeight: theme.typography.fontWeight.bold
      }}>
        Profile Settings
      </h1>
      
      {/* Personal Information Card */}
      <div style={{
        background: theme.colors.primary.surface,
        border: `1px solid ${theme.colors.primary.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        boxShadow: theme.shadows.normal.sm
      }}>
        <h3 style={{
          marginBottom: theme.spacing.lg,
          color: theme.colors.primary.text,
          fontSize: theme.typography.fontSize.subtitle,
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: theme.typography.fontWeight.semiBold,
          display: 'flex',
          alignItems: 'center'
        }}>
          <User size={24} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
          Personal Information
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: theme.spacing.lg
        }}>
          <div style={{
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.body,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Name:</strong> 
            <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
              {user?.name || 'Not provided'}
            </span>
          </div>
          <div style={{
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.body,
            fontFamily: theme.typography.fontFamily.primary
          }}>
            <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Email:</strong> 
            <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Physical Information Card */}
      <div style={{
        background: theme.colors.primary.surface,
        border: `1px solid ${theme.colors.primary.border}`,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        boxShadow: theme.shadows.normal.sm
      }}>
        <h3 style={{
          marginBottom: theme.spacing.lg,
          color: theme.colors.primary.text,
          fontSize: theme.typography.fontSize.subtitle,
          fontFamily: theme.typography.fontFamily.bold,
          fontWeight: theme.typography.fontWeight.semiBold,
          display: 'flex',
          alignItems: 'center'
        }}>
          <Activity size={24} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
          Physical Information
        </h3>

        {message && (
          <div style={{
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.lg,
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

        <form onSubmit={handleSubmit}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg
          }}>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
                color: theme.colors.primary.text,
                fontSize: theme.typography.fontSize.bodySmall,
                fontFamily: theme.typography.fontFamily.primary,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                <Ruler size={16} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
                Height (cm)
              </label>
              <input
                type="number"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
                min="100"
                max="250"
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
                display: 'flex',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
                color: theme.colors.primary.text,
                fontSize: theme.typography.fontSize.bodySmall,
                fontFamily: theme.typography.fontFamily.primary,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                <Weight size={16} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="70"
                min="30"
                max="300"
                step="0.1"
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
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg
          }}>
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
                color: theme.colors.primary.text,
                fontSize: theme.typography.fontSize.bodySmall,
                fontFamily: theme.typography.fontFamily.primary,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                <Calendar size={16} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
                Age
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="25"
                min="13"
                max="120"
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
                display: 'flex',
                alignItems: 'center',
                marginBottom: theme.spacing.sm,
                color: theme.colors.primary.text,
                fontSize: theme.typography.fontSize.bodySmall,
                fontFamily: theme.typography.fontFamily.primary,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                <Users size={16} style={{ marginRight: theme.spacing.sm, color: theme.colors.primary.accent }} />
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
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
                <option value="" style={{ color: theme.colors.primary.textSecondary }}>Select gender</option>
                <option value="male" style={{ color: theme.colors.primary.text }}>Male</option>
                <option value="female" style={{ color: theme.colors.primary.text }}>Female</option>
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
              Activity Level
            </label>
            <select
              name="activityLevel"
              value={formData.activityLevel}
              onChange={handleChange}
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
              <option value="" style={{ color: theme.colors.primary.textSecondary }}>Select activity level</option>
              <option value="sedentary" style={{ color: theme.colors.primary.text }}>Sedentary (little to no exercise)</option>
              <option value="light" style={{ color: theme.colors.primary.text }}>Light (light exercise 1-3 days/week)</option>
              <option value="moderate" style={{ color: theme.colors.primary.text }}>Moderate (moderate exercise 3-5 days/week)</option>
              <option value="active" style={{ color: theme.colors.primary.text }}>Active (heavy exercise 6-7 days/week)</option>
              <option value="very_active" style={{ color: theme.colors.primary.text }}>Very Active (very heavy exercise, physical job)</option>
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
            <Save size={16} />
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* TDEE Information */}
      {user?.height && user?.weight && user?.age && user?.gender && user?.activityLevel && (
        <div style={{
          background: theme.colors.primary.surface,
          border: `1px solid ${theme.colors.primary.accent}`,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          boxShadow: theme.shadows.glow.accent
        }}>
          <h3 style={{
            marginBottom: theme.spacing.lg,
            color: theme.colors.primary.text,
            fontSize: theme.typography.fontSize.subtitle,
            fontFamily: theme.typography.fontFamily.bold,
            fontWeight: theme.typography.fontWeight.semiBold
          }}>
            Your TDEE Calculation
          </h3>
          <p style={{
            marginBottom: theme.spacing.lg,
            color: theme.colors.primary.textSecondary,
            fontSize: theme.typography.fontSize.bodySmall,
            fontFamily: theme.typography.fontFamily.primary,
            lineHeight: theme.typography.lineHeight.normal
          }}>
            Based on your profile information, your Total Daily Energy Expenditure (TDEE) is calculated using the Mifflin-St Jeor equation.
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg
          }}>
            <div style={{
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.primary
            }}>
              <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Height:</strong> 
              <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
                {user.height} cm
              </span>
            </div>
            <div style={{
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.primary
            }}>
              <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Weight:</strong> 
              <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
                {user.weight} kg
              </span>
            </div>
            <div style={{
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.primary
            }}>
              <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Age:</strong> 
              <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
                {user.age} years
              </span>
            </div>
            <div style={{
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.primary
            }}>
              <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Gender:</strong> 
              <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
                {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
              </span>
            </div>
            <div style={{
              color: theme.colors.primary.text,
              fontSize: theme.typography.fontSize.body,
              fontFamily: theme.typography.fontFamily.primary,
              gridColumn: '1 / -1'
            }}>
              <strong style={{ color: theme.colors.primary.text, fontWeight: theme.typography.fontWeight.semiBold }}>Activity Level:</strong> 
              <span style={{ color: theme.colors.primary.textSecondary, marginLeft: theme.spacing.sm }}>
                {user.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
