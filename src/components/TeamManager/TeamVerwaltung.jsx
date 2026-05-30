// Team-Verwaltung für Teammitglieder
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Chip,
  Alert,
  Fab,
  Tooltip
} from '@mui/material';
import {
  MdAdd as AddIcon,
  MdEdit as EditIcon,
  MdDelete as DeleteIcon,
  MdPerson as PersonIcon,
  MdSave as SaveIcon,
  MdCancel as CancelIcon
} from 'react-icons/md';

// Services
import { TeamService } from '../../services/teamService';

const TeamVerwaltung = () => {
  const [teammitglieder, setTeammitglieder] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    rolle: '',
    email: '',
    telefon: '',
    verfuegbarkeit: '',
    notizen: '',
    aktiv: true
  });
  const [errors, setErrors] = useState({});
  const [alertInfo, setAlertInfo] = useState({ show: false, type: 'success', message: '' });

  // Laden der Teammitglieder beim Start
  useEffect(() => {
    loadTeammitglieder();
  }, []);

  const loadTeammitglieder = () => {
    try {
      const members = TeamService.getAllTeamMembers();
      setTeammitglieder(members);
    } catch (error) {
      showAlert('error', 'Fehler beim Laden der Teammitglieder: ' + error.message);
    }
  };

  const showAlert = (type, message) => {
    setAlertInfo({ show: true, type, message });
    setTimeout(() => setAlertInfo({ show: false, type: 'success', message: '' }), 5000);
  };

  const handleOpenDialog = (member = null) => {
    if (member) {
      setEditingMember(member);
      setFormData({ ...member });
    } else {
      setEditingMember(null);
      setFormData({
        id: '',
        name: '',
        rolle: '',
        email: '',
        telefon: '',
        verfuegbarkeit: '',
        notizen: '',
        aktiv: true
      });
    }
    setErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMember(null);
    setFormData({
      id: '',
      name: '',
      rolle: '',
      email: '',
      telefon: '',
      verfuegbarkeit: '',
      notizen: '',
      aktiv: true
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name ist erforderlich';
    }

    if (!formData.rolle.trim()) {
      newErrors.rolle = 'Rolle ist erforderlich';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    try {
      if (editingMember) {
        // Bearbeiten
        const updatedMember = TeamService.updateTeamMember(editingMember.id, formData);
        showAlert('success', `${updatedMember.name} wurde erfolgreich aktualisiert`);
      } else {
        // Neu erstellen
        const newMember = TeamService.createTeamMember(formData);
        showAlert('success', `${newMember.name} wurde erfolgreich hinzugefügt`);
      }
      
      loadTeammitglieder();
      handleCloseDialog();
    } catch (error) {
      showAlert('error', 'Fehler beim Speichern: ' + error.message);
    }
  };

  const handleDelete = (member) => {
    if (window.confirm(`Sind Sie sicher, dass Sie ${member.name} löschen möchten?`)) {
      try {
        TeamService.deleteTeamMember(member.id);
        showAlert('success', `${member.name} wurde erfolgreich gelöscht`);
        loadTeammitglieder();
      } catch (error) {
        showAlert('error', 'Fehler beim Löschen: ' + error.message);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon color="primary" fontSize="large" />
          Team-Verwaltung
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          size="large"
        >
          Neues Teammitglied
        </Button>
      </Box>

      {/* Alert */}
      {alertInfo.show && (
        <Alert severity={alertInfo.type} sx={{ mb: 3 }}>
          {alertInfo.message}
        </Alert>
      )}

      {/* Teammitglieder Tabelle */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Rolle</TableCell>
              <TableCell>E-Mail</TableCell>
              <TableCell>Telefon</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Aktionen</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {teammitglieder.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Noch keine Teammitglieder vorhanden
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              teammitglieder.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{member.name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={member.rolle} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{member.email || '-'}</TableCell>
                  <TableCell>{member.telefon || '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={member.aktiv ? 'Aktiv' : 'Inaktiv'} 
                      size="small" 
                      color={member.aktiv ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Bearbeiten">
                      <IconButton 
                        onClick={() => handleOpenDialog(member)}
                        color="primary"
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Löschen">
                      <IconButton 
                        onClick={() => handleDelete(member)}
                        color="error"
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Teammitglied Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingMember ? 'Teammitglied bearbeiten' : 'Neues Teammitglied'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name *"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Rolle *"
                value={formData.rolle}
                onChange={(e) => handleInputChange('rolle', e.target.value)}
                error={!!errors.rolle}
                helperText={errors.rolle}
                placeholder="z.B. Kräuterexpertin, Gartenführer"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-Mail"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefon"
                value={formData.telefon}
                onChange={(e) => handleInputChange('telefon', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Verfügbarkeit"
                value={formData.verfuegbarkeit}
                onChange={(e) => handleInputChange('verfuegbarkeit', e.target.value)}
                placeholder="z.B. Mo-Fr 9-17 Uhr, Wochenenden nach Absprache"
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notizen"
                value={formData.notizen}
                onChange={(e) => handleInputChange('notizen', e.target.value)}
                placeholder="Zusätzliche Informationen, Spezialisierungen, etc."
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseDialog}
            startIcon={<CancelIcon />}
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            {editingMember ? 'Aktualisieren' : 'Erstellen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamVerwaltung;
