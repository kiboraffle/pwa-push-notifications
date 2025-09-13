import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Container,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  ErrorOutline,
  Refresh,
  Home
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
          {...this.props}
        />
      );
    }

    return this.props.children;
  }
}

const ErrorFallback = ({ error, errorInfo, onRetry, showDetails = false }) => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: 'center',
          borderRadius: 2
        }}
      >
        <Box sx={{ mb: 3 }}>
          <ErrorOutline
            sx={{
              fontSize: 80,
              color: 'error.main',
              mb: 2
            }}
          />
          <Typography variant="h4" component="h1" gutterBottom color="error">
            Oops! Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're sorry, but something unexpected happened. Please try refreshing the page or go back to the home page.
          </Typography>
        </Box>

        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          <AlertTitle>Error Details</AlertTitle>
          {error?.message || 'An unexpected error occurred'}
        </Alert>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={onRetry}
            color="primary"
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
          >
            Refresh Page
          </Button>
          <Button
            variant="outlined"
            startIcon={<Home />}
            onClick={handleGoHome}
          >
            Go Home
          </Button>
        </Box>

        {showDetails && process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 4, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Development Error Details:
            </Typography>
            <Paper
              sx={{
                p: 2,
                backgroundColor: 'grey.100',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                overflow: 'auto',
                maxHeight: 300
              }}
            >
              <Typography component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                {error?.stack}
              </Typography>
              {errorInfo && (
                <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                  {errorInfo.componentStack}
                </Typography>
              )}
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default ErrorBoundary;