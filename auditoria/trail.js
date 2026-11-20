'use strict';

/**
 * Trims and freezes an entry; internal control characters and length are preserved.
 * Consumers must use structured JSON serialization (JSON.stringify), never
 * concatenate fields into line-oriented logs. Render fields as text (textContent),
 * not HTML, and apply any display-specific control-character and length limits
 * at the consuming boundary. Freezing does not sanitize untrusted input.
 */
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
