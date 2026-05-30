// Error Boundary Komponente für bessere Fehlerbehandlung
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { 
  MdErrorOutline as ErrorOutline, 
  MdRefresh as Refresh, 
  MdExpandMore as ExpandMore,
  MdBugReport as BugReport 
} from 'react-icons/md';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary gefangen:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
            p: 3
          }}
        >
          <Paper
            elevation={3}
            sx={{
              maxWidth: 600,
              p: 4,
              textAlign: 'center'
            }}
          >
            <ErrorOutline 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                mb: 2 
              }} 
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Etwas ist schiefgelaufen
            </Typography>
            
            <Typography variant="body1" paragraph color="text.secondary">
              Es ist ein unerwarteter Fehler aufgetreten. Das Terminplanungsmodul 
              konnte nicht ordnungsgemäß geladen werden.
            </Typography>

            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="subtitle2">
                Fehlerdetails:
              </Typography>
              <Typography variant="body2" component="pre" sx={{ mt: 1 }}>
                {this.state.error && this.state.error.toString()}
              </Typography>
            </Alert>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <Accordion sx={{ mb: 3 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">
                    <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Debug-Informationen
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      textAlign: 'left',
                      fontSize: '0.75rem',
                      backgroundColor: 'grey.100',
                      p: 2,
                      borderRadius: 1,
                      overflow: 'auto',
                      maxHeight: 200
                    }}
                  >
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={this.handleRetry}
                startIcon={<Refresh />}
              >
                Erneut versuchen
              </Button>
              
              <Button
                variant="contained"
                onClick={this.handleReload}
                startIcon={<Refresh />}
                color="primary"
              >
                Seite neu laden
              </Button>
            </Box>

            <Typography 
              variant="caption" 
              display="block" 
              sx={{ mt: 3 }}
              color="text.secondary"
            >
              Falls das Problem weiterhin besteht, wenden Sie sich an den Support
              oder überprüfen Sie die Browser-Konsole für weitere Details.
            </Typography>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
