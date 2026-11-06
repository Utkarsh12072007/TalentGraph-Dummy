// Consistent success response shape: { data: ... }
// The client's api.js unwraps `data`, so pages only deal with payloads.

const ok = (res, data, status = 200) => res.status(status).json({ data });
const created = (res, data) => ok(res, data, 201);

// Builds the pagination block returned by every list endpoint.
function pageMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

module.exports = { ok, created, pageMeta };
