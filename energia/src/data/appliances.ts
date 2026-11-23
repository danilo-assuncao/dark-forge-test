import { ApplianceItem } from '../types';

const appliances: ApplianceItem[] = [
  { id: '1', name: 'Geladeira', powerWatts: 250, room: 'Cozinha' },
  { id: '2', name: 'Micro-ondas', powerWatts: 1200, room: 'Cozinha' },
  { id: '3', name: 'TV 55"', powerWatts: 150, room: 'Sala' },
  { id: '4', name: 'Ar Condicionado', powerWatts: 1500, room: 'Quarto' },
  { id: '5', name: 'Chuveiro Elétrico', powerWatts: 5500, room: 'Banheiro' },
];

export const listAppliances = (): ApplianceItem[] => {
  return appliances;
};

export const filterAppliancesByRoom = (room: string): ApplianceItem[] => {
  return appliances.filter(app => app.room === room);
};

export const getApplianceById = (id: string): ApplianceItem | undefined => {
  return appliances.find(app => app.id === id);
};
