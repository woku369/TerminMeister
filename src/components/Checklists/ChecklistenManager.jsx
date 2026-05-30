// ...entfernt: doppelte Deklaration von Card und CardContent...
// Checklisten-System für Führungen - Optimiert für die Praxis
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,  Alert,
  Grid,
  Divider,
  Tooltip
} from '@mui/material';
import {
  MdExpandMore as ExpandMore,
  MdCheckCircle as CheckCircle,
  MdRadioButtonUnchecked as RadioButtonUnchecked,
  MdPlaylistAddCheck as PlaylistAddCheck,
  MdAdd as Add,
  MdEdit as Edit,
  MdDelete as Delete,
  MdSave as Save,
  MdCancel as Cancel,
  MdAssignment as Assignment,
  MdSchedule as Schedule,
  MdLocationOn as LocationOn
} from 'react-icons/md';
import { CHECKLISTEN } from '../../utils/stiftGurkConfig';
import { storageUtils } from '../../utils/storage';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ChecklistenManager = ({ appointmentId, onProgress }) => {
  const [checklisten, setChecklisten] = useState(CHECKLISTEN);
  const [erledigteItems, setErledigteItems] = useState({});
  const [customItems, setCustomItems] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ text: '', kategorie: '' });

  // Verfügbare Checklisten-Sektionen (optimiert für die Praxis)
  const availableSections = {
    VOR_FUEHRUNG: { 
      name: 'Vorbereitung der Führung', 
      icon: <Assignment />,
      description: 'Alle Punkte zur optimalen Vorbereitung vor dem Termin'
    },
    NACH_FUEHRUNG: { 
      name: 'Nachbereitung der Führung', 
      icon: <PlaylistAddCheck />,
      description: 'Aufräumen und Nachbereitung nach erfolgter Führung'
    },
    QUALITAETS_KONTROLLE: { 
      name: 'Qualitätskontrolle', 
      icon: <CheckCircle />,
      description: 'Überprüfung und Dokumentation der Führungsqualität'
    }
  };

  // Component lifecycle hooks
  useEffect(() => {
    // Lade gespeicherten Fortschritt für diesen Termin
    if (appointmentId) {
      const savedProgress = storageUtils.getItem(`checklist_${appointmentId}`) || {};
      setErledigteItems(savedProgress);
    }
    
    // Lade benutzerdefinierte Items
    const savedCustomItems = storageUtils.getItem('custom_checklist_items') || [];
    setCustomItems(savedCustomItems);
  }, [appointmentId]);

  // Fortschritt an Parent-Komponente weiterleiten
  useEffect(() => {
    if (onProgress) {
      const totalItems = getTotalItemCount();
      const completedItems = getCompletedItemCount();
      const progressPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
      
      onProgress({        total: totalItems,
        completed: completedItems,
        percentage: progressPercent
      });
    }
  }, [erledigteItems, customItems, onProgress]);

  const loadChecklistProgress = () => {
    if (appointmentId) {
      const progress = storageUtils.getItem(`checklist_${appointmentId}`) || {};
      setErledigteItems(progress);
    }  };

  // Component lifecycle hooks
  useEffect(() => {
    // Lade gespeicherten Fortschritt für diesen Termin
    if (appointmentId) {
      const savedProgress = storageUtils.getItem(`checklist_${appointmentId}`) || {};
      setErledigteItems(savedProgress);
    }
    
    // Lade benutzerdefinierte Items
    loadCustomItems();
  }, [appointmentId]);

  const loadCustomItems = () => {
    const custom = storageUtils.getItem('custom_checklist_items') || [];
    setCustomItems(custom);
  };

  const saveProgress = (newProgress) => {
    if (appointmentId) {
      storageUtils.setItem(`checklist_${appointmentId}`, newProgress);
      setErledigteItems(newProgress);
      
      // Fortschritt berechnen und an Parent weitergeben
      if (onProgress) {
        const totalItems = getTotalItemCount();
        const completedItems = Object.values(newProgress).filter(Boolean).length;
        const percentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
        onProgress(percentage, completedItems, totalItems);
      }
    }
  };

  const handleItemToggle = (section, itemId) => {
    const key = `${section}_${itemId}`;
    const newProgress = {
      ...erledigteItems,
      [key]: !erledigteItems[key]
    };
    saveProgress(newProgress);
  };
  const getTotalItemCount = () => {
    return Object.values(checklisten).reduce((total, items) => total + items.length, 0) + customItems.length;
  };

  const getCompletedItemCount = () => {
    return Object.values(erledigteItems).filter(Boolean).length;
  };

  const getSectionProgress = (section) => {
    const sectionItems = checklisten[section] || [];
    const completedInSection = sectionItems.filter(item => 
      erledigteItems[`${section}_${item.id}`]
    ).length;
    return sectionItems.length > 0 ? (completedInSection / sectionItems.length) * 100 : 0;
  };

  const getSectionColor = (progress) => {
    if (progress === 100) return 'success';
    if (progress >= 50) return 'warning';
    return 'primary';
  };

  const handleAddCustomItem = () => {
    if (newItem.text.trim()) {
      const customItem = {
        id: `custom_${Date.now()}`,
        text: newItem.text,
        kategorie: newItem.kategorie || 'Benutzerdefiniert',
        isCustom: true
      };
      
      const updatedCustomItems = [...customItems, customItem];
      setCustomItems(updatedCustomItems);
      storageUtils.setItem('custom_checklist_items', updatedCustomItems);
      
      setNewItem({ text: '', kategorie: '' });
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteCustomItem = (itemId) => {
    const updatedCustomItems = customItems.filter(item => item.id !== itemId);
    setCustomItems(updatedCustomItems);
    storageUtils.setItem('custom_checklist_items', updatedCustomItems);
    
    // Entferne auch aus erledigten Items
    const newProgress = { ...erledigteItems };
    delete newProgress[`CUSTOM_${itemId}`];
    saveProgress(newProgress);  };

  // Termin-Details für Export abrufen
  const getAppointmentDetails = () => {
    if (!appointmentId) {
      return {
        title: 'Stift Gurk Führung',
        date: 'Nicht angegeben',
        duration: '2 Stunden',
        participants: 'Nicht angegeben',
        team: 'Nicht zugewiesen',
        stations: 'Garten, Mazeration, Shop',
        weather: null
      };
    }

    try {
      const appointments = storageUtils.getItem('appointments') || [];
      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      if (!appointment) {
        return {
          title: 'Termin nicht gefunden',
          date: 'Unbekannt',
          duration: '2 Stunden',
          participants: 'Nicht angegeben',
          team: 'Nicht zugewiesen',
          stations: 'Garten, Mazeration, Shop',
          weather: null
        };
      }

      // Team-Namen auflösen
      let teamName = 'Nicht zugewiesen';
      if (appointment.teamMembers && appointment.teamMembers.length > 0) {
        const teams = storageUtils.getItem('teams') || [];
        const teamNames = appointment.teamMembers
          .map(memberId => {
            const team = teams.find(t => t.id === memberId);
            return team ? team.name : null;
          })
          .filter(Boolean);
        teamName = teamNames.length > 0 ? teamNames.join(', ') : 'Nicht zugewiesen';
      }

      // Datum formatieren
      let formattedDate = 'Nicht angegeben';
      if (appointment.date) {
        const date = new Date(appointment.date);
        if (!isNaN(date.getTime())) {
          formattedDate = date.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }

      return {
        title: appointment.title || 'Stift Gurk Führung',
        date: formattedDate,
        duration: appointment.duration || '2 Stunden',
        participants: appointment.participants || 'Nicht angegeben',
        team: teamName,
        stations: appointment.stations || 'Garten, Mazeration, Shop',
        weather: appointment.weather || null
      };
    } catch (error) {
      console.warn('Fehler beim Laden der Termin-Details:', error);
      return {
        title: 'Fehler beim Laden',
        date: 'Unbekannt',
        duration: '2 Stunden',
        participants: 'Nicht angegeben',
        team: 'Nicht zugewiesen',
        stations: 'Garten, Mazeration, Shop',
        weather: null      };
    }
  };

  const resetChecklist = () => {
    if (appointmentId && window.confirm('Möchten Sie wirklich alle Checkboxen zurücksetzen?')) {
      storageUtils.removeItem(`checklist_${appointmentId}`);
      setErledigteItems({});
    }
  };  // PDF-Export für druckbares und verschickbares Handout - Verbesserte Version
  const exportChecklistAsPDF = async () => {
    try {
      const appointmentDetails = getAppointmentDetails();
      const today = new Date();
      const totalProgress = getTotalItemCount() > 0 ? (getCompletedItemCount() / getTotalItemCount()) * 100 : 0;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margins = { left: 15, right: 15, top: 20, bottom: 20 };
      const contentWidth = pageWidth - margins.left - margins.right;
      let currentY = margins.top;
      
      // Professioneller Header mit Corporate Design
      const addHeader = (isFirstPage = true) => {
        // Farbiger Header-Bereich
        pdf.setFillColor(139, 69, 19); // Stift Gurk Braun
        pdf.rect(0, 0, pageWidth, 45, 'F');
        
        // Logo/Icon-Bereich
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(24);
        pdf.setFont('helvetica', 'bold');
        pdf.text('🌿', margins.left, 25);
        
        // Titel
        pdf.setFontSize(18);
        pdf.text('Stift Gurk', margins.left + 15, 25);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Führungs-Checkliste', margins.left + 15, 35);
        
        // Datum rechts
        pdf.setFontSize(10);
        pdf.text(`Erstellt: ${today.toLocaleDateString('de-DE')}`, pageWidth - margins.right - 40, 25);
        pdf.text(`Seite ${pdf.internal.getCurrentPageInfo().pageNumber}`, pageWidth - margins.right - 20, 35);
        
        return 55; // Neue Y-Position nach Header
      };
      
      // Erste Seite Header
      currentY = addHeader(true);
      
      // Termin-Details Box
      pdf.setFillColor(253, 245, 230); // Helles Beige
      pdf.setDrawColor(218, 165, 32); // Gold
      pdf.rect(margins.left, currentY, contentWidth, 45, 'FD');
      
      pdf.setTextColor(139, 69, 19);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📅 Termin-Details', margins.left + 5, currentY + 8);
      
      // Details in zwei Spalten
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const leftCol = margins.left + 5;
      const rightCol = margins.left + contentWidth / 2 + 5;
      const detailsY = currentY + 18;
      
      pdf.text(`Titel: ${appointmentDetails.title || 'Stift Gurk Führung'}`, leftCol, detailsY);
      pdf.text(`Teilnehmer: ${appointmentDetails.participants || 'Nicht angegeben'}`, rightCol, detailsY);
      
      pdf.text(`Datum: ${appointmentDetails.date || 'Nicht angegeben'}`, leftCol, detailsY + 8);
      pdf.text(`Team: ${appointmentDetails.team || 'Nicht zugewiesen'}`, rightCol, detailsY + 8);
      
      pdf.text(`Dauer: ${appointmentDetails.duration || '2 Stunden'}`, leftCol, detailsY + 16);
      pdf.text(`Stationen: ${appointmentDetails.stations || 'Garten, Mazeration'}`, rightCol, detailsY + 16);
      
      currentY += 55;
      
      // Gesamtfortschritt
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margins.left, currentY, contentWidth, 15, 'F');
      
      pdf.setTextColor(139, 69, 19);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📊 Gesamtfortschritt', margins.left + 5, currentY + 8);
      
      // Fortschrittsbalken
      const progressBarWidth = contentWidth - 80;
      const progressBarX = margins.left + 70;
      const progressBarY = currentY + 3;
      
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(progressBarX, progressBarY, progressBarWidth, 8);
      
      pdf.setFillColor(34, 139, 34); // Grün
      pdf.rect(progressBarX, progressBarY, (progressBarWidth * totalProgress) / 100, 8, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(9);
      pdf.text(`${Math.round(totalProgress)}%`, progressBarX + progressBarWidth + 5, progressBarY + 6);
      
      currentY += 25;
      
      // Checklisten-Sektionen
      Object.entries(availableSections).forEach(([sectionKey, section]) => {
        const items = checklisten[sectionKey] || [];
        if (items.length === 0) return;
        
        const sectionProgress = getSectionProgress(sectionKey);
        const sectionHeight = calculateSectionHeight(items);
        
        // Prüfe ob neue Seite benötigt wird
        if (currentY + sectionHeight > pageHeight - margins.bottom - 20) {
          pdf.addPage();
          currentY = addHeader(false);
        }
        
        // Sektion Header
        pdf.setFillColor(34, 139, 34); // Grün
        pdf.rect(margins.left, currentY, contentWidth, 12, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`📋 ${section.name}`, margins.left + 5, currentY + 8);
        
        // Fortschritt der Sektion
        pdf.setFontSize(9);
        pdf.text(`${Math.round(sectionProgress)}%`, pageWidth - margins.right - 20, currentY + 8);
        
        currentY += 15;
        
        // Beschreibung
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text(section.description, margins.left + 5, currentY);
        
        currentY += 12;
        
        // Items
        items.forEach((item, index) => {
          const isCompleted = erledigteItems[`${sectionKey}_${item.id}`];
          const itemHeight = 12;
          
          // Prüfe ob neue Seite benötigt wird für einzelnes Item
          if (currentY + itemHeight > pageHeight - margins.bottom - 10) {
            pdf.addPage();
            currentY = addHeader(false);
          }
          
          // Item Hintergrund
          if (isCompleted) {
            pdf.setFillColor(232, 245, 233);
          } else {
            pdf.setFillColor(255, 255, 255);
          }
          pdf.setDrawColor(224, 224, 224);
          pdf.rect(margins.left, currentY, contentWidth, itemHeight, 'FD');
          
          // Checkbox
          const checkboxSize = 8;
          const checkboxX = margins.left + 5;
          const checkboxY = currentY + 2;
          
          pdf.setDrawColor(139, 69, 19);
          pdf.setLineWidth(0.5);
          pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
          
          if (isCompleted) {
            pdf.setTextColor(34, 139, 34);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('✓', checkboxX + 2, checkboxY + 6.5);
          }
          
          // Item Text
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.text, checkboxX + checkboxSize + 8, currentY + 7);
          
          // Kategorie Tag
          if (item.kategorie) {
            const tagText = item.kategorie;
            const tagWidth = pdf.getTextWidth(tagText) + 6;
            const tagX = pageWidth - margins.right - tagWidth - 5;
            
            pdf.setFillColor(245, 245, 245);
            pdf.setDrawColor(200, 200, 200);
            pdf.rect(tagX, currentY + 2, tagWidth, 8, 'FD');
            
            pdf.setTextColor(100, 100, 100);
            pdf.setFontSize(8);
            pdf.text(tagText, tagX + 3, currentY + 7);
          }
          
          currentY += itemHeight + 2;
        });
        
        currentY += 10; // Abstand zwischen Sektionen
      });
      
      // Benutzerdefinierte Items
      if (customItems.length > 0) {
        const customSectionHeight = calculateSectionHeight(customItems) + 30;
        
        if (currentY + customSectionHeight > pageHeight - margins.bottom - 20) {
          pdf.addPage();
          currentY = addHeader(false);
        }
        
        // Custom Header
        pdf.setFillColor(255, 152, 0); // Orange
        pdf.rect(margins.left, currentY, contentWidth, 12, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('➕ Benutzerdefinierte Punkte', margins.left + 5, currentY + 8);
        
        currentY += 15;
        
        customItems.forEach((item) => {
          const isCompleted = erledigteItems[`CUSTOM_${item.id}`];
          const itemHeight = 12;
          
          if (currentY + itemHeight > pageHeight - margins.bottom - 10) {
            pdf.addPage();
            currentY = addHeader(false);
          }
          
          // Item rendern (gleiche Logik wie oben)
          if (isCompleted) {
            pdf.setFillColor(232, 245, 233);
          } else {
            pdf.setFillColor(255, 255, 255);
          }
          pdf.setDrawColor(224, 224, 224);
          pdf.rect(margins.left, currentY, contentWidth, itemHeight, 'FD');
          
          const checkboxSize = 8;
          const checkboxX = margins.left + 5;
          const checkboxY = currentY + 2;
          
          pdf.setDrawColor(139, 69, 19);
          pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
          
          if (isCompleted) {
            pdf.setTextColor(34, 139, 34);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('✓', checkboxX + 2, checkboxY + 6.5);
          }
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.text(item.text, checkboxX + checkboxSize + 8, currentY + 7);
          
          currentY += itemHeight + 2;
        });
        
        currentY += 10;
      }
      
      // Notizbereich
      const notesHeight = 60;
      if (currentY + notesHeight > pageHeight - margins.bottom - 20) {
        pdf.addPage();
        currentY = addHeader(false);
      }
      
      pdf.setFillColor(250, 250, 250);
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margins.left, currentY, contentWidth, notesHeight, 'FD');
      
      pdf.setTextColor(139, 69, 19);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📝 Notizen & Besonderheiten', margins.left + 5, currentY + 10);
      
      // Linien für Notizen
      pdf.setDrawColor(220, 220, 220);
      for (let i = 0; i < 6; i++) {
        const lineY = currentY + 20 + (i * 6);
        pdf.line(margins.left + 5, lineY, pageWidth - margins.right - 5, lineY);
      }
      
      // Footer
      const addFooter = () => {
        const footerY = pageHeight - 15;
        
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(8);
        pdf.text('Stift Gurk Terminplanungsmodul', margins.left, footerY);
        pdf.text(`Gesamtfortschritt: ${Math.round(totalProgress)}%`, pageWidth / 2, footerY, { align: 'center' });
        pdf.text(`Export: ${today.toLocaleString('de-DE')}`, pageWidth - margins.right, footerY, { align: 'right' });
      };
      
      // Footer zu allen Seiten hinzufügen
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        addFooter();
      }
      
      // Dateiname und speichern
      const fileName = `Fuehrungscheckliste_${appointmentDetails.title?.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_') || 'Termin'}_${today.toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Fehler beim PDF-Export:', error);
      alert('Fehler beim Erstellen der PDF-Datei. Bitte versuchen Sie es erneut.');
    }
  };
  
  // Hilfsfunktion zur Berechnung der Sektionshöhe
  const calculateSectionHeight = (items) => {
    return (items.length * 14) + 40; // 14px pro Item + Header/Spacing
  };

  // HTML-Export als Fallback
  const exportChecklist = () => {
    // Erstelle druckbares HTML-Handout
    const appointmentDetails = getAppointmentDetails();
    const today = new Date();
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Führungs-Checkliste - ${appointmentDetails.title || 'Unbekannter Termin'}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            color: #333;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #8B4513;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #8B4513;
            margin: 0;
            font-size: 28px;
        }
        .header h2 {
            color: #228B22;
            margin: 5px 0;
            font-size: 18px;
        }
        .appointment-info {
            background: #FDF5E6;
            border: 1px solid #DAA520;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .appointment-info h3 {
            color: #8B4513;
            margin-top: 0;
            border-bottom: 1px solid #DAA520;
            padding-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #654321;
            font-size: 14px;
        }
        .info-value {
            color: #333;
            margin-top: 3px;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section h3 {
            color: #8B4513;
            border-bottom: 2px solid #228B22;
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .checklist-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            padding: 10px;
            background: ${erledigteItems[`VOR_FUEHRUNG_wetter_check`] ? '#e8f5e8' : '#fff'};
            border: 1px solid #e0e0e0;
            border-radius: 4px;
        }
        .checkbox {
            width: 18px;
            height: 18px;
            border: 2px solid #8B4513;
            margin-right: 12px;
            margin-top: 2px;
            flex-shrink: 0;
        }
        .checkbox.checked {
            background: #228B22;
            position: relative;
        }
        .checkbox.checked::after {
            content: '✓';
            color: white;
            font-weight: bold;
            position: absolute;
            left: 2px;
            top: -2px;
        }
        .item-content {
            flex-grow: 1;
        }
        .item-text {
            font-weight: 500;
            margin-bottom: 5px;
        }
        .item-category {
            font-size: 12px;
            color: #666;
            background: #f5f5f5;
            padding: 2px 8px;
            border-radius: 12px;
            display: inline-block;
        }
        .progress-bar {
            height: 8px;
            background: #e0e0e0;
            border-radius: 4px;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: #228B22;
            border-radius: 4px;
            transition: width 0.3s ease;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #e0e0e0;
            padding-top: 20px;
        }
        .notes-section {
            margin-top: 30px;
            border: 1px dashed #8B4513;
            padding: 20px;
            background: #fafafa;
        }
        .notes-section h4 {
            margin-top: 0;
            color: #8B4513;
        }
        .notes-lines {
            border-bottom: 1px solid #ccc;
            height: 20px;
            margin-bottom: 10px;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .appointment-info { background: white !important; }
            .checklist-item { background: white !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🌿 Stift Gurk Führungs-Checkliste</h1>
        <h2>Kräutergarten & Mazerationsraum</h2>
        <p>Erstellt am: ${today.toLocaleDateString('de-DE', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
    </div>

    <div class="appointment-info">
        <h3>📅 Termin-Details</h3>
        <div class="info-grid">
            <div class="info-item">
                <span class="info-label">Titel:</span>
                <span class="info-value">${appointmentDetails.title || 'Stift Gurk Führung'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Datum & Zeit:</span>
                <span class="info-value">${appointmentDetails.date || 'Nicht angegeben'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Dauer:</span>
                <span class="info-value">${appointmentDetails.duration || '2 Stunden'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Teilnehmer:</span>
                <span class="info-value">${appointmentDetails.participants || 'Nicht angegeben'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Team:</span>
                <span class="info-value">${appointmentDetails.team || 'Nicht zugewiesen'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">Stationen:</span>
                <span class="info-value">${appointmentDetails.stations || 'Garten, Mazeration, Shop'}</span>
            </div>
        </div>
        ${appointmentDetails.weather ? `
        <div style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px;">
            <strong>🌤️ Wetter:</strong> ${appointmentDetails.weather}
        </div>` : ''}
    </div>

    ${Object.entries(availableSections).map(([sectionKey, section]) => {
      const items = checklisten[sectionKey] || [];
      const sectionProgress = getSectionProgress(sectionKey);
      
      return `
    <div class="section">
        <h3>${section.icon ? '📋' : ''} ${section.name}</h3>
        <p style="color: #666; font-style: italic;">${section.description}</p>
        
        <div class="progress-bar">
            <div class="progress-fill" style="width: ${sectionProgress}%"></div>
        </div>
        <p style="font-size: 14px; color: #666;">Fortschritt: ${Math.round(sectionProgress)}% (${items.filter(item => erledigteItems[`${sectionKey}_${item.id}`]).length}/${items.length} erledigt)</p>
        
        ${items.map(item => `
        <div class="checklist-item">
            <div class="checkbox ${erledigteItems[`${sectionKey}_${item.id}`] ? 'checked' : ''}"></div>
            <div class="item-content">
                <div class="item-text">${item.text}</div>
                <span class="item-category">${item.kategorie}</span>
            </div>
        </div>
        `).join('')}
    </div>`;
    }).join('')}

    ${customItems.length > 0 ? `
    <div class="section">
        <h3>➕ Benutzerdefinierte Punkte</h3>
        ${customItems.map(item => `
        <div class="checklist-item">
            <div class="checkbox ${erledigteItems[`CUSTOM_${item.id}`] ? 'checked' : ''}"></div>
            <div class="item-content">
                <div class="item-text">${item.text}</div>
                <span class="item-category">${item.kategorie}</span>
            </div>
        </div>
        `).join('')}
    </div>` : ''}

    <div class="notes-section">
        <h4>📝 Notizen & Besonderheiten</h4>
        ${Array.from({length: 8}, () => '<div class="notes-lines"></div>').join('')}
    </div>

    <div class="footer">
        <p><strong>Stift Gurk Terminplanungsmodul</strong> | 
        Exportiert am ${today.toLocaleString('de-DE')} | 
        Gesamtfortschritt: ${Math.round(totalProgress)}%</p>
        <p style="margin-top: 10px;">
        💡 <em>Tipp: Haken Sie erledigte Punkte ab und nutzen Sie den Notizbereich für wichtige Details!</em>
        </p>
    </div>
</body>
</html>`;

    // Erstelle Download
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Fuehrungscheckliste_${appointmentDetails.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'Termin'}_${today.toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderChecklistSection = (sectionKey, title, icon) => {
    const items = checklisten[sectionKey] || [];
    const progress = getSectionProgress(sectionKey);
    const color = getSectionColor(progress);

    return (
      <Accordion key={sectionKey} defaultExpanded={sectionKey === 'VOR_FUEHRUNG'}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            {icon}
            <Typography variant="h6">{title}</Typography>
            <Box sx={{ flexGrow: 1, mx: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                color={color}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </Box>
            <Chip 
              label={`${Math.round(progress)}%`}
              color={color}
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1}>
            {items.map((item) => {
              const isCompleted = erledigteItems[`${sectionKey}_${item.id}`];
              return (
                <Grid item xs={12} key={item.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isCompleted || false}
                        onChange={() => handleItemToggle(sectionKey, item.id)}
                        icon={<RadioButtonUnchecked />}
                        checkedIcon={<CheckCircle />}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            textDecoration: isCompleted ? 'line-through' : 'none',
                            color: isCompleted ? 'text.secondary' : 'text.primary'
                          }}
                        >
                          {item.text}
                        </Typography>
                        <Chip 
                          label={item.kategorie} 
                          size="small" 
                          variant="outlined"
                          sx={{ ml: 1, fontSize: '0.7rem' }}
                        />
                      </Box>
                    }
                    sx={{ 
                      width: '100%',
                      ml: 0,
                      '& .MuiFormControlLabel-label': { width: '100%' }
                    }}
                  />
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderCustomItems = () => {
    if (customItems.length === 0) return null;

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Add />
            <Typography variant="h6">Benutzerdefinierte Punkte</Typography>
            <Chip 
              label={customItems.length}
              color="info"
              size="small"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={1}>
            {customItems.map((item) => {
              const isCompleted = erledigteItems[`CUSTOM_${item.id}`];
              return (
                <Grid item xs={12} key={item.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isCompleted || false}
                          onChange={() => handleItemToggle('CUSTOM', item.id)}
                          icon={<RadioButtonUnchecked />}
                          checkedIcon={<CheckCircle />}
                          color="primary"
                        />
                      }
                      label={
                        <Box>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              textDecoration: isCompleted ? 'line-through' : 'none',
                              color: isCompleted ? 'text.secondary' : 'text.primary'
                            }}
                          >
                            {item.text}
                          </Typography>
                          <Chip 
                            label={item.kategorie} 
                            size="small" 
                            variant="outlined"
                            sx={{ ml: 1, fontSize: '0.7rem' }}
                          />
                        </Box>
                      }
                      sx={{ flexGrow: 1 }}
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteCustomItem(item.id)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </AccordionDetails>
      </Accordion>
    );
  };

  const totalProgress = getTotalItemCount() > 0 ? (getCompletedItemCount() / getTotalItemCount()) * 100 : 0;

  return (
    <Box>
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assignment />
              Führungs-Checkliste
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>              <Button
                variant="outlined"
                size="small"
                onClick={() => setIsAddDialogOpen(true)}
                startIcon={<Add />}
              >
                Punkt hinzufügen
              </Button>              <Tooltip title="Erstellt eine verschickbare PDF-Datei mit allen Termin-Details">
                <Button
                  variant="contained"
                  size="small"
                  onClick={exportChecklistAsPDF}
                  startIcon={<Save />}
                  color="primary"
                >
                  Als PDF exportieren
                </Button>
              </Tooltip>
              <Tooltip title="Erstellt eine HTML-Datei als Backup">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={exportChecklist}
                  startIcon={<Save />}
                  color="secondary"
                >
                  Als HTML exportieren
                </Button>
              </Tooltip>
            </Box>
          </Box>          <Alert severity={totalProgress === 100 ? 'success' : 'info'} sx={{ mb: 2 }}>
            <Typography variant="subtitle2">
              Gesamtfortschritt: {getCompletedItemCount()} von {getTotalItemCount()} Punkten erledigt
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={totalProgress} 
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
              color={totalProgress === 100 ? 'success' : 'primary'}
            />
          </Alert>          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              💡 <strong>Optimiert für die Praxis:</strong> Checklisten für "Während der Führung" wurden entfernt, 
              da niemand Zeit hat, diese während der aktiven Führung abzuhaken. 
              Stattdessen fokussieren wir uns auf sinnvolle Vor- und Nachbereitung sowie Qualitätskontrolle.
              <br /><br />
              📄 <strong>Export-Funktionen:</strong> PDF-Export für einfaches Versenden und Archivieren, 
              HTML-Export als Backup. Beide enthalten alle Termin-Details, Checklisten-Punkte und einen Notizbereich.
            </Typography>
          </Alert>
        </CardContent>
      </Card>      {/* Optimierte Checklisten-Sektionen */}
      {Object.entries(availableSections).map(([sectionKey, section]) => 
        renderChecklistSection(sectionKey, section.name, section.icon)
      )}
      {renderCustomItems()}

      {/* Add Custom Item Dialog */}
      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Neuen Checklisten-Punkt hinzufügen</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Beschreibung"
            fullWidth
            variant="outlined"
            value={newItem.text}
            onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Kategorie"
            fullWidth
            variant="outlined"
            value={newItem.kategorie}
            onChange={(e) => setNewItem({ ...newItem, kategorie: e.target.value })}
            placeholder="z.B. Vorbereitung, Material, Sicherheit..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} startIcon={<Cancel />}>
            Abbrechen
          </Button>
          <Button onClick={handleAddCustomItem} variant="contained" startIcon={<Save />}>
            Hinzufügen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChecklistenManager;
