export enum ScenarioID {
  CHESS = 'chess',
  MEDICAL = 'medical',
}

export enum Phase {
  INDIVIDUAL_INPUT = 'INDIVIDUAL_INPUT',
  GROUP_FORMATION = 'GROUP_FORMATION',
  GROUP_DELIBERATION = 'GROUP_DELIBERATION',
  RESULTS_DEBRIEF = 'RESULTS_DEBRIEF',
}

export interface IndividualResponse {
  id: string; // unique response id
  studentId: string;
  threshold: number;
  justification: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[]; // student IDs
  consensus: {
    [key in ScenarioID]?: {
      threshold: number;
      justification:string;
    }
  };
}

export interface AnalysisResult {
    shift: number;
    shiftDirection: 'more extreme' | 'less extreme' | 'no change';
    shiftType: 'risk-averse' | 'risk-seeking' | 'none';
    isPolarized: boolean;
    isExtremityShift: boolean;
    extremityShiftInfo: string;
}
