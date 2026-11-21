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

    const defaultKidsProfileId = manager.addProfile({ name: 'DefaultKids', isKids: true });
    assert.equal(manager.canWatchContent(defaultKidsProfileId, '10'), true);
    assert.equal(manager.canWatchContent(defaultKidsProfileId, '12'), false);

    const tweenKidsProfileId = manager.addProfile({ name: 'Tween', isKids: true, maxRating: '12' });
    assert.equal(manager.canWatchContent(tweenKidsProfileId, '10'), true);
    assert.equal(manager.canWatchContent(tweenKidsProfileId, '12'), false);
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

  test('unlockParentalSettings throws if no account PIN is set, requires 4-digit PIN, and unlocks restriction', () => {
    // case without specific account PIN
    const manager1 = createProfileManager();
    const kids1 = manager1.addProfile({ name: 'Kids 1', isKids: true, maxRating: '10' });
    
    assert.throws(() => {
      manager1.unlockParentalSettings(kids1, '1234');
    }, /No account PIN configured/);

    // case with specific account PIN
    const manager2 = createProfileManager('1234');
    const kids2 = manager2.addProfile({ name: 'Kids 2', isKids: true, maxRating: '10' });

    assert.throws(() => {
      manager2.unlockParentalSettings(kids2, '123');
    }, /PIN must be a 4-digit string/);

    assert.equal(manager2.unlockParentalSettings(kids2, '9999'), false);
    assert.equal(manager2.canWatchContent(kids2, '16'), false);

    assert.equal(manager2.unlockParentalSettings(kids2, '1234'), true);
    assert.equal(manager2.canWatchContent(kids2, '16'), true);

    const otherKids = manager2.addProfile({ name: 'Other Kids', isKids: true, maxRating: '10' });
    assert.equal(manager2.canWatchContent(otherKids, '16'), false);
  });

  test('addProfile throws for invalid options', () => {
    const manager = createProfileManager();
    
    assert.throws(() => {
      manager.addProfile();
    }, /Options must be an object/);

    assert.throws(() => {
      manager.addProfile(null);
    }, /Options must be an object/);

    assert.throws(() => {
      manager.addProfile({ name: '' });
    }, /Name must be a non-empty string/);

    assert.throws(() => {
      manager.addProfile({ name: 123 });
    }, /Name must be a non-empty string/);

    assert.throws(() => {
      manager.addProfile({ name: 'User', isKids: 'false' });
    }, /isKids must be a boolean/);

    assert.throws(() => {
      manager.addProfile({ name: 'User', maxRating: '21' });
    }, /Invalid rating/);

    assert.throws(() => {
      manager.addProfile({ name: 'User', maxRating: 'l' });
    }, /Invalid rating/);

    assert.throws(() => {
      manager.addProfile({ name: 'User', maxRating: 10 });
    }, /Invalid rating/);
  });

  test('throws for invalid content rating or profile', () => {
    const manager = createProfileManager('1234');
    const id = manager.addProfile({ name: 'User' });
    
    assert.throws(() => {
      manager.canWatchContent(id, 'INVALID');
    }, /Invalid content rating/);

    assert.throws(() => {
      manager.canWatchContent('nonexistent', '10');
    }, /Profile not found/);

    assert.throws(() => {
      manager.unlockParentalSettings('nonexistent', '1234');
    }, /Profile not found/);
  });
});
