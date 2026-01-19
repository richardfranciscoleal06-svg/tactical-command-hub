export interface Police {
  id: string;
  nomeCompleto: string;
  rg: string;
  dataIngresso: string;
  cargo: string;
  cursos: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Patrol {
  id: string;
  policiais: string[];
  unidade: string;
  assinatura: string;
  senhaViatura: string;
  inicioTimestamp: string;
  fimTimestamp?: string;
  horasTrabalhadas?: number;
  status: 'active' | 'pending' | 'approved' | 'rejected';
}

export interface Seizure {
  id: string;
  policialId: string;
  policialNome: string;
  itens: {
    sementeCannabis: number;
    cannabisNatura: number;
    fenilacetona: number;
    acidoCloridrico: number;
    metilamina: number;
    maconha: number;
    metanfetamina: number;
    pecasArmas: number;
    fuzil: number;
    submetralhadora: number;
    pistola: number;
    municoes762: number;
    municoes556: number;
    municoes9mm: number;
    dinheiroSujo: number;
    coleteBalístico: number;
    lockpick: number;
    flipperZero: number;
    kevlar: number;
  };
  urlComprovacao: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface AuditLog {
  id: string;
  oficialResponsavel: string;
  oficialRg: string;
  acao: string;
  tipo: 'patrol' | 'seizure' | 'registration';
  dataHora: string;
}

export type TabType = 'patrulhamento' | 'apreensao' | 'cadastro' | 'administrativo' | 'setor';

export const UNIDADES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 
  'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 
  'Mike', 'November'
] as const;

export const CARGOS = [
  'Comandante-Geral',
  'Coronel',
  'Tenente-Coronel',
  'Major',
  'Capitão',
  '1º Tenente',
  '2º Tenente',
  'Aspirante a Oficial',
  'Subtenente',
  '1º Sargento',
  '2º Sargento',
  '3º Sargento',
  'Cabo',
  'Soldado 1ª Classe',
  'Soldado 2ª Classe',
  'Recruta',
  'Aluno'
] as const;

export const CURSOS = ['Força Tática', 'RPM/ROCAM', 'Nenhum'] as const;
