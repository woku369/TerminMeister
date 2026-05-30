// ...entfernt: doppelte Deklaration von Card und CardContent...
// Wetter-Service für Führungsplanung
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Tooltip,
  IconButton,
  LinearProgress,
  Chip,
  Grid,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Paper,
  Button
} from '@mui/material';
import { WeatherService } from '../../services/weatherService';
import { DateUtils } from '../../utils/dateUtils';

const getWeatherIcon = (condition) => {
  const iconMap = {
    'Clear': <WbSunnyIcon sx={{ color: '#FFD700' }} />, 
    'Clouds': <CloudIcon sx={{ color: '#808080' }} />, 
    'Rain': <GrainIcon sx={{ color: '#1E90FF' }} />, 
    'Drizzle': <GrainIcon sx={{ color: '#4682B4' }} />, 
    'Thunderstorm': <ThunderstormIcon sx={{ color: '#8B0000' }} />, 
    'Snow': <AcUnitIcon sx={{ color: '#B0E0E6' }} />, 
    'Mist': <CloudQueueIcon sx={{ color: '#696969' }} />, 
    'Fog': <CloudQueueIcon sx={{ color: '#A9A9A9' }} />
  };
  return iconMap[condition] || <CloudQueueIcon sx={{ color: '#808080' }} />;
};

const getWeatherRating = (condition, windSpeed = 0, precipitation = 0) => {
  // Bewertung basierend auf Wetterbedingungen
  if (condition === 'Thunderstorm' || windSpeed > 25 || precipitation > 10) {
    return {
      rating: 'kritisch',
      color: 'error',
      icon: <CancelIcon color="error" />
    };
  }
  
  if (condition === 'Rain' || condition === 'Snow' || windSpeed > 15 || precipitation > 5) {
    return {
      rating: 'bedingt',
      color: 'warning',
      icon: <WarningIcon color="warning" />
    };
  }
  
  return {
    rating: 'optimal',
    color: 'success',
    icon: <CheckCircleIcon color="success" />
  };
};

const WetterWidget = ({ date, onWeatherChange, showForecast = false }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);
  const loadWeatherData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let weather;
      
      // Vereinfachte Datumslogik
      const today = new Date();
      const targetDate = date ? new Date(date) : today;
      const isToday = targetDate.toDateString() === today.toDateString();
      
      if (isToday) {
        // Für heute: Verwende aktuelles Wetter
        weather = await WeatherService.getCurrentWeather();
      } else {
        // Für zukünftige Termine: Verwende Forecast
        weather = await WeatherService.getWeatherForDate(targetDate);
      }
        if (weather) {
        const processedData = {
          temperature: Math.round(weather.main?.temp || 0),
          description: weather.weather?.[0]?.description || 'Unbekannt',
          icon: weather.weather?.[0]?.icon || '01d',
          condition: weather.weather?.[0]?.main || 'Clear',
          humidity: weather.main?.humidity || 0,
          windSpeed: Math.round((weather.wind?.speed || 0) * 3.6), // m/s zu km/h
          precipitation: weather.rain?.['1h'] || weather.snow?.['1h'] || 0
        };
        
        setWeatherData(processedData);
        setLastUpdate(new Date());
        
        // Callback für Parent-Komponente
        if (onWeatherChange && typeof onWeatherChange === 'function') {
          const rating = getWeatherRating(
            processedData.condition, 
            processedData.windSpeed, 
            processedData.precipitation
          );
          onWeatherChange(processedData, rating);
        }
      } else {
        // Fallback: Zeige Demo-Daten bei fehlenden Wetterdaten
        const fallbackData = {
          temperature: 20,
          description: 'Bewölkt',
          icon: '03d',
          condition: 'Clouds',
          humidity: 65,
          windSpeed: 10,
          precipitation: 0
        };
        setWeatherData(fallbackData);
        setLastUpdate(new Date());
      }
      
    } catch (err) {
      console.error('Fehler beim Laden der Wetterdaten:', err);
      setError('Wetterdaten konnten nicht geladen werden. Überprüfen Sie Ihre Internetverbindung.');
    } finally {
      setLoading(false);
    }
  };  useEffect(() => {
    // Debounce um mehrfache Aufrufe zu vermeiden
    const timer = setTimeout(() => {
      loadWeatherData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [date]);

  if (error) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="error">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData && !loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            Wählen Sie ein Datum für die Wetterprognose
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Wetterprognose wird geladen...
          </Typography>
          <LinearProgress sx={{ mt: 2 }} />
        </CardContent>
      </Card>
    );
  }

  const weatherRating = getWeatherRating(
    weatherData.condition, 
    weatherData.windSpeed, 
    weatherData.precipitation
  );

  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Wetterprognose
          </Typography>
          <Tooltip title="Aktualisieren">
            <IconButton onClick={loadWeatherData} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Alert 
          severity={weatherRating.color} 
          icon={weatherRating.icon}
          sx={{ mb: 2 }}
        >
          <Typography variant="subtitle2">
            Führungsbedingungen: {weatherRating.rating.toUpperCase()}
          </Typography>
          <Typography variant="body2">
            {weatherRating.rating === 'kritisch' && 'Führung im Garten könnte schwierig werden. Alternative Innenräume nutzen.'}
            {weatherRating.rating === 'bedingt' && 'Führung möglich, aber Gartenbesichtigung ggf. verkürzen.'}
            {weatherRating.rating === 'optimal' && 'Ideale Bedingungen für die komplette Führung.'}
          </Typography>
        </Alert>        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {getWeatherIcon(weatherData.condition)}
              <Typography variant="h5">
                {weatherData.temperature}°C
              </Typography>
              <Chip 
                label={weatherData.description}
                color={weatherRating.color}
                size="small"
              />
            </Box>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WaterIcon fontSize="small" />
                <Typography variant="body2">
                  Luftfeuchtigkeit: {weatherData.humidity}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AirIcon fontSize="small" />
                <Typography variant="body2">
                  Wind: {weatherData.windSpeed} km/h
                </Typography>
              </Box>
              {weatherData.precipitation > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Grain fontSize="small" />
                  <Typography variant="body2">
                    Niederschlag: {weatherData.precipitation.toFixed(1)}mm
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {lastUpdate && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Letzte Aktualisierung: {lastUpdate.toLocaleTimeString()}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default WetterWidget;
