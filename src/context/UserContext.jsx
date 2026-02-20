import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext();

const API_URL = 'http://192.168.0.121:5000/api'; // ✅ Local IP for backend

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [allTransactions, setAllTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Load user, token, and transactions from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('token');
    const savedTransactions = localStorage.getItem('allTransactions');
    
    if (savedUser && savedToken) {
      setCurrentUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    
    if (savedTransactions) {
      setAllTransactions(JSON.parse(savedTransactions));
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('allTransactions', JSON.stringify(allTransactions));
  }, [allTransactions]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        const user = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          phone: data.user.phone,
          companyName: data.user.companyName || 'SmartBudget'
        };
        setCurrentUser(user);
        setToken(data.token);
        return user;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: userData.fullName,
          email: userData.email,
          password: userData.password,
          phone: userData.phone || null
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data.success) {
        const user = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName,
          phone: data.user.phone,
          companyName: data.user.companyName || 'SmartBudget'
        };
        setCurrentUser(user);
        setToken(data.token);
        return user;
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const forgotPassword = async (email) => {
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send reset email');
      return data;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const response = await fetch(`${API_URL}/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to reset password');
      return data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    setAllTransactions([]);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('allTransactions');
  };

  const addTransaction = async (transaction) => {
    if (!currentUser || !token) throw new Error('No user logged in');
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transaction),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add transaction');
      if (data.success) {
        setAllTransactions(prev => [data.data, ...prev]);
        return data.data;
      }
    } catch (error) {
      console.error('Add transaction error:', error);
      throw error;
    }
  };

  const getUserTransactions = async () => {
    if (!currentUser || !token) return [];
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch transactions');
      if (data.success) {
        setAllTransactions(data.data);
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Fetch transactions error:', error);
      return allTransactions;
    }
  };

  const updateTransaction = async (transactionId, updatedData) => {
    if (!token) throw new Error('No authentication token');
    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update transaction');
      if (data.success) {
        setAllTransactions(prev => prev.map(txn => txn.id === transactionId ? data.data : txn));
        return data.data;
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      throw error;
    }
  };

  const deleteTransaction = async (transactionId) => {
    if (!token) throw new Error('No authentication token');
    try {
      const response = await fetch(`${API_URL}/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete transaction');
      if (data.success) {
        setAllTransactions(prev => prev.filter(txn => txn.id !== transactionId));
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      throw error;
    }
  };

  const updateCompanyName = (newName) => {
    if (!currentUser) return;
    setCurrentUser(prev => ({ ...prev, companyName: newName }));
  };

  const value = {
    currentUser,
    isLoading,
    token,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    addTransaction,
    getUserTransactions,
    updateTransaction,
    deleteTransaction,
    updateCompanyName,
    totalTransactions: allTransactions.length
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}

export default UserContext;