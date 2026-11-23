import { describe, it, expect } from 'vitest';
import { listAppliances, filterAppliancesByRoom, getApplianceById } from './appliances';

describe('Appliances Data', () => {
  it('should list all appliances', () => {
    const all = listAppliances();
    expect(all.length).toBeGreaterThan(0);
    expect(all[0]).toHaveProperty('id');
    expect(all[0]).toHaveProperty('name');
  });

  it('should filter appliances by room', () => {
    const kitchenAppliances = filterAppliancesByRoom('Cozinha');
    expect(kitchenAppliances.every(app => app.room === 'Cozinha')).toBe(true);
    expect(kitchenAppliances.length).toBeGreaterThan(0);
  });

  it('should get an appliance by id', () => {
    const appliance = getApplianceById('1');
    expect(appliance).toBeDefined();
    expect(appliance?.id).toBe('1');
  });

  it('should return undefined for a non-existent id', () => {
    const appliance = getApplianceById('invalid-id');
    expect(appliance).toBeUndefined();
  });
});
