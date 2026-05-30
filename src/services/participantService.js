// Service für Teilnehmerverwaltung
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../utils/storage.js';

export class ParticipantService {
  static getAllParticipants() {
    return StorageService.getParticipants();
  }

  static getParticipantById(id) {
    const participants = this.getAllParticipants();
    return participants.find(p => p.id === id);
  }

  static createParticipant(participantData) {
    // Prüfe auf doppelte E-Mail-Adressen
    if (participantData.email) {
      const existingParticipant = this.getParticipantByEmail(participantData.email);
      if (existingParticipant) {
        throw new Error('Ein Teilnehmer mit dieser E-Mail-Adresse existiert bereits');
      }
    }

    const participant = {
      id: uuidv4(),
      name: participantData.name,
      email: participantData.email || '',
      phone: participantData.phone || '',
      organization: participantData.organization || '',
      position: participantData.position || '',
      notes: participantData.notes || '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    StorageService.addParticipant(participant);
    return participant;
  }

  static updateParticipant(id, updates) {
    const participant = this.getParticipantById(id);
    if (!participant) {
      throw new Error('Teilnehmer nicht gefunden');
    }

    // Prüfe auf doppelte E-Mail-Adressen (außer bei sich selbst)
    if (updates.email && updates.email !== participant.email) {
      const existingParticipant = this.getParticipantByEmail(updates.email);
      if (existingParticipant && existingParticipant.id !== id) {
        throw new Error('Ein Teilnehmer mit dieser E-Mail-Adresse existiert bereits');
      }
    }

    const updatedParticipant = {
      ...participant,
      ...updates,
      updatedAt: new Date()
    };

    StorageService.updateParticipant(updatedParticipant);
    return updatedParticipant;
  }

  static deleteParticipant(id) {
    const participant = this.getParticipantById(id);
    if (!participant) {
      throw new Error('Teilnehmer nicht gefunden');
    }

    // Prüfe, ob der Teilnehmer in Terminen verwendet wird
    const appointments = StorageService.getAppointments();
    const usedInAppointments = appointments.filter(apt => 
      apt.participants.includes(id)
    );

    if (usedInAppointments.length > 0) {
      throw new Error(`Teilnehmer kann nicht gelöscht werden, da er in ${usedInAppointments.length} Termin(en) verwendet wird`);
    }

    StorageService.deleteParticipant(id);
    return true;
  }

  static getParticipantByEmail(email) {
    const participants = this.getAllParticipants();
    return participants.find(p => p.email?.toLowerCase() === email.toLowerCase());
  }

  static searchParticipants(query) {
    const participants = this.getAllParticipants();
    const searchTerm = query.toLowerCase();
    
    return participants.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      p.email?.toLowerCase().includes(searchTerm) ||
      p.phone?.includes(searchTerm) ||
      p.organization?.toLowerCase().includes(searchTerm) ||
      p.position?.toLowerCase().includes(searchTerm)
    );
  }

  static getParticipantsByOrganization(organization) {
    const participants = this.getAllParticipants();
    return participants.filter(p => 
      p.organization?.toLowerCase() === organization.toLowerCase()
    );
  }

  static getParticipantStatistics() {
    const participants = this.getAllParticipants();
    const appointments = StorageService.getAppointments();

    const stats = {
      totalParticipants: participants.length,
      participantsWithEmail: participants.filter(p => p.email).length,
      participantsWithPhone: participants.filter(p => p.phone).length,
      participantsWithOrganization: participants.filter(p => p.organization).length,
      organizations: [],
      participantAppointmentCounts: {},
      mostActiveParticipants: []
    };

    // Organisationen sammeln
    const orgSet = new Set();
    participants.forEach(p => {
      if (p.organization) {
        orgSet.add(p.organization);
      }
    });
    stats.organizations = Array.from(orgSet).sort();

    // Teilnehmer-Termin-Zählungen
    participants.forEach(participant => {
      const appointmentCount = appointments.filter(apt => 
        apt.participants.includes(participant.id)
      ).length;
      
      stats.participantAppointmentCounts[participant.id] = appointmentCount;
    });

    // Aktivste Teilnehmer (Top 10)
    stats.mostActiveParticipants = participants
      .map(p => ({
        ...p,
        appointmentCount: stats.participantAppointmentCounts[p.id] || 0
      }))
      .filter(p => p.appointmentCount > 0)
      .sort((a, b) => b.appointmentCount - a.appointmentCount)
      .slice(0, 10);

    return stats;
  }

