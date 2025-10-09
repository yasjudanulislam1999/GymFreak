import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Home, Utensils, BarChart3, Bot, Target } from 'lucide-react';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/profile', label: 'Profile', icon: User },
    { path: '/meals', label: 'Meals', icon: Utensils },
    { path: '/nutrition', label: 'Nutrition', icon: BarChart3 },
    { path: '/ai-coach', label: 'AI Coach', icon: Bot },
    { path: '/diet-planning', label: 'Diet Planning', icon: Target },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <Link to="/dashboard" className="logo">
          GymFreak
        </Link>
        
        <ul className="nav-links">
          {navItems.map(({ path, label, icon: Icon }) => (
            <li key={path}>
              <Link 
                to={path} 
                className={location.pathname === path ? 'active' : ''}
              >
                <Icon size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <span className="text-muted">Welcome, {user?.name}</span>
          <button onClick={logout} className="logout-btn">
            <LogOut size={16} style={{ marginRight: '4px' }} />
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
