import React, { useState, useEffect } from 'react';
import {
  Box,
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
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Chip,
  Grid
} from '@mui/material';
import {
  Add,
  Refresh,
  Delete,
  Verified,
  Domain as DomainIcon,
  Language,
  Code,
  ContentCopy
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingSpinner, { StatsLoadingSkeleton, TableLoadingSkeleton } from '../../components/LoadingSpinner';

const DomainManagement = () => {
  const { user } = useAuth();
  const [domains, setDomains] = useState([]);
  const [stats, setStats] = useState({ totalDomains: 0 });
  const [error, setError] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [newDomain, setNewDomain] = useState('');
  const { showError, showSuccess } = useNotification();
  const { setLoading, isLoading } = useLoading();
  const [showCodeSnippet, setShowCodeSnippet] = useState(false);
  const [selectedDomainForCode, setSelectedDomainForCode] = useState(null);

  const fetchDomains = async () => {
    try {
      setLoading('domains', true, 'Loading domains...');
      setError('');
      
      const [domainsResponse, statsResponse] = await Promise.all([
        axios.get('/domains'),
        axios.get('/domains/stats')
      ]);
      
      setDomains(domainsResponse.data.domains);
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error('Failed to fetch domains:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load domains';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading('domains', false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      showError('Please enter a domain name');
      return;
    }

    try {
      setLoading('addDomain', true, 'Adding domain...');
      await axios.post('/domains', { domainName: newDomain.trim() });
      setAddDialogOpen(false);
      setNewDomain('');
      fetchDomains();
      showSuccess('Domain added successfully');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to add domain');
    } finally {
      setLoading('addDomain', false);
    }
  };

  const handleDeleteDomain = async () => {
    try {
      setLoading('deleteDomain', true, 'Deleting domain...');
      await axios.delete(`/domains/${selectedDomain._id}`);
      setDeleteDialogOpen(false);
      setSelectedDomain(null);
      fetchDomains();
      showSuccess('Domain deleted successfully');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete domain');
    } finally {
      setLoading('deleteDomain', false);
    }
  };



  const generateCodeSnippet = (domain) => {
    const clientId = user?.clientId?._id || user?.clientId;
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    
    return `<!-- PWA Push Notifications Integration -->
<!-- Add this script to your website's <head> section -->
<script>
(function() {
  'use strict';
  
  // Configuration
  const CLIENT_ID = '${clientId}';
  const API_URL = '${apiUrl}';
  const DOMAIN = '${domain.domainName}';
  
  // Check if browser supports service workers and push notifications
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return;
  }
  
  // Register service worker
  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }
  
  // Get VAPID public key from server
  async function getVapidPublicKey() {
    try {
      const response = await fetch(API_URL + '/subscribe/vapid-public-key');
      const data = await response.json();
      if (data.success) {
        return data.publicKey;
      }
      throw new Error(data.message || 'Failed to get VAPID key');
    } catch (error) {
      console.error('Error getting VAPID key:', error);
      throw error;
    }
  }
  
  // Convert VAPID key to Uint8Array
  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
  
  // Subscribe to push notifications
  async function subscribeToPush(registration) {
    try {
      const vapidPublicKey = await getVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });
      
      console.log('Push subscription created:', subscription);
      
      // Send subscription to server
      const response = await fetch(API_URL + '/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription,
          clientId: CLIENT_ID,
          domain: DOMAIN
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Subscription registered successfully:', result);
        return subscription;
      } else {
        throw new Error(result.message || 'Failed to register subscription');
      }
    } catch (error) {
      console.error('Error subscribing to push:', error);
      throw error;
    }
  }
  
  // Request notification permission and subscribe
  async function requestNotificationPermission() {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        console.log('Notification permission granted');
        
        const registration = await registerServiceWorker();
        await subscribeToPush(registration);
        
        console.log('Push notifications setup completed successfully');
        return true;
      } else {
        console.warn('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
      return false;
    }
  }
  
  // Initialize push notifications when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requestNotificationPermission);
  } else {
    requestNotificationPermission();
  }
  
  // Optional: Add a button to manually trigger subscription
  window.subscribeToPushNotifications = requestNotificationPermission;
  
})();
</script>

<!-- Optional: Add this button to your page for manual subscription -->
<!-- <button onclick="subscribeToPushNotifications()">Enable Push Notifications</button> -->`;
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Code snippet copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      showError('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const validateDomain = (domain) => {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$|^localhost(:[0-9]+)?$|^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}(:[0-9]+)?$/;
    return domainRegex.test(domain);
  };

  const StatCard = ({ title, value, icon, color = 'primary' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h3" component="div" color={`${color}.main`}>
              {value}
            </Typography>
          </Box>
          <Box sx={{ color: `${color}.main`, fontSize: 48 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Domain Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchDomains} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Domain
          </Button>
        </Box>
      </Box>



      {/* Statistics */}
      {isLoading('domains') ? (
        <StatsLoadingSkeleton count={3} />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Total Domains"
              value={stats.totalDomains}
              icon={<DomainIcon />}
              color="primary"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Verified Domains"
              value={0} // TODO: Implement verification
              icon={<Verified />}
              color="success"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <StatCard
              title="Active Domains"
              value={stats.totalDomains}
              icon={<Language />}
              color="info"
            />
          </Grid>
        </Grid>
      )}

      {/* Domains Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading('domains') ? (
            <TableLoadingSkeleton rows={5} columns={4} />
          ) : domains.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <DomainIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No domains added yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Add your first domain to start sending push notifications
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddDialogOpen(true)}
              >
                Add Your First Domain
              </Button>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Domain Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Added Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain._id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <DomainIcon color="primary" />
                          <Box>
                            <Typography variant="body1" fontWeight={500}>
                              {domain.domainName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {domain._id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label="Active"
                          color="success"
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(domain.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <Tooltip title="Get Integration Code">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => {
                                setSelectedDomainForCode(domain);
                                setShowCodeSnippet(true);
                              }}
                            >
                              <Code />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Domain">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setSelectedDomain(domain);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Domain</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <TextField
              label="Domain Name"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              fullWidth
              error={newDomain && !validateDomain(newDomain)}
              helperText={
                newDomain && !validateDomain(newDomain)
                  ? 'Please enter a valid domain name (e.g., example.com)'
                  : 'Enter the domain where you want to send push notifications'
              }
              disabled={isLoading('addDomain')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)} disabled={isLoading('addDomain')}>
            Cancel
          </Button>
          <Button
              onClick={handleAddDomain}
              variant="contained"
              disabled={!newDomain.trim() || !validateDomain(newDomain) || isLoading('addDomain')}
              startIcon={isLoading('addDomain') ? <LoadingSpinner size={16} showMessage={false} /> : <Add />}
            >
              {isLoading('addDomain') ? 'Adding...' : 'Add Domain'}
            </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the domain "{selectedDomain?.domainName}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isLoading('deleteDomain')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteDomain} 
            color="error" 
            variant="contained"
            disabled={isLoading('deleteDomain')}
            startIcon={isLoading('deleteDomain') ? <LoadingSpinner size={16} showMessage={false} /> : <Delete />}
          >
            {isLoading('deleteDomain') ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Code Snippet Dialog */}
      <Dialog 
        open={showCodeSnippet} 
        onClose={() => setShowCodeSnippet(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Code color="primary" />
            Integration Code for {selectedDomainForCode?.domainName}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Copy this code and add it to your website's HTML. Make sure to also upload the service-worker.js file to your website's root directory.
          </Alert>
          
          <Box sx={{ position: 'relative' }}>
            <TextField
              multiline
              rows={20}
              fullWidth
              value={selectedDomainForCode ? generateCodeSnippet(selectedDomainForCode) : ''}
              InputProps={{
                readOnly: true,
                sx: {
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  backgroundColor: 'grey.50'
                }
              }}
            />
            <Tooltip title="Copy to Clipboard">
              <IconButton
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'background.paper',
                  '&:hover': { backgroundColor: 'background.paper' }
                }}
                onClick={() => selectedDomainForCode && copyToClipboard(generateCodeSnippet(selectedDomainForCode))}
              >
                <ContentCopy />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Important Setup Steps:
            </Typography>
            <Typography variant="body2" component="div">
              1. Download the service-worker.js file from our system<br/>
              2. Upload it to your website's root directory (same level as index.html)<br/>
              3. Add the integration code above to your website's &lt;head&gt; section<br/>
              4. Test the integration by visiting your website
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCodeSnippet(false)}>Close</Button>
          <Button 
            variant="contained" 
            startIcon={<ContentCopy />}
            onClick={() => selectedDomainForCode && copyToClipboard(generateCodeSnippet(selectedDomainForCode))}
          >
            Copy Code
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default DomainManagement;