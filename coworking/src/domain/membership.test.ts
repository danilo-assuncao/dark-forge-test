import { describe, it, expect, vi, afterEach } from 'vitest';
import { finalizeCoworkingBooking, BookingInput } from './membership';
import { WorkspaceItem } from '../types';

describe('finalizeCoworkingBooking', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
    expect(result.totalPrice).toBe(500);
    expect(result.accessCode).toMatch(/^CWK-\d{6}$/);
  });

  it('calculates correctly for avulso with DANWORK15 coupon', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'avulso',
      coupon: 'DANWORK15',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(425);
    expect(result.accessCode).toMatch(/^CWK-\d{6}$/);
  });

  it('ignores invalid coupon for avulso plan', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'avulso',
      coupon: 'INVALID',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(500);
  });

  it('calculates correctly for resident plan (ignores coupon)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'resident',
      coupon: 'DANWORK15',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(425);
  });

  it('calculates correctly for enterprise plan (ignores coupon)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'enterprise',
      coupon: 'DANWORK15',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(225);
  });

  it('calculates correctly for enterprise plan (less than or equal to 2 hours)', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 2,
      plan: 'enterprise',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.totalPrice).toBe(0);
  });

  it('rounds floating point prices to two decimals', () => {
    const input: BookingInput = {
      workspace: { ...mockWorkspace, pricePerHour: 33.33 },
      hours: 3,
      plan: 'resident',
    };
    const result = finalizeCoworkingBooking(input);
    // 33.33 * 3 = 99.99
    // 99.99 * 0.85 = 84.9915
    // rounded: 84.99
    expect(result.totalPrice).toBe(84.99);
  });

  it('allows injecting a custom generator for deterministic testing', () => {
    const input: BookingInput = {
      workspace: mockWorkspace,
      hours: 5,
      plan: 'avulso',
      generateAccessCode: () => 'CWK-MOCK',
    };
    const result = finalizeCoworkingBooking(input);
    expect(result.accessCode).toBe('CWK-MOCK');
  });

  it('throws an error for non-positive or non-finite hours', () => {
    const cases = [0, -1, NaN, Infinity];
    cases.forEach(hours => {
      expect(() => {
        finalizeCoworkingBooking({ workspace: mockWorkspace, hours, plan: 'avulso' });
      }).toThrow('hours must be a positive finite number');
    });
  });

  it('throws an error for negative or non-finite pricePerHour', () => {
    const cases = [-1, NaN, Infinity];
    cases.forEach(price => {
      expect(() => {
        finalizeCoworkingBooking({ workspace: { ...mockWorkspace, pricePerHour: price }, hours: 1, plan: 'avulso' });
      }).toThrow('workspace.pricePerHour must be a non-negative finite number');
    });
  });
});
