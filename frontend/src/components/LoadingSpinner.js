import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Skeleton,
  Card,
  CardContent
} from '@mui/material';

// Main loading spinner component
const LoadingSpinner = ({ 
  size = 40, 
  message = 'Loading...', 
  showMessage = true, 
  variant = 'circular',
  fullHeight = false,
  color = 'primary'
}) => {
  const containerSx = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    p: 3,
    ...(fullHeight && { minHeight: '50vh' })
  };

  if (variant === 'skeleton') {
    return (
      <Box sx={{ width: '100%' }}>
        <Skeleton variant="text" height={40} />
        <Skeleton variant="text" height={40} width="80%" />
        <Skeleton variant="text" height={40} width="60%" />
        <Skeleton variant="rectangular" height={200} sx={{ mt: 2 }} />
      </Box>
    );
  }

  return (
    <Box sx={containerSx}>
      <CircularProgress size={size} color={color} thickness={4} />
      {showMessage && (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ textAlign: 'center' }}
        >
          {message}
        </Typography>
      )}
    </Box>
  );
};

// Table loading skeleton
export const TableLoadingSkeleton = ({ rows = 5, columns = 4 }) => (
  <Box sx={{ width: '100%' }}>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1 }}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton
            key={colIndex}
            variant="text"
            height={40}
            sx={{ flex: 1 }}
          />
        ))}
      </Box>
    ))}
  </Box>
);

// Card loading skeleton
export const CardLoadingSkeleton = ({ count = 3 }) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index}>
        <CardContent>
          <Skeleton variant="text" height={30} width="60%" />
          <Skeleton variant="text" height={20} width="80%" sx={{ mt: 1 }} />
          <Skeleton variant="text" height={20} width="40%" sx={{ mt: 1 }} />
          <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Stats cards loading skeleton
export const StatsLoadingSkeleton = ({ count = 3 }) => (
  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
    {Array.from({ length: count }).map((_, index) => (
      <Card key={index} sx={{ flex: 1, minWidth: 200 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" height={20} width="70%" />
              <Skeleton variant="text" height={40} width="50%" sx={{ mt: 1 }} />
            </Box>
            <Skeleton variant="circular" width={56} height={56} />
          </Box>
        </CardContent>
      </Card>
    ))}
  </Box>
);

// Form loading skeleton
export const FormLoadingSkeleton = () => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    <Skeleton variant="text" height={56} />
    <Skeleton variant="text" height={56} />
    <Skeleton variant="text" height={120} />
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
      <Skeleton variant="rectangular" width={100} height={36} />
      <Skeleton variant="rectangular" width={120} height={36} />
    </Box>
  </Box>
);

// Page loading component
export const PageLoading = ({ message = 'Loading page...' }) => (
  <LoadingSpinner 
    size={60} 
    message={message} 
    fullHeight 
    color="primary"
  />
);

// Inline loading component for buttons
export const InlineLoading = ({ size = 20, color = 'inherit' }) => (
  <CircularProgress size={size} color={color} thickness={4} />
);

// Loading overlay for existing content
export const LoadingOverlay = ({ 
  loading, 
  children, 
  message = 'Loading...', 
  blur = true 
}) => (
  <Box sx={{ position: 'relative' }}>
    <Box
      sx={{
        filter: loading && blur ? 'blur(2px)' : 'none',
        pointerEvents: loading ? 'none' : 'auto',
        transition: 'filter 0.2s ease-in-out'
      }}
    >
      {children}
    </Box>
    {loading && (
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 1
        }}
      >
        <LoadingSpinner message={message} />
      </Box>
    )}
  </Box>
);

export default LoadingSpinner;