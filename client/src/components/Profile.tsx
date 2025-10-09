import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Ruler, Weight, Calendar, Users, Activity, Save } from 'lucide-react';

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
    <div>
      <h1 className="text-center mb-4">Profile Settings</h1>
      
      <div className="card">
        <h3 className="mb-4">
          <User size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Personal Information
        </h3>
        
        <div className="grid grid-2">
          <div>
            <strong>Name:</strong> {user?.name}
          </div>
          <div>
            <strong>Email:</strong> {user?.email}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4">
          <Activity size={24} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Physical Information
        </h3>

        {message && (
          <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <Ruler size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Height (cm)
              </label>
              <input
                type="number"
                name="height"
                className="form-input"
                value={formData.height}
                onChange={handleChange}
                placeholder="170"
                min="100"
                max="250"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Weight size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                className="form-input"
                value={formData.weight}
                onChange={handleChange}
                placeholder="70"
                min="30"
                max="300"
                step="0.1"
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">
                <Calendar size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Age
              </label>
              <input
                type="number"
                name="age"
                className="form-input"
                value={formData.age}
                onChange={handleChange}
                placeholder="25"
                min="13"
                max="120"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Users size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Gender
              </label>
              <select
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Activity Level</label>
            <select
              name="activityLevel"
              className="form-select"
              value={formData.activityLevel}
              onChange={handleChange}
            >
              <option value="">Select activity level</option>
              <option value="sedentary">Sedentary (little to no exercise)</option>
              <option value="light">Light (light exercise 1-3 days/week)</option>
              <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
              <option value="active">Active (heavy exercise 6-7 days/week)</option>
              <option value="very_active">Very Active (very heavy exercise, physical job)</option>
            </select>
          </div>

          <button 
            type="submit" 
            className="btn" 
            disabled={loading}
          >
            <Save size={16} style={{ marginRight: '8px' }} />
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>

      {/* TDEE Information */}
      {user?.height && user?.weight && user?.age && user?.gender && user?.activityLevel && (
        <div className="card">
          <h3 className="mb-4">Your TDEE Calculation</h3>
          <p className="text-muted mb-4">
            Based on your profile information, your Total Daily Energy Expenditure (TDEE) is calculated using the Mifflin-St Jeor equation.
          </p>
          <div className="grid grid-2">
            <div>
              <strong>Height:</strong> {user.height} cm
            </div>
            <div>
              <strong>Weight:</strong> {user.weight} kg
            </div>
            <div>
              <strong>Age:</strong> {user.age} years
            </div>
            <div>
              <strong>Gender:</strong> {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
            </div>
            <div>
              <strong>Activity Level:</strong> {user.activityLevel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
