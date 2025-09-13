import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  People,
  CheckCircle,
  Cancel,
  TrendingUp,
  Refresh,
  Visibility
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingSpinner, { StatsLoadingSkeleton, TableLoadingSkeleton } from '../../components/LoadingSpinner';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    inactiveClients: 0
  });
  const [recentClients, setRecentClients] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showError, showSuccess } = useNotification();
  const { setLoading, isLoading } = useLoading();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const fetchDashboardData = async (showSuccessMessage = false) => {
    try {
      setLoading('dashboard', true, 'Loading dashboard data...');
      setError('');
      
      const response = await axios.get('/clients/stats');
      const { stats: clientStats, recentClients: recent } = response.data;
      
      setStats(clientStats);
      setRecentClients(recent);
      
      if (showSuccessMessage) {
        showSuccess('Dashboard data refreshed successfully');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load dashboard data';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading('dashboard', false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const handleViewClient = (clientId) => {
    navigate(`/master/clients?highlight=${clientId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StatCard = ({ title, value, icon, color = 'primary', subtitle }) => (
    <Card 
      sx={{ 
        height: '100%',
        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexDirection: isMobile ? 'column' : 'row',
          textAlign: isMobile ? 'center' : 'left',
          gap: isMobile ? 2 : 0
        }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="text.secondary" 
              gutterBottom 
              variant={isMobile ? 'subtitle1' : 'h6'}
              sx={{ fontWeight: 500 }}
            >
              {title}
            </Typography>
            <Typography 
              variant={isMobile ? 'h4' : 'h3'} 
              component="div" 
              color={`${color}.main`}
              sx={{ fontWeight: 700 }}
            >
              {value.toLocaleString()}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ 
            bgcolor: `${color}.main`, 
            width: isMobile ? 48 : 56, 
            height: isMobile ? 48 : 56,
            boxShadow: 2
          }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );

  const loading = isLoading('dashboard');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Dashboard
        </Typography>
        <Tooltip title="Refresh Data">
          <IconButton onClick={handleRefresh} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>



      {/* Statistics Cards */}
      {loading ? (
        <StatsLoadingSkeleton count={3} />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Total Clients"
              value={stats.totalClients}
              icon={<People />}
              color="primary"
              subtitle="All registered clients"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Active Clients"
              value={stats.activeClients}
              icon={<CheckCircle />}
              color="success"
              subtitle="Currently active"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Inactive Clients"
              value={stats.inactiveClients}
              icon={<Cancel />}
              color="error"
              subtitle="Temporarily disabled"
            />
          </Grid>
        </Grid>
      )}

      {/* Recent Clients Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TrendingUp sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" component="h2">
              Recent Clients
            </Typography>
          </Box>
          
          {loading ? (
            <TableLoadingSkeleton rows={5} columns={5} />
          ) : recentClients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No clients found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start by adding your first client to see them here
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Client Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Managed By</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentClients.map((client) => (
                    <TableRow 
                      key={client._id} 
                      hover
                      sx={{
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {client.brandLogoUrl ? (
                            <Avatar 
                              src={client.brandLogoUrl} 
                              sx={{ width: 32, height: 32 }}
                            />
                          ) : (
                            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                              {client.clientName.charAt(0).toUpperCase()}
                            </Avatar>
                          )}
                          <Typography variant="body2" fontWeight={500}>
                            {client.clientName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {client.managedBy?.email || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={client.status}
                          color={client.status === 'active' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(client.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Client Details">
                          <IconButton
                            size="small"
                            onClick={() => handleViewClient(client._id)}
                            color="primary"
                            sx={{
                              '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'primary.contrastText'
                              }
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;