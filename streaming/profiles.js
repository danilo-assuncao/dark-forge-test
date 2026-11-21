const VALID_RATINGS = ['L', '10', '12', '14', '16', '18'];
const RATINGS_ORDER = {
  'L': 0,
  '10': 1,
  '12': 2,
  '14': 3,
  '16': 4,
  '18': 5
};

export function createProfileManager(accountPin) {
  if (accountPin !== undefined && !/^\d{4}$/.test(accountPin)) {
    throw new Error('Invalid account PIN: must be a 4-digit numeric string');
  }

  const profiles = new Map();
  let nextId = 1;

  function addProfile(options) {
    if (profiles.size >= 5) {
      throw new Error('Maximum of 5 profiles reached');
    }
    
    let { name, isKids = false, maxRating = '18' } = options;

    if (!VALID_RATINGS.includes(maxRating)) {
      throw new Error('Invalid rating');
    }

    if (isKids && RATINGS_ORDER[maxRating] > RATINGS_ORDER['10']) {
      maxRating = '10';
    }

    const id = (nextId++).toString();
    const profile = {
      id,
      name,
      isKids,
      maxRating,
      parentalUnlocked: false
    };

    profiles.set(id, profile);
    return id;
  }

  function canWatchContent(profileId, contentRating) {
    const profile = profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');
    
    if (!VALID_RATINGS.includes(contentRating)) {
      throw new Error('Invalid content rating');
    }

    const effectiveMaxRating = profile.parentalUnlocked ? '18' : profile.maxRating;

    return RATINGS_ORDER[contentRating] <= RATINGS_ORDER[effectiveMaxRating];
  }

  function unlockParentalSettings(profileId, pin) {
    const profile = profiles.get(profileId);
    if (!profile) throw new Error('Profile not found');
    
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be a 4-digit string');
    }
    
    if (accountPin !== undefined && pin !== accountPin) {
      return false;
    }
    
    profile.parentalUnlocked = true;
    return true;
  }

  return {
    addProfile,
    canWatchContent,
    unlockParentalSettings
  };
}
