// Lager-Tab für TerminMeister — Bestandsübersicht + Schnellabbuchung
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardActionArea,
  Chip, IconButton, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Tooltip,
} from '@mui/material';
import { MdRefresh, MdInventory, MdRemoveShoppingCart, MdWarning } from 'react-icons/md';
import { getBestand, postAbgang } from '../../services/lagerService';

const AMPEL_COLOR = {
  gruen: { bg: '#e8f5e9', border: '#4caf50', label: 'OK',    chip: 'success' },
  gelb:  { bg: '#fff8e1', border: '#ff9800', label: 'Alarm', chip: 'warning' },
  rot:   { bg: '#ffebee', border: '#f44336', label: 'Leer',  chip: 'error'   },
};

const FILTER_OPTIONS = [
  { value: 'alle',              label: 'Alle' },
  { value: 'alarm',             label: 'Alarm + Leer' },
  { value: 'Spirituosen',       label: 'Spirituosen' },
  { value: 'Lebensmittel',      label: 'Lebensmittel' },
  { value: 'Merchandising',     label: 'Merchandise' },
  { value: 'Verbrauchsartikel', label: 'Verbrauch' },
];

export default function LagerTab({ terminId }) {
  const [bestand, setBestand] = useState({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('alle');
  const [dialog,  setDialog]  = useState(null);   // { artikel, menge, grund }
  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBestand();
      setBestand(data.bestand || {});
    } catch (e) {
      setError('LagerMeister nicht erreichbar: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = Object.values(bestand).filter(({ artikel, ampel }) => {
    if (filter === 'alarm') return ampel === 'gelb' || ampel === 'rot';
    if (filter === 'alle')  return true;
    return artikel?.kategorie === filter;
  });

  const openDialog = (eintrag) => {
    setDialog({ artikel: eintrag.artikel, menge: 1, grund: 'Führung' });
    setSuccess(null);
  };

  const handleAbgang = async () => {
    if (!dialog) return;
    setSaving(true);
    try {
      await postAbgang({
        artikelId: dialog.artikel.id,
        menge:     Number(dialog.menge),
        grund:     dialog.grund || 'Führung',
        referenz:  terminId || null,
      });
      setSuccess(`${dialog.artikel.bezeichnung} — ${dialog.menge} ${dialog.artikel.einheit || 'Stk'} ausgebucht`);
      setDialog(null);
      await load();
    } catch (e) {
      setError('Fehler bei Abbuchung: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <MdInventory size={22} />
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Lager</Typography>
        {FILTER_OPTIONS.map(f => (
          <Chip
            key={f.value}
            label={f.label}
            size="small"
            variant={filter === f.value ? 'filled' : 'outlined'}
            color={filter === f.value ? 'primary' : 'default'}
            onClick={() => setFilter(f.value)}
            sx={{ cursor: 'pointer' }}
          />
        ))}
        <Tooltip title="Aktualisieren">
          <IconButton size="small" onClick={load} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : <MdRefresh size={20} />}
          </IconButton>
        </Tooltip>
      </Box>

      {error   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Kacheln */}
      {items.length === 0 && !loading && (
        <Typography color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
          Keine Artikel{filter !== 'alle' ? ' für diesen Filter' : ''}
        </Typography>
      )}

      <Grid container spacing={1.5}>
        {items.map(({ artikel, menge, ampel }) => {
          const col = AMPEL_COLOR[ampel] || AMPEL_COLOR.gruen;
          return (
            <Grid item xs={6} sm={4} md={3} key={artikel.id}>
              <Card variant="outlined" sx={{ borderColor: col.border, backgroundColor: col.bg, height: '100%' }}>
                <CardActionArea onClick={() => openDialog({ artikel, menge, ampel })} sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                      {artikel.bezeichnung}
                    </Typography>
                    <Chip label={col.label} color={col.chip} size="small" sx={{ ml: 0.5, flexShrink: 0 }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{artikel.artNr}</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5 }}>
                    {menge}{' '}
                    <Typography component="span" variant="caption">{artikel.einheit || 'Stk'}</Typography>
                  </Typography>
                  {ampel !== 'gruen' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                      <MdWarning size={14} color={col.border} />
                      <Typography variant="caption" color="text.secondary">
                        Soll: {artikel.minBestand}
                      </Typography>
                    </Box>
                  )}
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Schnellabbuchung Dialog */}
      <Dialog open={!!dialog} onClose={() => setDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MdRemoveShoppingCart />
          Ausbuchen
        </DialogTitle>
        {dialog && (
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography>
              <strong>{dialog.artikel.bezeichnung}</strong>
              <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                ({dialog.artikel.artNr})
              </Typography>
            </Typography>
            <TextField
              label="Menge"
              type="number"
              value={dialog.menge}
              onChange={e => setDialog(d => ({ ...d, menge: e.target.value }))}
              inputProps={{ min: 1 }}
              size="small"
              fullWidth
            />
            <TextField
              label="Grund"
              value={dialog.grund}
              onChange={e => setDialog(d => ({ ...d, grund: e.target.value }))}
              size="small"
              fullWidth
              placeholder="Führung"
            />
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setDialog(null)} disabled={saving}>Abbrechen</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleAbgang}
            disabled={saving || !dialog?.menge || dialog.menge < 1}
            startIcon={saving ? <CircularProgress size={16} /> : <MdRemoveShoppingCart />}
          >
            Ausbuchen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
