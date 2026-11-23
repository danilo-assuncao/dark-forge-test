export type TariffFlag = 'green' | 'yellow' | 'red1' | 'red2';

export interface ApplianceItem {
  id: string;
  name: string;
  powerWatts: number;
  room: string;
}

export interface ApplianceUsage {
  applianceId: string;
  hoursPerDay: number;
  daysPerMonth: number;
}

export interface SolarQuote {
  systemSizeKw: number;
  estimatedGenerationKwh: number;
  totalCost: number;
  paybackMonths: number;
}
