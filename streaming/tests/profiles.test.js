import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createProfileManager } from '../profiles.js';

describe('Profile Manager', () => {
  test('creates a profile manager and limits to 5 profiles', () => {
    const manager = createProfileManager();
    
    manager.addProfile({ name: 'User 1' });
    manager.addProfile({ name: 'User 2' });
    manager.addProfile({ name: 'User 3' });
    manager.addProfile({ name: 'User 4' });
    manager.addProfile({ name: 'User 5' });
    
    assert.throws(() => {
      manager.addProfile({ name: 'User 6' });
    }, /Maximum of 5 profiles reached/);
  });

  test('validates account PIN format if provided', () => {
    assert.throws(() => {
      createProfileManager('123'); // 3 digits
    }, /Invalid account PIN/);
    
    assert.throws(() => {
      createProfileManager('12345'); // 5 digits
    }, /Invalid account PIN/);
    
    assert.throws(() => {
      createProfileManager('abcd'); // not numeric
    }, /Invalid account PIN/);
  });

  test('forces kids profile max rating to 10', () => {
    const manager = createProfileManager();
    
    const kidsProfileId = manager.addProfile({ name: 'Kids', isKids: true, maxRating: '16' });
    
    assert.equal(manager.canWatchContent(kidsProfileId, '10'), true);
    assert.equal(manager.canWatchContent(kidsProfileId, '12'), false);
    
    const toddlerProfileId = manager.addProfile({ name: 'Toddler', isKids: true, maxRating: 'L' });
    assert.equal(manager.canWatchContent(toddlerProfileId, 'L'), true);
    assert.equal(manager.canWatchContent(toddlerProfileId, '10'), false);
  });

  test('canWatchContent evaluates correctly for normal profiles', () => {
    const manager = createProfileManager();
    
    const teenId = manager.addProfile({ name: 'Teen', maxRating: '14' });
    
    assert.equal(manager.canWatchContent(teenId, 'L'), true);
    assert.equal(manager.canWatchContent(teenId, '10'), true);
    assert.equal(manager.canWatchContent(teenId, '12'), true);
    assert.equal(manager.canWatchContent(teenId, '14'), true);
    assert.equal(manager.canWatchContent(teenId, '16'), false);
    assert.equal(manager.canWatchContent(teenId, '18'), false);
  });

  test('unlockParentalSettings requires 4-digit PIN and unlocks restriction', () => {
    // case without specific account PIN
    const manager1 = createProfileManager();
    const kids1 = manager1.addProfile({ name: 'Kids 1', isKids: true, maxRating: '10' });
    
    assert.throws(() => {
      manager1.unlockParentalSettings(kids1, '123');
    }, /PIN must be a 4-digit string/);

    assert.equal(manager1.unlockParentalSettings(kids1, '9999'), true);
    assert.equal(manager1.canWatchContent(kids1, '16'), true);

    // case with specific account PIN
    const manager2 = createProfileManager('1234');
    const kids2 = manager2.addProfile({ name: 'Kids 2', isKids: true, maxRating: '10' });

    assert.equal(manager2.unlockParentalSettings(kids2, '9999'), false);
    assert.equal(manager2.canWatchContent(kids2, '16'), false);

    assert.equal(manager2.unlockParentalSettings(kids2, '1234'), true);
    assert.equal(manager2.canWatchContent(kids2, '16'), true);
  });

  test('throws for invalid content rating or profile', () => {
    const manager = createProfileManager();
    const id = manager.addProfile({ name: 'User' });
    
    assert.throws(() => {
      manager.canWatchContent(id, 'INVALID');
    }, /Invalid content rating/);

    assert.throws(() => {
      manager.canWatchContent('nonexistent', '10');
    }, /Profile not found/);
  });
});
