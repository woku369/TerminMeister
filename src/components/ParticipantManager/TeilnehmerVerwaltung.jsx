// Teilnehmerverwaltung
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Typography,
  InputAdornment,
  Menu,
  MenuItem,
  Fab,
  Alert,
  Card,
  CardContent,
  Divider
} from '@mui/material';
import {
  MdSearch as Search,
  MdAdd as Add,
  MdEdit as Edit,
  MdDelete as Delete,
  MdEmail as Email,
  MdPhone as Phone,
  MdBusiness as Business,
  MdPerson as Person,
  MdMoreVert as MoreVert,
  MdDownload as Download,
  MdUpload as Upload,
  MdGroups as Groups
} from 'react-icons/md';

// Services
import { ParticipantService } from '../../services/participantService';

function TeilnehmerVerwaltung({ onSuccess, onError }) {
  const [participants, setParticipants] = useState([]);
  const [filteredParticipants, setFilteredParticipants] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [statistics, setStatistics] = useState(null);

  // Formular-State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    position: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadParticipants();
    loadStatistics();
  }, []);

  useEffect(() => {
    filterParticipants();
  }, [participants, searchTerm]);

  const loadParticipants = () => {
    try {
      const data = ParticipantService.getAllParticipants();
      setParticipants(data);
    } catch (error) {
      onError('Fehler beim Laden der Teilnehmer: ' + error.message);
    }
  };

  const loadStatistics = () => {
    try {
      const stats = ParticipantService.getParticipantStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
    }
  };

  const filterParticipants = () => {
    if (!searchTerm.trim()) {
      setFilteredParticipants(participants);
    } else {
      const filtered = ParticipantService.searchParticipants(searchTerm);
      setFilteredParticipants(filtered);
    }
    setPage(0); // Zurück zur ersten Seite bei neuer Suche
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateParticipant = () => {
    setSelectedParticipant(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      organization: '',
      position: '',
      notes: ''
    });
    setFormErrors({});
    setFormDialogOpen(true);
  };

  const handleEditParticipant = (participant) => {
    setSelectedParticipant(participant);
    setFormData({
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      organization: participant.organization || '',
      position: participant.position || '',
      notes: participant.notes || ''
    });
    setFormErrors({});
    setFormDialogOpen(true);
  };

  const handleDeleteParticipant = (participant) => {
    setSelectedParticipant(participant);
    setDeleteDialogOpen(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name ist erforderlich';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      if (selectedParticipant) {
        // Teilnehmer bearbeiten
        await ParticipantService.updateParticipant(selectedParticipant.id, formData);
        onSuccess('Teilnehmer wurde erfolgreich aktualisiert');
      } else {
        // Neuen Teilnehmer erstellen
        await ParticipantService.createParticipant(formData);
        onSuccess('Teilnehmer wurde erfolgreich erstellt');
      }

      setFormDialogOpen(false);
      loadParticipants();
      loadStatistics();
    } catch (error) {
      onError('Fehler beim Speichern: ' + error.message);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await ParticipantService.deleteParticipant(selectedParticipant.id);
      onSuccess('Teilnehmer wurde erfolgreich gelöscht');
      setDeleteDialogOpen(false);
      loadParticipants();
      loadStatistics();
    } catch (error) {
      onError('Fehler beim Löschen: ' + error.message);
      setDeleteDialogOpen(false);
    }
  };

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Fehler zurücksetzen
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleExport = () => {
    try {
      const csvData = ParticipantService.exportParticipants('csv');
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `teilnehmer_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onSuccess('Teilnehmer erfolgreich exportiert');
    } catch (error) {
      onError('Fehler beim Export: ' + error.message);
    }
    setMenuAnchor(null);
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target.result;
        const result = ParticipantService.importParticipants(csvData);
        
        if (result.errors.length > 0) {
          onError(`Import abgeschlossen mit ${result.errors.length} Fehlern. ${result.total} Teilnehmer importiert.`);
        } else {
          onSuccess(`${result.total} Teilnehmer erfolgreich importiert`);
        }
        
        loadParticipants();
        loadStatistics();
      } catch (error) {
        onError('Fehler beim Import: ' + error.message);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
    setMenuAnchor(null);
  };

  const getParticipantAppointmentCount = (participantId) => {
    return statistics?.participantAppointmentCounts[participantId] || 0;
  };

  const paginatedParticipants = filteredParticipants.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      {/* Statistiken */}
      {statistics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Groups style={{ marginRight: 8, color: '#1976d2', fontSize: 28 }} />
                  <Box>
                    <Typography variant="h6">{statistics.totalParticipants}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Teilnehmer gesamt
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email sx={{ mr: 1, color: 'info.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.participantsWithEmail}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Mit E-Mail
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Business sx={{ mr: 1, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.organizations.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Organisationen
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ mr: 1, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6">{statistics.mostActiveParticipants.length}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aktive Teilnehmer
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Toolbar */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Teilnehmer suchen..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />

        <Box>
          <Button
            startIcon={<MoreVert />}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
          >
            Aktionen
          </Button>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
          >
            <MenuItem onClick={handleExport}>
              <Download sx={{ mr: 1 }} />
              Exportieren (CSV)
            </MenuItem>
            <MenuItem component="label">
              <Upload sx={{ mr: 1 }} />
              Importieren (CSV)
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleImport}
              />
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Teilnehmer-Tabelle */}
      <Paper elevation={1}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>E-Mail</TableCell>
                <TableCell>Telefon</TableCell>
                <TableCell>Organisation</TableCell>
                <TableCell>Position</TableCell>
                <TableCell align="center">Termine</TableCell>
                <TableCell align="center">Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedParticipants.map((participant) => (
                <TableRow key={participant.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Person sx={{ mr: 1, color: 'text.secondary' }} />
                      {participant.name}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {participant.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Email sx={{ mr: 1, color: 'text.secondary' }} />
                        {participant.email}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone sx={{ mr: 1, color: 'text.secondary' }} />
                        {participant.phone}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {participant.organization && (
                      <Chip 
                        label={participant.organization} 
                        size="small" 
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>{participant.position}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={getParticipantAppointmentCount(participant.id)}
                      size="small"
                      color={getParticipantAppointmentCount(participant.id) > 0 ? 'primary' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => handleEditParticipant(participant)}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteParticipant(participant)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredParticipants.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          labelRowsPerPage="Zeilen pro Seite:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} von ${count !== -1 ? count : `mehr als ${to}`}`
          }
        />
      </Paper>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="Neuer Teilnehmer"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24
        }}
        onClick={handleCreateParticipant}
      >
        <Add />
      </Fab>

      {/* Formular Dialog */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedParticipant ? 'Teilnehmer bearbeiten' : 'Neuer Teilnehmer'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  error={!!formErrors.name}
                  helperText={formErrors.name}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="E-Mail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefon"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Organisation"
                  value={formData.organization}
                  onChange={(e) => handleFormChange('organization', e.target.value)}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Position"
                  value={formData.position}
                  onChange={(e) => handleFormChange('position', e.target.value)}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notizen"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleFormSubmit} variant="contained">
            {selectedParticipant ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lösch-Bestätigung Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Teilnehmer löschen</DialogTitle>
        <DialogContent>
          {selectedParticipant && (
            <Typography>
              Sind Sie sicher, dass Sie den Teilnehmer "{selectedParticipant.name}" löschen möchten?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default TeilnehmerVerwaltung;
