// Wetter-Service für echte Wetterdaten
import { FUEHRUNG_CONFIG } from '../utils/stiftGurkConfig';

// OpenWeatherMap API Konfiguration
const WEATHER_CONFIG = {
  API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY || 'demo_key', // Umgebungsvariable für API-Key
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  GEO_URL: 'https://api.openweathermap.org/geo/1.0',
  LOCATION: {
    // Stift Gurk Koordinaten
    lat: 46.8747,
    lon: 14.2947,
    name: 'Gurk, Kärnten, Österreich'
  },
  CACHE_DURATION: 10 * 60 * 1000, // 10 Minuten Cache
  LANGUAGE: 'de',
  UNITS: 'metric'
};

export class WeatherService {
  static cache = new Map();

  // Hauptmethode: Aktuelles Wetter abrufen
  static async getCurrentWeather(lat = WEATHER_CONFIG.LOCATION.lat, lon = WEATHER_CONFIG.LOCATION.lon) {
    const cacheKey = `current_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${WEATHER_CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${WEATHER_CONFIG.API_KEY}&units=${WEATHER_CONFIG.UNITS}&lang=${WEATHER_CONFIG.LANGUAGE}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Wetter-API Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      const processedData = this.processCurrentWeatherData(data);
      
      this.setCache(cacheKey, processedData);
      return processedData;
      
    } catch (error) {
      console.error('Fehler beim Laden der Wetterdaten:', error);
      return this.getFallbackWeatherData();
    }
  }

  // 5-Tage Wettervorhersage
  static async getForecast(lat = WEATHER_CONFIG.LOCATION.lat, lon = WEATHER_CONFIG.LOCATION.lon) {
    const cacheKey = `forecast_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const url = `${WEATHER_CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_CONFIG.API_KEY}&units=${WEATHER_CONFIG.UNITS}&lang=${WEATHER_CONFIG.LANGUAGE}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Forecast-API Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      const processedData = this.processForecastData(data);
      
      this.setCache(cacheKey, processedData);
      return processedData;
      
    } catch (error) {
      console.error('Fehler beim Laden der Vorhersage:', error);
      return this.getFallbackForecastData();
    }
  }

  // Wetter für ein bestimmtes Datum (nächste 5 Tage)
  static async getWeatherForDate(date, lat = WEATHER_CONFIG.LOCATION.lat, lon = WEATHER_CONFIG.LOCATION.lon) {
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Heute: Aktuelles Wetter
      return await this.getCurrentWeather(lat, lon);
    } else if (diffDays > 0 && diffDays <= 5) {
      // Nächste 5 Tage: Vorhersage
      const forecast = await this.getForecast(lat, lon);
      return forecast.days.find(day => {
        const dayDate = new Date(day.date);
        dayDate.setHours(0, 0, 0, 0);
        return dayDate.getTime() === targetDate.getTime();
      }) || forecast.days[0];
    } else {
      // Mehr als 5 Tage: Fallback-Daten
      return this.getFallbackWeatherData();
    }
  }

  // Verarbeitung der aktuellen Wetterdaten
  static processCurrentWeatherData(data) {
    return {
      location: `${data.name}, ${data.sys.country}`,
      date: new Date(),
      condition: this.translateCondition(data.weather[0].main),
      description: data.weather[0].description,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      tempMin: Math.round(data.main.temp_min),
      tempMax: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: Math.round(data.wind?.speed * 3.6) || 0, // m/s zu km/h
      windDirection: data.wind?.deg || 0,
      visibility: data.visibility ? Math.round(data.visibility / 1000) : 10, // m zu km
      cloudiness: data.clouds.all,
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      uvIndex: null, // Nicht in Current Weather API verfügbar
      precipitation: this.extractPrecipitation(data),
      rating: this.calculateWeatherRating(data.weather[0].main, data.main.temp, data.wind?.speed * 3.6)
    };
  }

  // Verarbeitung der Vorhersagedaten
  static processForecastData(data) {
    const dailyForecasts = new Map();
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = date.toDateString();
      
      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          conditions: [],
          temperatures: [],
          humidity: [],
          precipitation: 0,
          windSpeed: []
        });
      }
      
      const dayData = dailyForecasts.get(dateKey);
      dayData.conditions.push(item.weather[0].main);
      dayData.temperatures.push(item.main.temp);
      dayData.humidity.push(item.main.humidity);
      dayData.windSpeed.push(item.wind?.speed * 3.6 || 0);
      dayData.precipitation += this.extractPrecipitation(item);
    });

    const days = Array.from(dailyForecasts.values()).map(day => ({
      date: day.date,
      condition: this.getMostFrequentCondition(day.conditions),
      tempMin: Math.round(Math.min(...day.temperatures)),
      tempMax: Math.round(Math.max(...day.temperatures)),
      avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
      precipitation: Math.round(day.precipitation * 10) / 10,
      avgWindSpeed: Math.round(day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length),
      rating: this.calculateWeatherRating(
        this.getMostFrequentCondition(day.conditions),
        Math.max(...day.temperatures),
        Math.max(...day.windSpeed)
      )
    }));

    return {
      location: `${data.city.name}, ${data.city.country}`,
      days: days.slice(0, 5)
    };
  }

  // Wetter-Bedingungen übersetzen
  static translateCondition(condition) {
    const translations = {
      'Clear': 'Sonnig',
      'Clouds': 'Bewölkt',
      'Rain': 'Regen',
      'Drizzle': 'Nieselregen',
      'Thunderstorm': 'Gewitter',
      'Snow': 'Schnee',
      'Mist': 'Nebel',
      'Fog': 'Nebel',
      'Haze': 'Dunstig',
      'Dust': 'Staubig',
      'Sand': 'Sandsturm',
      'Ash': 'Vulkanasche',
      'Squall': 'Sturmböen',
      'Tornado': 'Tornado'
    };
    return translations[condition] || condition;
  }

  // Niederschlag extrahieren
  static extractPrecipitation(data) {
    const rain = data.rain?.['1h'] || data.rain?.['3h'] || 0;
    const snow = data.snow?.['1h'] || data.snow?.['3h'] || 0;
    return rain + snow;
  }

  // Häufigste Bedingung ermitteln
  static getMostFrequentCondition(conditions) {
    const frequency = {};
    conditions.forEach(condition => {
      frequency[condition] = (frequency[condition] || 0) + 1;
    });
    return Object.keys(frequency).reduce((a, b) => frequency[a] > frequency[b] ? a : b);
  }

  // Wetter-Bewertung für Führungen
  static calculateWeatherRating(condition, temperature, windSpeed) {
    const translatedCondition = this.translateCondition(condition);
    const { KRITISCH, BEDINGT } = FUEHRUNG_CONFIG.WETTER;
    
    // Kritische Bedingungen
    if (KRITISCH.includes(translatedCondition) || 
        temperature < 0 || temperature > 35 || 
        windSpeed > 50) {
      return { rating: 'kritisch', color: 'error', score: 1 };
    }
    
    // Bedingte Bedingungen
    if (BEDINGT.includes(translatedCondition) || 
        temperature < 5 || temperature > 30 || 
        windSpeed > 30) {
      return { rating: 'bedingt', color: 'warning', score: 2 };
    }
    
    // Optimale Bedingungen
    return { rating: 'optimal', color: 'success', score: 3 };
  }

  // Cache-Management
  static getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < WEATHER_CONFIG.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  static setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Fallback-Daten bei API-Fehlern
  static getFallbackWeatherData() {
    return {
      location: 'Gurk, Kärnten',
      date: new Date(),
      condition: 'Unbekannt',
      description: 'Wetterdaten nicht verfügbar',
      temperature: 15,
      feelsLike: 15,
      tempMin: 10,
      tempMax: 20,
      humidity: 60,
      pressure: 1013,
      windSpeed: 10,
      windDirection: 0,
      visibility: 10,
      cloudiness: 50,
      sunrise: new Date(),
      sunset: new Date(),
      uvIndex: 5,
      precipitation: 0,
      rating: { rating: 'unbekannt', color: 'default', score: 0 }
    };
  }

  static getFallbackForecastData() {
    const days = Array.from({ length: 5 }, (_, i) => ({
      date: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
      condition: 'Unbekannt',
      tempMin: 10,
      tempMax: 20,
      avgHumidity: 60,
      precipitation: 0,
      avgWindSpeed: 10,
      rating: { rating: 'unbekannt', color: 'default', score: 0 }
    }));

    return {
      location: 'Gurk, Kärnten',
      days
    };
  }

  // Standort-basierte Wettersuche
  static async searchLocation(query) {
    try {
      const url = `${WEATHER_CONFIG.GEO_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${WEATHER_CONFIG.API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Geocoding Fehler: ${response.status}`);
      }
      
      const data = await response.json();
      return data.map(location => ({
        name: location.name,
        country: location.country,
        state: location.state,
        lat: location.lat,
        lon: location.lon,
        displayName: `${location.name}${location.state ? `, ${location.state}` : ''}, ${location.country}`
      }));
      
    } catch (error) {
      console.error('Fehler bei der Ortssuche:', error);
      return [];
    }
  }

  // API-Key Validierung
  static async validateApiKey() {
    try {
      const response = await fetch(`${WEATHER_CONFIG.BASE_URL}/weather?lat=0&lon=0&appid=${WEATHER_CONFIG.API_KEY}`);
      return response.status !== 401;
    } catch {
      return false;
    }
  }

  // Debug-Funktion: API-Konfiguration anzeigen
  static getApiConfig() {
    return {
      hasApiKey: !!WEATHER_CONFIG.API_KEY && WEATHER_CONFIG.API_KEY !== 'demo_key',
      apiKeyPreview: WEATHER_CONFIG.API_KEY ? `${WEATHER_CONFIG.API_KEY.substring(0, 8)}...` : 'Nicht gesetzt',
      baseUrl: WEATHER_CONFIG.BASE_URL,
      location: WEATHER_CONFIG.LOCATION
    };
  }

  // Test-Funktion für API-Verbindung
  static async testConnection() {
    const config = this.getApiConfig();
    console.log('Wetter-API Konfiguration:', config);
    
    if (!config.hasApiKey) {
      return {
        success: false,
        message: 'API-Key nicht konfiguriert',
        config
      };
    }

    try {
      const isValid = await this.validateApiKey();
      if (!isValid) {
        return {
          success: false,
          message: 'API-Key ungültig',
          config
        };
      }

      const weather = await this.getCurrentWeather();
      return {
        success: true,
        message: 'API-Verbindung erfolgreich',
        data: weather,
        config
      };
    } catch (error) {
      return {
        success: false,
        message: `Verbindungsfehler: ${error.message}`,
        config
      };
    }
  }
}
