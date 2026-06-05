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

export interface APF {
  id: string;
  policialId: string;
  policialNome: string;
  // Policiais que trouxeram a QRU (opcional)
  policiaisQru?: string;
  // Dados do indivíduo apreendido (obrigatório)
  nomeIndividuo: string;
  rgIndividuo: string;
  // Informações da QRU (obrigatório)
  informacoesQru: string;
  // Artigos selecionados
  artigos: string[];
  tempoPrisao: number; // em minutos
  // Itens apreendidos
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

// Mantendo Seizure para compatibilidade
export interface Seizure {
  id: string;
  policialId: string;
  policialNome: string;
  policiaisQru?: string;
  nomeIndividuo?: string;
  rgIndividuo?: string;
  informacoesQru?: string;
  artigos?: string[];
  tempoPrisao?: number;
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
  tipo: 'patrol' | 'seizure' | 'registration' | 'apf';
  dataHora: string;
}

export type TabType = 'apf' | 'patrulhamento' | 'cadastro' | 'administrativo' | 'setor' | 'chefia' | 'usuarios';

export const UNIDADES = [
  'Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 
  'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima', 
  'Mike', 'November'
] as const;

export const CARGOS = [
  'Soldado 2ª Classe',
  'Soldado 1ª Classe',
  'Cabo',
  '3º Sargento',
  '2º Sargento',
  '1º Sargento',
  'Subtenente',
  'Aspirante',
  '2º Tenente',
  '1º Tenente',
  'Capitão',
  'Major',
  'Tenente Coronel',
  'Coronel',
] as const;

export type SectorValue = 'gate' | 'bpm19' | 'rota' | 'rocam' | 'posto';

export const SECTORS: { value: SectorValue; label: string; short: string }[] = [
  { value: 'gate',  label: 'GATE - Grupo de Ações Táticas Especiais', short: 'GATE' },
  { value: 'bpm19', label: '19º BPM - Batalhão de Polícia Militar',   short: '19º BPM' },
  { value: 'rota',  label: 'ROTA - Rondas Ostensivas Tobias de Aguiar', short: 'ROTA' },
  { value: 'rocam', label: 'ROCAM - Rondas Ostensivas com Apoio de Motocicletas', short: 'ROCAM' },
  { value: 'posto', label: 'Posto Comunitário',                       short: 'Posto' },
];

export const sectorLabel = (v?: string | null) =>
  SECTORS.find(s => s.value === v)?.short ?? '—';

export interface Artigo {
  codigo: string;
  descricao: string;
  tempo: number; // minutos
  artigoUnico: boolean;
}

export const ARTIGOS_PENAIS: Artigo[] = [
  { codigo: 'Art. 1', descricao: 'Tráfico de drogas', tempo: 25, artigoUnico: false },
  { codigo: 'Art. 2', descricao: 'Tráfico de Armas', tempo: 30, artigoUnico: false },
  { codigo: 'Art. 3', descricao: 'Desacato', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 4', descricao: 'Direção Perigosa', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 5', descricao: 'Resistência à Prisão', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 6', descricao: 'Sequestro e Cárcere Privado', tempo: 80, artigoUnico: false },
  { codigo: 'Art. 7', descricao: 'Porte Ilegal de Arma de Fogo', tempo: 25, artigoUnico: false },
  { codigo: 'Art. 8', descricao: 'Furto', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 9', descricao: 'Roubo', tempo: 40, artigoUnico: false },
  { codigo: 'Art. 10', descricao: 'Depredação de patrimônio público ou privado', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 11', descricao: 'Disputar corridas ilegais', tempo: 35, artigoUnico: true },
  { codigo: 'Art. 12', descricao: 'Tentativa de Homicídio', tempo: 30, artigoUnico: false },
  { codigo: 'Art. 13', descricao: 'Suborno', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 14', descricao: 'Fuga / Evasão', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 15', descricao: 'Ameaça', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 16', descricao: 'Abuso de Autoridade', tempo: 120, artigoUnico: false },
  { codigo: 'Art. 17', descricao: 'Homicídio', tempo: 35, artigoUnico: false },
  { codigo: 'Art. 18', descricao: 'Agressão', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 19', descricao: 'Corrupção', tempo: 120, artigoUnico: false },
  { codigo: 'Art. 20', descricao: 'Desobediência à Ordem Policial', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 21', descricao: 'Fazer, publicamente, apologia de fato criminoso', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 22', descricao: 'Extorsão', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 23', descricao: 'Estelionato', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 24', descricao: 'Receptação', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 25', descricao: 'Calúnia', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 26', descricao: 'Difamação', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 27', descricao: 'Injúria', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 28', descricao: 'Lavagem de Dinheiro', tempo: 20, artigoUnico: false },
  { codigo: 'Art. 29', descricao: 'Associação criminosa', tempo: 20, artigoUnico: false },
  { codigo: 'Art. 30', descricao: 'Cumplicidade', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 31', descricao: 'Importar ou exportar mercadoria proibida', tempo: 20, artigoUnico: false },
  { codigo: 'Art. 32', descricao: 'Exercício ilegal da profissão', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 33', descricao: 'Violação de Domicílio', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 34', descricao: 'Prevaricação', tempo: 10, artigoUnico: false },
  { codigo: 'Art. 35', descricao: 'Tráfico de Influência', tempo: 15, artigoUnico: false },
  { codigo: 'Art. 36', descricao: 'Divulgar informações sigilosas ou reservadas', tempo: 30, artigoUnico: false },
  { codigo: 'Art. 37', descricao: 'Busca e apreensão', tempo: 240, artigoUnico: true },
  { codigo: 'Art. 38', descricao: 'Assédio', tempo: 90, artigoUnico: false },
  { codigo: 'Art. 39', descricao: 'Fuga do presídio', tempo: 80, artigoUnico: false },
  { codigo: 'Art. 40', descricao: 'Assalto ao banco', tempo: 360, artigoUnico: true },
  { codigo: 'Art. 41', descricao: 'Perturbação do sossego', tempo: 25, artigoUnico: false },
  { codigo: 'Art. 42', descricao: 'Mandado de Prisão', tempo: 120, artigoUnico: true },
  { codigo: 'Art. 43', descricao: 'Roubo a Caixa Eletrônico', tempo: 30, artigoUnico: true },
  { codigo: 'Art. 44', descricao: 'Assalto a Loja', tempo: 45, artigoUnico: true },
];
