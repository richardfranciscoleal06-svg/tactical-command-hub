import { Police, Patrol, Seizure, AuditLog } from '@/types/police';

const KEYS = {
  POLICE: 'pm19_policiais',
  PATROLS: 'pm19_patrulhas',
  SEIZURES: 'pm19_apreensoes',
  LOGS: 'pm19_logs',
  PDF_GENERATED: 'pm19_pdf_generated',
};

// Police Officers
export const getPolice = (): Police[] => {
  const data = localStorage.getItem(KEYS.POLICE);
  return data ? JSON.parse(data) : [];
};

export const savePolice = (police: Police[]): void => {
  localStorage.setItem(KEYS.POLICE, JSON.stringify(police));
};

export const addPolice = (police: Police): void => {
  const current = getPolice();
  savePolice([...current, police]);
};

export const updatePolice = (id: string, updates: Partial<Police>): void => {
  const current = getPolice();
  const updated = current.map(p => p.id === id ? { ...p, ...updates } : p);
  savePolice(updated);
};

export const getApprovedPolice = (): Police[] => {
  return getPolice().filter(p => p.status === 'approved');
};

// Patrols
export const getPatrols = (): Patrol[] => {
  const data = localStorage.getItem(KEYS.PATROLS);
  return data ? JSON.parse(data) : [];
};

export const savePatrols = (patrols: Patrol[]): void => {
  localStorage.setItem(KEYS.PATROLS, JSON.stringify(patrols));
};

export const addPatrol = (patrol: Patrol): void => {
  const current = getPatrols();
  savePatrols([...current, patrol]);
};

export const updatePatrol = (id: string, updates: Partial<Patrol>): void => {
  const current = getPatrols();
  const updated = current.map(p => p.id === id ? { ...p, ...updates } : p);
  savePatrols(updated);
};

export const getActivePatrol = (policialId: string): Patrol | undefined => {
  return getPatrols().find(p => 
    p.status === 'active' && p.policiais.includes(policialId)
  );
};

export const getPoliciesOnDuty = (): string[] => {
  const activePatrols = getPatrols().filter(p => p.status === 'active');
  return activePatrols.flatMap(p => p.policiais);
};

// Seizures
export const getSeizures = (): Seizure[] => {
  const data = localStorage.getItem(KEYS.SEIZURES);
  return data ? JSON.parse(data) : [];
};

export const saveSeizures = (seizures: Seizure[]): void => {
  localStorage.setItem(KEYS.SEIZURES, JSON.stringify(seizures));
};

export const addSeizure = (seizure: Seizure): void => {
  const current = getSeizures();
  saveSeizures([...current, seizure]);
};

export const updateSeizure = (id: string, updates: Partial<Seizure>): void => {
  const current = getSeizures();
  const updated = current.map(s => s.id === id ? { ...s, ...updates } : s);
  saveSeizures(updated);
};

// Audit Logs
export const getLogs = (): AuditLog[] => {
  const data = localStorage.getItem(KEYS.LOGS);
  return data ? JSON.parse(data) : [];
};

export const saveLogs = (logs: AuditLog[]): void => {
  localStorage.setItem(KEYS.LOGS, JSON.stringify(logs));
};

export const addLog = (log: AuditLog): void => {
  const current = getLogs();
  saveLogs([...current, log]);
};

// Calculate weekly hours for a police officer
export const getWeeklyHours = (policialId: string): number => {
  const patrols = getPatrols().filter(p => 
    p.status === 'approved' && 
    p.policiais.includes(policialId) &&
    p.horasTrabalhadas
  );
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklyPatrols = patrols.filter(p => {
    const patrolDate = new Date(p.fimTimestamp || p.inicioTimestamp);
    return patrolDate >= oneWeekAgo;
  });
  
  return weeklyPatrols.reduce((acc, p) => acc + (p.horasTrabalhadas || 0), 0);
};

// Get approved seizures for dashboard
export const getApprovedSeizures = (): Seizure[] => {
  return getSeizures().filter(s => s.status === 'approved');
};

// Get weekly seizures totals
export const getWeeklySeizureTotals = () => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const weeklySeizures = getApprovedSeizures().filter(s => {
    const seizureDate = new Date(s.createdAt);
    return seizureDate >= oneWeekAgo;
  });
  
  const totals = {
    sementeCannabis: 0,
    cannabisNatura: 0,
    fenilacetona: 0,
    acidoCloridrico: 0,
    metilamina: 0,
    maconha: 0,
    metanfetamina: 0,
    pecasArmas: 0,
    fuzil: 0,
    submetralhadora: 0,
    pistola: 0,
    municoes762: 0,
    municoes556: 0,
    municoes9mm: 0,
    dinheiroSujo: 0,
    coleteBalístico: 0,
    lockpick: 0,
    flipperZero: 0,
    kevlar: 0,
  };
  
  weeklySeizures.forEach(s => {
    Object.keys(totals).forEach(key => {
      totals[key as keyof typeof totals] += s.itens[key as keyof typeof s.itens] || 0;
    });
  });
  
  return { totals, count: weeklySeizures.length };
};

// PDF generation tracking
export const setPdfGenerated = (value: boolean): void => {
  localStorage.setItem(KEYS.PDF_GENERATED, JSON.stringify(value));
};

export const wasPdfGenerated = (): boolean => {
  const data = localStorage.getItem(KEYS.PDF_GENERATED);
  return data ? JSON.parse(data) : false;
};

// Reset dashboards (clear weekly data)
export const resetDashboards = (): void => {
  // Reset patrols - keep structure but clear hours
  const patrols = getPatrols().filter(p => p.status !== 'approved');
  savePatrols(patrols);
  
  // Reset seizures - keep structure but clear approved ones
  const seizures = getSeizures().filter(s => s.status !== 'approved');
  saveSeizures(seizures);
  
  // Reset PDF flag
  setPdfGenerated(false);
};
