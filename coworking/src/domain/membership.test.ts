import { describe, it, expect } from 'vitest';
import { finalizeCoworkingBooking, BookingInput } from './membership';
import { WorkspaceItem } from '../types';

describe('finalizeCoworkingBooking', () => {
  const mockWorkspace: WorkspaceItem = {
    id: 'ws-1',
    name: 'Hot Desk 1',
    kind: 'hot_desk',
    capacity: 1,
    amenities: ['coffee'],
    pricePerHour: 100,
  };

  it('calculates correctly for avulso without coupon', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'avulso',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(500); // 100 * 5 * 1.0
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });

  it('calculates correctly for avulso with DANWORK15 coupon', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'avulso',
      coupon: 'DANWORK15',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(425); // 100 * 5 * 0.85
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });

  it('calculates correctly for resident plan', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'resident',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(425); // 100 * 5 * 0.85
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });

  it('calculates correctly for enterprise plan (more than 2 hours)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'enterprise',
    };
    const result = finalizeCoworkingBooking(input);
    // billable hours: 5 - 2 = 3
    // base price: 3 * 100 = 300
    // discount 25%: 300 * 0.75 = 225
    expect(result.totalPrice).toBe(225);
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });

  it('calculates correctly for enterprise plan (less than or equal to 2 hours)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 2,
      plan: 'enterprise',
    };
    const result = finalizeCoworkingBooking(input);
    // billable hours: 2 - 2 = 0
    // total: 0
    expect(result.totalPrice).toBe(0);
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });

  it('calculates correctly for enterprise plan (1 hour)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 1,
      plan: 'enterprise',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(0);
    expect(result.accessCode).toMatch(/^CWK-\d{4}$/);
  });
});
