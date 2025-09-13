import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Typography, Box, Paper } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { LoadingProvider } from './contexts/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import MasterLayout from './components/MasterLayout';
import ClientLayout from './components/ClientLayout';
import Login from './pages/master/Login';
import Dashboard from './pages/master/Dashboard';
import ClientManagement from './pages/master/ClientManagement';
import ClientLogin from './pages/client/Login';
import DomainManagement from './pages/client/DomainManagement';
import PushNotification from './pages/client/PushNotification';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Placeholder components
const HomePage = () => (
  <Container maxWidth="md" sx={{ mt: 4 }}>
    <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h1" component="h1" gutterBottom color="primary">
        PWA Push Notifications
      </Typography>
      <Typography variant="h2" component="h2" gutterBottom color="text.secondary">
        Multi-Tenant System
      </Typography>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body1" paragraph>
          Welcome to the Progressive Web App for managing multi-tenant web push notifications.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This application provides a complete solution for managing push notifications across multiple clients and domains.
        </Typography>
      </Box>
      <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Backend Foundation Ready
        </Typography>
        <Typography variant="body2">
          ✅ Express.js server with security middleware<br/>
          ✅ MongoDB connection with Mongoose models<br/>
          ✅ JWT authentication system<br/>
          ✅ Health check endpoints<br/>
          ✅ Multi-tenant database schema
        </Typography>
      </Box>
    </Paper>
  </Container>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>
        <LoadingProvider>
          <NotificationProvider>
            <AuthProvider>
              <Router>
                <div className="App">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/master/login" element={<Login />} />
                    <Route path="/client/login" element={<ClientLogin />} />
                    
                    {/* Protected Master Routes */}
                    <Route path="/master" element={
                      <ProtectedRoute requiredRole="master">
                        <MasterLayout />
                      </ProtectedRoute>
                    }>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="clients" element={<ClientManagement />} />
                    </Route>
                    
                    {/* Protected Client Routes */}
                    <Route path="/client" element={
                      <ProtectedRoute requiredRole="client">
                        <ClientLayout />
                      </ProtectedRoute>
                    }>
                      <Route path="domains" element={<DomainManagement />} />
                      <Route path="push" element={<PushNotification />} />
                    </Route>
                  </Routes>
                </div>
              </Router>
            </AuthProvider>
          </NotificationProvider>
        </LoadingProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default App;