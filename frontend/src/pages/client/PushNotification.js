import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Send,
  Preview,
  Image,
  Refresh,
  Notifications,
  CloudUpload,
  Delete
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingSpinner, { StatsLoadingSkeleton } from '../../components/LoadingSpinner';
import axios from 'axios';

const PushNotification = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const { setLoading, isLoading } = useLoading();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    brandLogo: null,
    promoImage: null
  });
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState({
    totalSubscribers: 0,
    totalNotifications: 0,
    sentNotifications: 0
  });
  const [brandLogoPreview, setBrandLogoPreview] = useState(null);
  const [promoImagePreview, setPromoImagePreview] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading('stats', true, 'Loading statistics...');
      const response = await axios.get('/notifications/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showError('Failed to load statistics');
    } finally {
      setLoading('stats', false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('File size must be less than 5MB');
        return;
      }

      setFormData(prev => ({
        ...prev,
        [fileType]: file
      }));

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      if (fileType === 'brandLogo') {
        setBrandLogoPreview(previewUrl);
      } else {
        setPromoImagePreview(previewUrl);
      }
    }
  };

  const removeFile = (fileType) => {
    setFormData(prev => ({
      ...prev,
      [fileType]: null
    }));
    
    if (fileType === 'brandLogo') {
      if (brandLogoPreview) {
        URL.revokeObjectURL(brandLogoPreview);
        setBrandLogoPreview(null);
      }
    } else {
      if (promoImagePreview) {
        URL.revokeObjectURL(promoImagePreview);
        setPromoImagePreview(null);
      }
    }
  };

  const generatePreview = async () => {
    if (!formData.title || !formData.content) {
      showError('Please fill in title and content to generate preview');
      return;
    }

    try {
      setLoading('preview', true, 'Generating preview...');
      
      // For now, we'll create a local preview since file upload isn't implemented
      const previewData = {
        title: formData.title,
        content: formData.content,
        brandLogoUrl: brandLogoPreview || user?.clientId?.brandLogoUrl,
        promoImageUrl: promoImagePreview,
        clientName: user?.clientId?.clientName,
        subscriberCount: stats.totalSubscribers,
        estimatedReach: stats.totalSubscribers,
        previewTimestamp: new Date().toISOString()
      };
      
      setPreview(previewData);
      showSuccess('Preview generated successfully');
    } catch (error) {
      showError('Failed to generate preview');
    } finally {
      setLoading('preview', false);
    }
  };

  const sendNotification = async () => {
    if (!formData.title || !formData.content) {
      showError('Please fill in title and content');
      return;
    }

    try {
      setLoading('send', true, 'Sending notification...');
      
      // For now, we'll send without file uploads since that requires additional setup
      const notificationData = {
        title: formData.title,
        content: formData.content,
        promoImageUrl: promoImagePreview // This would be a URL after upload
      };
      
      const response = await axios.post('/notifications/send', notificationData);
      
      showSuccess('Notification sent successfully!');
      
      // Reset form
      setFormData({
        title: '',
        content: '',
        brandLogo: null,
        promoImage: null
      });
      setBrandLogoPreview(null);
      setPromoImagePreview(null);
      setPreview(null);
      
      // Refresh stats
      fetchStats();
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setLoading('send', false);
    }
  };



  const FileUploadButton = ({ label, fileType, accept = "image/*" }) => (
    <Box>
      <input
        accept={accept}
        style={{ display: 'none' }}
        id={`${fileType}-upload`}
        type="file"
        onChange={(e) => handleFileChange(e, fileType)}
      />
      <label htmlFor={`${fileType}-upload`}>
        <Button
          variant="outlined"
          component="span"
          startIcon={<CloudUpload />}
          fullWidth
          sx={{ mb: 1 }}
        >
          {label}
        </Button>
      </label>
      
      {/* File Preview */}
      {((fileType === 'brandLogo' && brandLogoPreview) || (fileType === 'promoImage' && promoImagePreview)) && (
        <Box sx={{ position: 'relative', mt: 1 }}>
          <img
            src={fileType === 'brandLogo' ? brandLogoPreview : promoImagePreview}
            alt={`${fileType} preview`}
            style={{
              width: '100%',
              maxHeight: 150,
              objectFit: 'cover',
              borderRadius: 8
            }}
          />
          <IconButton
            size="small"
            sx={{
              position: 'absolute',
              top: 4,
              right: 4,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' }
            }}
            onClick={() => removeFile(fileType)}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );

  const NotificationPreview = ({ previewData }) => (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        maxWidth: 400,
        mx: 'auto',
        border: '2px solid',
        borderColor: 'primary.main',
        borderRadius: 2
      }}
    >
      <Typography variant="caption" color="primary" gutterBottom>
        Notification Preview
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
        <Avatar
          src={previewData.brandLogoUrl}
          sx={{ width: 40, height: 40 }}
        >
          {previewData.clientName?.charAt(0)}
        </Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            {previewData.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {previewData.clientName}
          </Typography>
        </Box>
      </Box>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        {previewData.content}
      </Typography>
      
      {previewData.promoImageUrl && (
        <Box sx={{ mb: 2 }}>
          <img
            src={previewData.promoImageUrl}
            alt="Promo"
            style={{
              width: '100%',
              maxHeight: 200,
              objectFit: 'cover',
              borderRadius: 8
            }}
          />
        </Box>
      )}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Estimated reach: {previewData.estimatedReach} subscribers
        </Typography>
        <Chip label="Preview" size="small" color="primary" variant="outlined" />
      </Box>
    </Paper>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Send Push Notification
        </Typography>
        <Tooltip title="Refresh Stats">
          <IconButton onClick={fetchStats} color="primary">
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Stats Cards */}
      {isLoading('stats') ? (
        <StatsLoadingSkeleton count={3} />
      ) : (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flexDirection: isMobile ? 'column' : 'row',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  <Notifications color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                      {stats.totalSubscribers.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Subscribers
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flexDirection: isMobile ? 'column' : 'row',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  <Send color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                      {stats.sentNotifications.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sent Notifications
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card sx={{
              transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              }
            }}>
              <CardContent>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 2,
                  flexDirection: isMobile ? 'column' : 'row',
                  textAlign: isMobile ? 'center' : 'left'
                }}>
                  <Image color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                      {stats.totalNotifications.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Notifications
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {/* Notification Form */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Notification
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Notification Title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  placeholder="Enter notification title..."
                  inputProps={{ maxLength: 100 }}
                  helperText={`${formData.title.length}/100 characters`}
                />
                
                <TextField
                  label="Notification Content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  multiline
                  rows={4}
                  placeholder="Enter notification content..."
                  inputProps={{ maxLength: 500 }}
                  helperText={`${formData.content.length}/500 characters`}
                />
                
                <Divider />
                
                <Typography variant="subtitle2" color="text.secondary">
                  Optional Images
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FileUploadButton
                      label="Upload Brand Logo"
                      fileType="brandLogo"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FileUploadButton
                      label="Upload Promo Image"
                      fileType="promoImage"
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={isLoading('preview') ? <LoadingSpinner size={16} showMessage={false} /> : <Preview />}
                    onClick={generatePreview}
                    disabled={isLoading('preview') || !formData.title || !formData.content}
                    fullWidth
                  >
                    {isLoading('preview') ? 'Generating...' : 'Generate Preview'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    startIcon={isLoading('send') ? <LoadingSpinner size={16} showMessage={false} /> : <Send />}
                    onClick={sendNotification}
                    disabled={isLoading('send') || !formData.title || !formData.content}
                    fullWidth
                  >
                    {isLoading('send') ? 'Sending...' : 'Send Notification'}
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Preview Panel */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Preview
              </Typography>
              
              {preview ? (
                <NotificationPreview previewData={preview} />
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 300,
                    textAlign: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Preview sx={{ fontSize: 64, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Preview Available
                  </Typography>
                  <Typography variant="body2">
                    Fill in the title and content, then click "Generate Preview" to see how your notification will look.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>


    </Box>
  );
};

export default PushNotification;