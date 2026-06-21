import React, { useState, useEffect } from 'react';
import {
  Box, Typography, IconButton, Tooltip,
  Card, CardContent, Chip, LinearProgress, Alert
} from '@mui/material';
import { MdRefresh, MdCloudSync, MdCloudUpload, MdCloudDownload } from 'react-icons/md';
import { nasStorageService, initialNasSync, fullNasUpload } from '../../services/nasStorageService';

const NasSyncWidget = ({ settings }) => {
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync]     = useState(null);
  const [error, setError]           = useState('');
  const [isSyncing, setIsSyncing]   = useState(false);

  // Verbindung testen wenn NAS aktiviert / URL geändert
  useEffect(() => {
    if (!settings.nasEnabled || !settings.nasUrl) {
      setSyncStatus('idle');
      setError('');
      return;
    }
    setSyncStatus('testing');
    nasStorageService.testConnection({
      nasUrl:    settings.nasUrl,
      nasApiKey: settings.nasApiKey,
    }).then(ok => {
      setSyncStatus(ok ? 'connected' : 'error');
      setError(ok ? '' : 'NAS nicht erreichbar – URL prüfen');
    });
  }, [settings.nasEnabled, settings.nasUrl, settings.nasApiKey]);

  // Sofortiger Sync bei Connect + periodischer Auto-Sync alle 2 Minuten
  useEffect(() => {
    if (!settings.nasEnabled || syncStatus !== 'connected') return;
    const doSync = async () => {
      setIsSyncing(true);
      try {
        await initialNasSync(settings);
        setLastSync(new Date().toLocaleString('de-AT'));
        window.dispatchEvent(new CustomEvent('nasDataUpdated'));
      } catch (e) {
        setError('Auto-Sync fehlgeschlagen: ' + (e.message || e));
      } finally {
        setIsSyncing(false);
      }
    };
    doSync();
    const interval = setInterval(doSync, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [settings, syncStatus]);

  const handleDownload = async () => {
    setIsSyncing(true);
    setError('');
    try {
      await initialNasSync(settings);
      setLastSync(new Date().toLocaleString('de-AT'));
      setSyncStatus('connected');
      window.dispatchEvent(new CustomEvent('nasDataUpdated'));
    } catch (e) {
      setError('Download fehlgeschlagen: ' + (e.message || e));
      setSyncStatus('error');
    }
    setIsSyncing(false);
  };

  const handleUpload = async () => {
    setIsSyncing(true);
    setError('');
    try {
      await fullNasUpload(settings);
      setLastSync(new Date().toLocaleString('de-AT'));
      setSyncStatus('connected');
    } catch (e) {
      setError('Upload fehlgeschlagen: ' + (e.message || e));
      setSyncStatus('error');
    }
    setIsSyncing(false);
  };

  const statusColor = syncStatus === 'connected' ? 'success'
    : syncStatus === 'error'   ? 'error'
    : 'default';
  const statusLabel = syncStatus === 'connected' ? 'Verbunden'
    : syncStatus === 'error'   ? 'Fehler'
    : syncStatus === 'testing' ? 'Verbinde…'
    : 'Inaktiv';

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <MdCloudSync size={22} color={syncStatus === 'connected' ? '#2e7d32' : syncStatus === 'error' ? '#c62828' : '#9e9e9e'} />
          <Typography variant="h6" sx={{ mr: 1 }}>NAS-Sync</Typography>
          <Chip label={statusLabel} color={statusColor} size="small" />
          {lastSync && <Chip label={`Sync: ${lastSync}`} color="info" size="small" />}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="NAS → lokal (Download)">
            <span>
              <IconButton onClick={handleDownload} disabled={isSyncing || syncStatus !== 'connected'} size="small">
                <MdCloudDownload />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Lokal → NAS (Upload)">
            <span>
              <IconButton onClick={handleUpload} disabled={isSyncing || syncStatus !== 'connected'} size="small">
                <MdCloudUpload />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        {error   && <Alert severity="error"   sx={{ mt: 1 }}>{error}</Alert>}
        {isSyncing && <LinearProgress sx={{ mt: 1 }} />}
      </CardContent>
      <style>{`
        @keyframes rotating { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .rotating { animation: rotating 1.2s linear infinite; }
      `}</style>
    </Card>
  );
};

export default NasSyncWidget;
