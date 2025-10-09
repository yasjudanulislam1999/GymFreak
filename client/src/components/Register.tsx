import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, User, Lock, Mail, Ruler, Weight, Calendar, Users } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    height: '',
    weight: '',
    age: '',
    gender: '',
    activityLevel: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = {
        ...formData,
        height: formData.height ? parseFloat(formData.height) : undefined,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
      };
      await register(userData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">
          <UserPlus size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
          Join GymFreak
        </h1>
        <p className="auth-subtitle">Create your account to start tracking your fitness journey</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Mail size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Email
            </label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Password
            </label>
            <input
              type="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Create a password"
            />
          </div>

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
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-link">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
