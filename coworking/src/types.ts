export type SpaceKind = 'private_office' | 'hot_desk' | 'meeting_room';
export type AmenityAddon = 'projector' | 'whiteboard' | 'coffee' | 'monitor';

export interface WorkspaceItem {
  id: string;
  name: string;
  kind: SpaceKind;
  capacity: number;
  amenities: AmenityAddon[];
  pricePerHour: number;
}
