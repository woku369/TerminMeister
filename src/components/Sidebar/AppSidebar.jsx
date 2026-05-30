// Sidebar für TerminMeister
import React from 'react';
import { Drawer, Box, List, ListItemButton, ListItemIcon, ListItemText, Divider, Typography, IconButton } from '@mui/material';
import { MdSettings, MdCloud, MdStorage, MdSync, MdInfo } from 'react-icons/md';

const drawerWidth = 240;

const menuItems = [
  { label: 'Einstellungen', icon: <MdSettings />, key: 'settings' },
  { label: 'Cloud Sync', icon: <MdCloud />, key: 'cloud' },
  { label: 'NAS Sync', icon: <MdStorage />, key: 'nas' },
  { label: 'Synchronisationsstatus', icon: <MdSync />, key: 'syncstatus' },
  { label: 'Info', icon: <MdInfo />, key: 'info' }
];

const AppSidebar = ({ selected, onSelect }) => (
  <Drawer
    variant="permanent"
    anchor="left"
    sx={{
      width: drawerWidth,
      flexShrink: 0,
      [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#f7f7fa' }
    }}
  >
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo-Platzhalter */}
      <Box sx={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#e0e0e0', mb: 2 }}>
        <span style={{fontFamily: 'EskapadeFraktur, Cinzel, Crimson Text, serif', fontWeight: 700, fontSize: 28, letterSpacing: 0.5}}>
          <span style={{color: '#1A1A1A'}}>Termin</span><span style={{color: '#8B4513'}}>Meister</span>
        </span>
      </Box>
      <Divider />
      <List>
        {menuItems.map(item => (
          <ListItemButton key={item.key} selected={selected === item.key} onClick={() => onSelect(item.key)}>
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flexGrow: 1 }} />
      {/* Platz für weitere Elemente (z.B. Version, Logout) */}
      <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary', fontSize: 12 }}>
        © {new Date().getFullYear()} TerminMeister
      </Box>
    </Box>
  </Drawer>
);

export default AppSidebar;