  static getParticipantAppointments(participantId) {
    const appointments = StorageService.getAppointments();
    return appointments.filter(apt => apt.participants.includes(participantId))
                      .sort((a, b) => b.start.getTime() - a.start.getTime());
  }

  static exportParticipants(format = 'json') {
    const participants = this.getAllParticipants();
    
    if (format === 'csv') {
      return this.exportToCSV(participants);
    }
    
    return JSON.stringify(participants, null, 2);
  }

  static exportToCSV(participants) {
    const headers = ['Name', 'E-Mail', 'Telefon', 'Organisation', 'Position', 'Notizen'];
    const rows = participants.map(p => [
      p.name,
      p.email || '',
      p.phone || '',
      p.organization || '',
      p.position || '',
      p.notes || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }

  static importParticipants(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const imported = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      try {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const participantData = {};
        
        headers.forEach((header, index) => {
          switch (header.toLowerCase()) {
            case 'name':
              participantData.name = values[index];
              break;
            case 'e-mail':
            case 'email':
              participantData.email = values[index];
              break;
            case 'telefon':
            case 'phone':
              participantData.phone = values[index];
              break;
            case 'organisation':
            case 'organization':
              participantData.organization = values[index];
              break;
            case 'position':
              participantData.position = values[index];
              break;
            case 'notizen':
            case 'notes':
              participantData.notes = values[index];
              break;
          }
        });

        if (!participantData.name) {
          errors.push(`Zeile ${i + 1}: Name ist erforderlich`);
          continue;
        }

        const participant = this.createParticipant(participantData);
        imported.push(participant);
      } catch (error) {
        errors.push(`Zeile ${i + 1}: ${error.message}`);
      }
    }

    return {
      imported: imported,
      errors: errors,
      total: imported.length
    };
  }

  static mergeParticipants(sourceId, targetId) {
    const sourceParticipant = this.getParticipantById(sourceId);
    const targetParticipant = this.getParticipantById(targetId);

    if (!sourceParticipant || !targetParticipant) {
      throw new Error('Ein oder beide Teilnehmer nicht gefunden');
    }

    // Aktualisiere alle Termine, die den Quell-Teilnehmer verwenden
    const appointments = StorageService.getAppointments();
    appointments.forEach(apt => {
      if (apt.participants.includes(sourceId)) {
        const updatedParticipants = apt.participants.map(pid => 
          pid === sourceId ? targetId : pid
        );
        // Entferne Duplikate
        apt.participants = [...new Set(updatedParticipants)];
        StorageService.updateAppointment(apt);
      }
    });

    // Lösche den Quell-Teilnehmer
    StorageService.deleteParticipant(sourceId);

    return targetParticipant;
  }

  static createBulkParticipants(participantsData) {
    const created = [];
    const errors = [];

    participantsData.forEach((data, index) => {
      try {
        const participant = this.createParticipant(data);
        created.push(participant);
      } catch (error) {
        errors.push(`Teilnehmer ${index + 1}: ${error.message}`);
      }
    });

    return {
      created: created,
      errors: errors,
      total: created.length
    };
  }

  static getParticipantsByIds(ids) {
    const participants = this.getAllParticipants();
    return participants.filter(p => ids.includes(p.id));
  }

  static getOrganizations() {
    const participants = this.getAllParticipants();
    const organizations = new Set();
    
    participants.forEach(p => {
      if (p.organization) {
        organizations.add(p.organization);
      }
    });
    
    return Array.from(organizations).sort();
  }
}
