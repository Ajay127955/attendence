'use strict';

/**
 * Normalises pagination + sorting query params into a Mongo-friendly shape.
 *
 *   ?page=2&limit=20&sort=-createdAt&search=ali
 *   → { page: 2, limit: 20, skip: 20, sort: { createdAt: -1 } }
 */
function getPagination(query = {}, { defaultLimit = 20, maxLimit = 200, allowedSort = [] } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sort) {
    const fields = String(query.sort)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const built = {};
    for (const field of fields) {
      const dir = field.startsWith('-') ? -1 : 1;
      const key = field.replace(/^[-+]/, '');
      if (allowedSort.length && !allowedSort.includes(key)) continue;
      built[key] = dir;
    }
    if (Object.keys(built).length) sort = built;
  }

  return { page, limit, skip, sort };
}

/** Builds the `meta` block returned alongside paginated lists. */
function buildMeta({ page, limit, total }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/** Escapes user input before it is used inside a RegExp. */
function escapeRegex(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { getPagination, buildMeta, escapeRegex };
