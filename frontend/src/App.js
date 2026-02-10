import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from './components/ui/sonner';

// Pages
import Dashboard from './pages/Dashboard';
import BusinessOutcomes from './pages/BusinessOutcomes';
import ProjectDetail from './pages/ProjectDetail';
import StrategicInitiativeDetail from './pages/StrategicInitiativeDetail';
import StrategicInitiativeForm from './pages/StrategicInitiativeForm';
import Reporting from './pages/Reporting';
import ExecutiveDashboard from './pages/ExecutiveDashboard';
import DeliveryPipeline from './pages/DeliveryPipeline';
import Layout from './components/Layout';

import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context - Default admin user (no login required)
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Store token for API calls
let authToken = null;

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

const AuthProvider = ({ children }) => {
  // Default admin user - no login required
  const [user, setUser] = useState({
    id: 'default-admin',
    name: 'Admin',
    email: 'admin@coderedinitiatives.com',
    role: 'admin'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-login as admin on app load
    const autoLogin = async () => {
      try {
        // Try to login with default admin credentials
        const res = await axios.post(`${API}/auth/login`, {
          email: 'admin@test.com',
          password: 'password123'
        });
        authToken = res.data.token;
        setUser(res.data.user);
      } catch (error) {
        // If login fails, try to register and login
        try {
          await axios.post(`${API}/auth/register`, {
            name: 'Admin',
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin'
          });
          const res = await axios.post(`${API}/auth/login`, {
            email: 'admin@test.com',
            password: 'password123'
          });
          authToken = res.data.token;
          setUser(res.data.user);
        } catch (e) {
          console.log('Auto-login failed, using default user context');
        }
      }
      setLoading(false);
    };
    
    autoLogin();
  }, []);

  const logout = () => {
    // No-op since we don't have login
  };

  return (
    <AuthContext.Provider value={{ user, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route
            path="/*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/business-outcomes" element={<BusinessOutcomes />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/strategic-initiatives/new" element={<StrategicInitiativeForm />} />
                  <Route path="/strategic-initiatives/:id" element={<StrategicInitiativeDetail />} />
                  <Route path="/reporting" element={<Reporting />} />
                  <Route path="/executive" element={<ExecutiveDashboard />} />
                  <Route path="/delivery-pipeline" element={<DeliveryPipeline />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
