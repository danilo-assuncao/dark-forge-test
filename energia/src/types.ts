export type TariffFlag = 'green' | 'yellow' | 'red1' | 'red2';

export type Room = 'Cozinha' | 'Sala' | 'Quarto' | 'Banheiro' | 'Lavanderia' | 'Escritório';

export interface ApplianceItem {
  id: string;
  name: string;
  powerWatts: number;
  room: Room;
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
