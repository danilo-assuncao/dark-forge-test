import { WorkspaceItem } from '../types';

const spaces: WorkspaceItem[] = [
  {
    id: '1',
    name: 'Main Conference Room',
    kind: 'meeting_room',
    capacity: 10,
    amenities: ['projector', 'whiteboard'],
    pricePerHour: 50
  },
  {
    id: '2',
    name: 'Quiet Hot Desk',
    kind: 'hot_desk',
    capacity: 1,
    amenities: ['coffee', 'monitor'],
    pricePerHour: 10
  },
  {
    id: '3',
    name: 'Executive Private Office',
    kind: 'private_office',
    capacity: 4,
    amenities: ['whiteboard', 'coffee', 'monitor'],
    pricePerHour: 80
  }
];

export function listSpaces(): WorkspaceItem[] {
  return [...spaces];
}

export function filterSpacesByCapacity(minCapacity: number): WorkspaceItem[] {
  return spaces.filter(space => space.capacity >= minCapacity);
}

export function getSpaceById(id: string): WorkspaceItem | undefined {
  return spaces.find(space => space.id === id);
}
