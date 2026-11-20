'use strict';

function formatAuditEntry(actor, action) {
  if (typeof actor !== 'string' || actor.trim() === '') {
    throw new TypeError('actor must be a non-empty string');
  }
  if (typeof action !== 'string' || action.trim() === '') {
    throw new TypeError('action must be a non-empty string');
  }

  return Object.freeze({ actor: actor.trim(), action: action.trim() });
}

module.exports = { formatAuditEntry };
