// Service für Team-Verwaltung
import { v4 as uuidv4 } from 'uuid';
import { StorageService } from '../utils/storage.js';

export class TeamService {
  static getAllTeamMembers() {
    return StorageService.getTeamMembers() || [];
  }

  static getTeamMemberById(id) {
    const members = this.getAllTeamMembers();
    return members.find(member => member.id === id);
  }

  static createTeamMember(memberData) {
    const member = {
      id: memberData.id || `team${Date.now()}`, // Fallback für ID-Generierung
      name: memberData.name,
      rolle: memberData.rolle,
      email: memberData.email || '',
      telefon: memberData.telefon || '',
      verfuegbarkeit: memberData.verfuegbarkeit || '',
      notizen: memberData.notizen || '',
      aktiv: memberData.aktiv !== undefined ? memberData.aktiv : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Prüfe auf Duplikate (gleicher Name und Rolle)
    const existingMembers = this.getAllTeamMembers();
    const duplicate = existingMembers.find(existing => 
      existing.name.toLowerCase() === member.name.toLowerCase() && 
      existing.rolle.toLowerCase() === member.rolle.toLowerCase()
    );

    if (duplicate) {
      throw new Error(`Ein Teammitglied mit Name "${member.name}" und Rolle "${member.rolle}" existiert bereits`);
    }

    StorageService.addTeamMember(member);
    return member;
  }

  static updateTeamMember(id, updates) {
    const member = this.getTeamMemberById(id);
    if (!member) {
      throw new Error('Teammitglied nicht gefunden');
    }

    // Prüfe auf Duplikate bei Namens-/Rollenänderung
    if (updates.name || updates.rolle) {
      const checkName = updates.name || member.name;
      const checkRolle = updates.rolle || member.rolle;
      
      const existingMembers = this.getAllTeamMembers().filter(m => m.id !== id);
      const duplicate = existingMembers.find(existing => 
        existing.name.toLowerCase() === checkName.toLowerCase() && 
        existing.rolle.toLowerCase() === checkRolle.toLowerCase()
      );

      if (duplicate) {
        throw new Error(`Ein Teammitglied mit Name "${checkName}" und Rolle "${checkRolle}" existiert bereits`);
      }
    }

    const updatedMember = {
      ...member,
      ...updates,
      updatedAt: new Date()
    };

    StorageService.updateTeamMember(updatedMember);
    return updatedMember;
  }

  static deleteTeamMember(id) {
    const member = this.getTeamMemberById(id);
    if (!member) {
      throw new Error('Teammitglied nicht gefunden');
    }

    // Prüfe, ob das Teammitglied in Terminen verwendet wird
    const appointments = StorageService.getAppointments() || [];
    const usedInAppointments = appointments.filter(apt => {
      if (Array.isArray(apt.teamMitglied)) {
        return apt.teamMitglied.includes(id);
      }
      return apt.teamMitglied === id;
    });

    if (usedInAppointments.length > 0) {
      throw new Error(`Das Teammitglied wird in ${usedInAppointments.length} Termin(en) verwendet und kann nicht gelöscht werden. Deaktivieren Sie es stattdessen.`);
    }

    StorageService.deleteTeamMember(id);
    return true;
  }

  static getActiveTeamMembers() {
    return this.getAllTeamMembers().filter(member => member.aktiv);
  }

  static searchTeamMembers(query) {
    const members = this.getAllTeamMembers();
    const searchTerm = query.toLowerCase();
    
    return members.filter(member => 
      member.name.toLowerCase().includes(searchTerm) ||
      member.rolle.toLowerCase().includes(searchTerm) ||
      member.email?.toLowerCase().includes(searchTerm)
    );
  }

  static getTeamMembersByRole(rolle) {
    return this.getAllTeamMembers().filter(member => 
      member.rolle.toLowerCase() === rolle.toLowerCase()
    );
  }

  static getTeamMemberStats() {
    const members = this.getAllTeamMembers();
    
    return {
      total: members.length,
      active: members.filter(m => m.aktiv).length,
      inactive: members.filter(m => !m.aktiv).length,
      byRole: members.reduce((acc, member) => {
        acc[member.rolle] = (acc[member.rolle] || 0) + 1;
        return acc;
      }, {})
    };
  }

  static initializeDefaultTeamMembers() {
    const existingMembers = this.getAllTeamMembers();
    
    // Nur initialisieren, wenn noch keine Teammitglieder vorhanden sind
    if (existingMembers.length === 0) {
      const defaultMembers = [
        { name: 'Anna Müller', rolle: 'Kräuterexpertin', email: 'anna.mueller@stift-gurk.at' },
        { name: 'Hans Weber', rolle: 'Gartenführer', email: 'hans.weber@stift-gurk.at' },
        { name: 'Maria Schmidt', rolle: 'Mazerations-Spezialistin', email: 'maria.schmidt@stift-gurk.at' },
        { name: 'Josef Huber', rolle: 'Historiker', email: 'josef.huber@stift-gurk.at' },
        { name: 'Elisabeth Bauer', rolle: 'Küchenmeisterin', email: 'elisabeth.bauer@stift-gurk.at' }
      ];

      defaultMembers.forEach((memberData, index) => {
        this.createTeamMember({
          ...memberData,
          id: `team${index + 1}`,
          verfuegbarkeit: 'Nach Absprache',
          aktiv: true
        });
      });
    }
  }

  static exportTeamMembers(format = 'json') {
    const members = this.getAllTeamMembers();
    
    if (format === 'csv') {
      return this.exportToCSV(members);
    }
    
    return JSON.stringify(members, null, 2);
  }

  static exportToCSV(members) {
    const headers = ['Name', 'Rolle', 'E-Mail', 'Telefon', 'Verfügbarkeit', 'Status'];
    const rows = members.map(member => [
      member.name,
      member.rolle,
      member.email || '',
      member.telefon || '',
      member.verfuegbarkeit || '',
      member.aktiv ? 'Aktiv' : 'Inaktiv'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
}
