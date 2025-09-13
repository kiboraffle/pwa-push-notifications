import React, { createContext, useContext, useState } from 'react';
import { Backdrop, CircularProgress, Typography, Box } from '@mui/material';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('');

  const setLoading = (key, isLoading, message = '') => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading ? { loading: true, message } : undefined
    }));
  };

  const isLoading = (key) => {
    return loadingStates[key]?.loading || false;
  };

  const getLoadingMessage = (key) => {
    return loadingStates[key]?.message || '';
  };

  const setGlobalLoadingState = (isLoading, message = 'Loading...') => {
    setGlobalLoading(isLoading);
    setGlobalLoadingMessage(message);
  };

  const clearLoading = (key) => {
    setLoadingStates(prev => {
      const newState = { ...prev };
      delete newState[key];
      return newState;
    });
  };

  const clearAllLoading = () => {
    setLoadingStates({});
    setGlobalLoading(false);
  };

  // Check if any loading state is active
  const hasAnyLoading = () => {
    return Object.values(loadingStates).some(state => state?.loading) || globalLoading;
  };

  const value = {
    setLoading,
    isLoading,
    getLoadingMessage,
    setGlobalLoadingState,
    clearLoading,
    clearAllLoading,
    hasAnyLoading,
    globalLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
      
      {/* Global loading backdrop */}
      <Backdrop
        sx={{
          color: '#fff',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}
        open={globalLoading}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <CircularProgress color="primary" size={60} thickness={4} />
          {globalLoadingMessage && (
            <Typography variant="h6" component="div" sx={{ mt: 2 }}>
              {globalLoadingMessage}
            </Typography>
          )}
        </Box>
      </Backdrop>
    </LoadingContext.Provider>
  );
};