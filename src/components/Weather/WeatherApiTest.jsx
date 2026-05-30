// Test-Komponente für Wetter-API
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip
} from '@mui/material';
import {
  MdCloud as CloudIcon,
  MdCheckCircle as CheckIcon,
  MdError as ErrorIcon,
  MdRefresh as RefreshIcon
} from 'react-icons/md';

import { WeatherService } from '../../services/weatherService';

const WeatherApiTest = () => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState(null);

  const runApiTest = async () => {
    setLoading(true);
    try {
      const result = await WeatherService.testConnection();
      setTestResult(result);
      
      if (result.success) {
        setWeatherData(result.data);
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test-Fehler: ${error.message}`,
        config: WeatherService.getApiConfig()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runApiTest();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <CloudIcon color="primary" />
          Wetter-API Test
        </Typography>

        {/* Test-Button */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            onClick={runApiTest}
            disabled={loading}
          >
            {loading ? 'Teste API...' : 'API-Verbindung testen'}
          </Button>
        </Box>

        {/* Test-Ergebnis */}
        {testResult && (
          <Alert 
            severity={testResult.success ? 'success' : 'error'} 
            icon={testResult.success ? <CheckIcon /> : <ErrorIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle2">
              {testResult.message}
            </Typography>
          </Alert>
        )}

        {/* API-Konfiguration */}
        {testResult?.config && (
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              API-Konfiguration
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="API-Key Status"
                  secondary={
                    <Chip 
                      label={testResult.config.hasApiKey ? 'Konfiguriert' : 'Nicht gesetzt'} 
                      color={testResult.config.hasApiKey ? 'success' : 'error'}
                      size="small"
                    />
                  }
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="API-Key (gekürzt)"
                  secondary={testResult.config.apiKeyPreview}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Base URL"
                  secondary={testResult.config.baseUrl}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Standort"
                  secondary={`${testResult.config.location.name} (${testResult.config.location.lat}, ${testResult.config.location.lon})`}
                />
              </ListItem>
            </List>
          </Paper>
        )}

        {/* Wetterdaten */}
        {weatherData && (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Aktuelle Wetterdaten
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="Temperatur"
                  secondary={`${weatherData.temperature}°C (gefühlt: ${weatherData.feelsLike}°C)`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Beschreibung"
                  secondary={weatherData.description}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Luftfeuchtigkeit"
                  secondary={`${weatherData.humidity}%`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Wind"
                  secondary={`${weatherData.windSpeed} m/s aus ${weatherData.windDirection}°`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Sichtweite"
                  secondary={`${weatherData.visibility} m`}
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="Bewertung für Führungen"
                  secondary={
                    <Chip 
                      label={weatherData.suitability?.label || 'Unbekannt'} 
                      color={
                        weatherData.suitability?.level === 'optimal' ? 'success' :
                        weatherData.suitability?.level === 'bedingt' ? 'warning' : 'error'
                      }
                      size="small"
                    />
                  }
                />
              </ListItem>
            </List>
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default WeatherApiTest;
