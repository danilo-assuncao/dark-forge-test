window.module = { exports: {} };
window.require = function(mod) {
  if (mod === 'node:crypto') {
    return {
      randomUUID: function() {
        if (window.crypto && window.crypto.randomUUID) {
          return window.crypto.randomUUID();
        }
        const arr = new Uint8Array(16);
        window.crypto.getRandomValues(arr);
        arr[6] = (arr[6] & 0x0f) | 0x40;
        arr[8] = (arr[8] & 0x3f) | 0x80;
        const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
        return `${hex.substring(0,8)}-${hex.substring(8,12)}-${hex.substring(12,16)}-${hex.substring(16,20)}-${hex.substring(20,32)}`;
      }
    };
  }
  if (mod === './spaces' || mod === './spaces.js') return window.spacesAPI;
  if (mod === './bookings' || mod === './bookings.js') return window.bookingsAPI;
  if (mod === './amenities' || mod === './amenities.js') return window.amenitiesAPI;
  throw new Error('Unknown module: ' + mod);
};
