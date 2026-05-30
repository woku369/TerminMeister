// Multi-Client Demo für OneDrive-Synchronisation
// Diese Datei zeigt, wie mehrere Clients gleichzeitig arbeiten können

import { StorageService, storageUtils } from '../utils/storage';
import { cloudStorage } from '../services/cloudStorageService';

export class MultiClientDemo {
  static async demonstrateMultiClient() {
    console.log('=== Multi-Client-Demo startet ===');
    
    // 1. Client-ID anzeigen
    const clientId = StorageService.getClientId();
    console.log(`Aktuelle Client-ID: ${clientId}`);
    
    // 2. Demo-Termin erstellen
    const demoAppointment = {
      id: `demo_${Date.now()}`,
      title: 'Multi-Client Test Termin',
      description: 'Termin erstellt für Multi-Client-Test',
      start: new Date(),
      end: new Date(Date.now() + 60 * 60 * 1000), // 1 Stunde später
      type: 'führung',
      createdAt: new Date(),
      updatedAt: new Date(),
      clientId: clientId
    };
    
    // 3. Termin speichern (löst automatisch Cloud-Sync aus)
    console.log('Speichere Demo-Termin...');
    StorageService.addAppointment(demoAppointment);
    
    // 4. Cloud-Status prüfen
    const cloudStatus = cloudStorage.getStatus();
    console.log('Cloud-Status:', cloudStatus);
    
    // 5. Manuelle Synchronisation
    console.log('Starte manuelle Synchronisation...');
    await cloudStorage.manualSync();
    
    // 6. Backup erstellen
    const backupKey = StorageService.createBackup();
    console.log(`Backup erstellt: ${backupKey}`);
    
    // 7. Verfügbare Backups anzeigen
    const backups = StorageService.getAvailableBackups();
    console.log('Verfügbare Backups:', backups);
    
    console.log('=== Multi-Client-Demo beendet ===');
    
    return {
      clientId,
      cloudStatus,
      demoAppointment,
      backupKey,
      backups
    };
  }
  
  static simulateSecondClient() {
    console.log('=== Simuliere zweiten Client ===');
    
    // Neue Client-ID generieren
    localStorage.removeItem('client_id');
    const newClientId = StorageService.getClientId();
    console.log(`Neuer Client: ${newClientId}`);
    
    // Lokale Daten laden
    const appointments = StorageService.getAppointments();
    console.log(`Gefundene Termine: ${appointments.length}`);
    
    // Demo-Konflikt erzeugen
    if (appointments.length > 0) {
      const firstAppointment = appointments[0];
      const modifiedAppointment = {
        ...firstAppointment,
        title: `${firstAppointment.title} - Bearbeitet von ${newClientId}`,
        updatedAt: new Date(),
        clientId: newClientId
      };
      
      StorageService.updateAppointment(modifiedAppointment);
      console.log('Termin vom zweiten Client bearbeitet');
    }
    
    return newClientId;
  }
  
  static async testConflictResolution() {
    console.log('=== Teste Konfliktauflösung ===');
    
    try {
      // Cloud-Synchronisation mit Konfliktauflösung
      await cloudStorage.manualSync();
      
      const finalAppointments = StorageService.getAppointments();
      console.log('Termine nach Konfliktauflösung:', finalAppointments);
      
      return finalAppointments;
    } catch (error) {
      console.error('Fehler bei Konfliktauflösung:', error);
      return [];
    }
  }
  
  static getSystemInfo() {
    return {
      clientId: StorageService.getClientId(),
      cloudStatus: cloudStorage.getStatus(),
      storageInfo: StorageService.getStorageInfo(),
      appointments: StorageService.getAppointments().length,
      participants: StorageService.getParticipants().length,
      reminders: StorageService.getReminders().length
    };
  }
}

// Export für Verwendung in der Konsole
window.MultiClientDemo = MultiClientDemo;

export default MultiClientDemo;
