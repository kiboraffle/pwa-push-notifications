import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Avatar,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Switch,
  FormControlLabel,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add,
  Search,
  Refresh,
  Edit,
  Delete,
  Visibility,
  People
} from '@mui/icons-material';
import axios from 'axios';
import { useNotification } from '../../contexts/NotificationContext';
import { useLoading } from '../../contexts/LoadingContext';
import LoadingSpinner, { TableLoadingSkeleton } from '../../components/LoadingSpinner';

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalClients, setTotalClients] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClient, setNewClient] = useState({
    clientName: '',
    email: '',
    password: '',
    brandLogoUrl: ''
  });
  const { showError, showSuccess } = useNotification();
  const { setLoading, isLoading } = useLoading();

  const fetchClients = useCallback(async () => {
    try {
      setLoading('clients', true, 'Loading clients...');
      
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        search: searchTerm,
        status: statusFilter
      };
      
      const response = await axios.get('/clients', { params });
      const { clients: clientData, pagination } = response.data;
      
      setClients(clientData);
      setTotalClients(pagination.totalClients);
    } catch (error) {
      console.error('Failed to fetch clients:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load clients';
      showError(errorMessage);
    } finally {
      setLoading('clients', false);
    }
  }, [page, rowsPerPage, searchTerm, statusFilter, setLoading, showError]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset to first page when searching
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.checked ? 'active' : '');
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleAddClient = async () => {
    try {
      setLoading('addClient', true, 'Adding client...');
      await axios.post('/clients', newClient);
      setAddDialogOpen(false);
      setNewClient({ clientName: '', email: '', password: '', brandLogoUrl: '' });
      fetchClients();
      showSuccess('Client added successfully');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to add client');
    } finally {
      setLoading('addClient', false);
    }
  };

  const handleToggleStatus = async (client) => {
    try {
      setLoading(`toggle-${client._id}`, true);
      await axios.patch(`/clients/${client._id}/status`);
      fetchClients();
      showSuccess(
        `Client ${client.status === 'active' ? 'deactivated' : 'activated'} successfully`
      );
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to update client status');
    } finally {
      setLoading(`toggle-${client._id}`, false);
    }
  };

  const handleDeleteClient = async () => {
    try {
      setLoading('deleteClient', true, 'Deleting client...');
      await axios.delete(`/clients/${selectedClient._id}`);
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      fetchClients();
      showSuccess('Client deleted successfully');
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to delete client');
    } finally {
      setLoading('deleteClient', false);
    }
  };



  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Client Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchClients} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Client
          </Button>
        </Box>
      </Box>



      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search clients..."
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={statusFilter === 'active'}
                  onChange={handleStatusFilterChange}
                  color="primary"
                />
              }
              label="Show only active clients"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {isLoading('clients') ? (
            <TableLoadingSkeleton rows={rowsPerPage} columns={5} />
          ) : clients.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No clients found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchTerm || statusFilter 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Start by adding your first client'
                }
              </Typography>
              {!searchTerm && !statusFilter && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setAddDialogOpen(true)}
                >
                  Add Your First Client
                </Button>
              )}
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Client</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Managed By</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Created Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {clients.map((client) => (
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
                              <Avatar src={client.brandLogoUrl} sx={{ width: 40, height: 40 }} />
                            ) : (
                              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                                {client.clientName.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Box>
                              <Typography variant="body1" fontWeight={500}>
                                {client.clientName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                ID: {client._id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {client.managedBy?.email || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={client.status}
                              color={client.status === 'active' ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                            />
                            <Switch
                              checked={client.status === 'active'}
                              onChange={() => handleToggleStatus(client)}
                              size="small"
                              color="primary"
                              disabled={isLoading(`toggle-${client._id}`)}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(client.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Tooltip title="View Details">
                              <IconButton 
                                size="small" 
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
                            <Tooltip title="Edit">
                              <IconButton 
                                size="small" 
                                color="primary"
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'primary.light',
                                    color: 'primary.contrastText'
                                  }
                                }}
                              >
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setDeleteDialogOpen(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: 'error.light',
                                    color: 'error.contrastText'
                                  }
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
              
              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={totalClients}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Client Name"
              value={newClient.clientName}
              onChange={(e) => setNewClient({ ...newClient, clientName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={newClient.email}
              onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              value={newClient.password}
              onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Brand Logo URL (Optional)"
              value={newClient.brandLogoUrl}
              onChange={(e) => setNewClient({ ...newClient, brandLogoUrl: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setAddDialogOpen(false)}
            disabled={isLoading('addClient')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddClient}
            variant="contained"
            disabled={!newClient.clientName || !newClient.email || !newClient.password || isLoading('addClient')}
            startIcon={isLoading('addClient') ? <LoadingSpinner size={16} showMessage={false} /> : <Add />}
          >
            {isLoading('addClient') ? 'Adding...' : 'Add Client'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the client "{selectedClient?.clientName}"?
            This action cannot be undone and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isLoading('deleteClient')}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteClient} 
            color="error" 
            variant="contained"
            disabled={isLoading('deleteClient')}
            startIcon={isLoading('deleteClient') ? <LoadingSpinner size={16} showMessage={false} /> : <Delete />}
          >
            {isLoading('deleteClient') ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>


    </Box>
  );
};

export default ClientManagement;