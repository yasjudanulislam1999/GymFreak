import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import MealLogging from './components/MealLogging';
import NutritionSummary from './components/NutritionSummary';
import AICoach from './components/AICoach';
import DietPlanning from './components/DietPlanning';
import Navigation from './components/Navigation';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './App.css';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        {user && <Navigation />}
        <main className="container" style={{ paddingTop: user ? '80px' : '0' }}>
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/register" 
              element={user ? <Navigate to="/dashboard" /> : <Register />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/meals" 
              element={user ? <MealLogging /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/nutrition" 
              element={user ? <NutritionSummary /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/ai-coach" 
              element={user ? <AICoach /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/diet-planning" 
              element={user ? <DietPlanning /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/" 
              element={<Navigate to={user ? "/dashboard" : "/login"} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
