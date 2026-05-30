// Theme Provider für das Stift Gurk Design
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { KLOSTER_THEME } from '../../utils/stiftGurkConfig';

const stiftGurkTheme = createTheme({
  palette: {
    primary: KLOSTER_THEME.primary,
    secondary: KLOSTER_THEME.secondary,
    background: KLOSTER_THEME.background,
    text: KLOSTER_THEME.text,
    divider: KLOSTER_THEME.divider,
    success: KLOSTER_THEME.success,
    warning: KLOSTER_THEME.warning,
    error: KLOSTER_THEME.error,
    info: KLOSTER_THEME.info,
  },
  typography: {
    fontFamily: '"Crimson Text", "Georgia", "Times New Roman", serif',
    h1: {
      fontFamily: '"Cinzel", "Playfair Display", serif',
      fontWeight: 600,
      color: KLOSTER_THEME.primary.main,
    },
    h2: {
      fontFamily: '"Cinzel", "Playfair Display", serif',
      fontWeight: 500,
      color: KLOSTER_THEME.primary.main,
    },
    h3: {
      fontFamily: '"Cinzel", "Playfair Display", serif',
      fontWeight: 500,
      color: KLOSTER_THEME.primary.dark,
    },
    h4: {
      fontFamily: '"Crimson Text", serif',
      fontWeight: 600,
      color: KLOSTER_THEME.text.primary,
    },
    h5: {
      fontFamily: '"Crimson Text", serif',
      fontWeight: 500,
      color: KLOSTER_THEME.text.primary,
    },
    h6: {
      fontFamily: '"Crimson Text", serif',
      fontWeight: 500,
      color: KLOSTER_THEME.text.primary,
    },
    body1: {
      fontFamily: '"Crimson Text", "Georgia", serif',
      fontSize: '1.1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: '"Crimson Text", "Georgia", serif',
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: '"Crimson Text", serif',
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 2px 4px rgba(139, 69, 19, 0.1)',
    '0px 4px 8px rgba(139, 69, 19, 0.15)',
    '0px 6px 12px rgba(139, 69, 19, 0.2)',
    '0px 8px 16px rgba(139, 69, 19, 0.25)',
    '0px 10px 20px rgba(139, 69, 19, 0.3)',
    '0px 12px 24px rgba(139, 69, 19, 0.35)',
    '0px 14px 28px rgba(139, 69, 19, 0.4)',
    '0px 16px 32px rgba(139, 69, 19, 0.45)',
    '0px 18px 36px rgba(139, 69, 19, 0.5)',
    '0px 20px 40px rgba(139, 69, 19, 0.55)',
    '0px 22px 44px rgba(139, 69, 19, 0.6)',
    '0px 24px 48px rgba(139, 69, 19, 0.65)',
    '0px 26px 52px rgba(139, 69, 19, 0.7)',
    '0px 28px 56px rgba(139, 69, 19, 0.75)',
    '0px 30px 60px rgba(139, 69, 19, 0.8)',
    '0px 32px 64px rgba(139, 69, 19, 0.85)',
    '0px 34px 68px rgba(139, 69, 19, 0.9)',
    '0px 36px 72px rgba(139, 69, 19, 0.95)',
    '0px 38px 76px rgba(139, 69, 19, 1)',
    '0px 40px 80px rgba(139, 69, 19, 1)',
    '0px 42px 84px rgba(139, 69, 19, 1)',
    '0px 44px 88px rgba(139, 69, 19, 1)',
    '0px 46px 92px rgba(139, 69, 19, 1)',
    '0px 48px 96px rgba(139, 69, 19, 1)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: `linear-gradient(135deg, ${KLOSTER_THEME.background.default} 0%, ${KLOSTER_THEME.background.monastery} 50%, ${KLOSTER_THEME.background.garden} 100%)`,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: KLOSTER_THEME.background.paper,
          border: `1px solid ${KLOSTER_THEME.divider}`,
        },
        elevation1: {
          boxShadow: '0px 2px 8px rgba(139, 69, 19, 0.15)',
        },
        elevation2: {
          boxShadow: '0px 4px 12px rgba(139, 69, 19, 0.2)',
        },
        elevation3: {
          boxShadow: '0px 6px 16px rgba(139, 69, 19, 0.25)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: KLOSTER_THEME.primary.main,
          backgroundImage: `linear-gradient(45deg, ${KLOSTER_THEME.primary.main} 0%, ${KLOSTER_THEME.primary.light} 100%)`,
          color: KLOSTER_THEME.text.onPrimary,
          '& .MuiTypography-root': {
            color: KLOSTER_THEME.text.onPrimary,
          },
          '& .MuiIconButton-root': {
            color: KLOSTER_THEME.text.onPrimary,
          },
          '& .MuiButton-root': {
            color: KLOSTER_THEME.text.onPrimary,
          }
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"Crimson Text", serif',
          fontWeight: 600,
          fontSize: '1rem',
          textTransform: 'none',
          color: KLOSTER_THEME.text.primary,
          '&.Mui-selected': {
            color: KLOSTER_THEME.primary.main,
            fontWeight: 700,
          },
          '&:hover': {
            color: KLOSTER_THEME.primary.dark,
          }
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: '8px 24px',
          fontSize: '1rem',
          fontWeight: 600,
        },
        contained: {
          backgroundColor: KLOSTER_THEME.primary.main,
          color: KLOSTER_THEME.primary.contrastText,
          '&:hover': {
            backgroundColor: KLOSTER_THEME.primary.dark,
            boxShadow: '0px 4px 12px rgba(139, 69, 19, 0.3)',
          },
        },
        outlined: {
          borderColor: KLOSTER_THEME.primary.main,
          color: KLOSTER_THEME.primary.main,
          '&:hover': {
            backgroundColor: `${KLOSTER_THEME.primary.main}10`,
            borderColor: KLOSTER_THEME.primary.dark,
            color: KLOSTER_THEME.primary.dark,
          },
        },
        text: {
          color: KLOSTER_THEME.text.primary,
          '&:hover': {
            backgroundColor: `${KLOSTER_THEME.primary.main}08`,
            color: KLOSTER_THEME.primary.dark,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: KLOSTER_THEME.background.paper,
          border: `1px solid ${KLOSTER_THEME.divider}`,
          borderRadius: 12,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0px 8px 24px rgba(139, 69, 19, 0.2)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontFamily: '"Crimson Text", serif',
          fontWeight: 500,
        },
        colorPrimary: {
          backgroundColor: KLOSTER_THEME.primary.main,
          color: KLOSTER_THEME.primary.contrastText,
        },
        colorSecondary: {
          backgroundColor: KLOSTER_THEME.secondary.main,
          color: KLOSTER_THEME.secondary.contrastText,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputLabel-root': {
            color: KLOSTER_THEME.text.primary,
          },
          '& .MuiInputBase-input': {
            color: KLOSTER_THEME.text.primary,
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: KLOSTER_THEME.divider,
            },
            '&:hover fieldset': {
              borderColor: KLOSTER_THEME.primary.light,
            },
            '&.Mui-focused fieldset': {
              borderColor: KLOSTER_THEME.primary.main,
            },
          },
          '& .MuiFormHelperText-root': {
            color: KLOSTER_THEME.text.secondary,
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body2: {
          color: KLOSTER_THEME.text.primary,
        },
        caption: {
          color: KLOSTER_THEME.text.secondary,
        },
      },
    },
  },
});

const StiftGurkThemeProvider = ({ children }) => {
  return (
    <ThemeProvider theme={stiftGurkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default StiftGurkThemeProvider;
