// Zod validation middleware.
//
// Each route declares what a valid request looks like. Invalid requests are
// rejected with a 400 BEFORE any business logic runs, so services can trust
// the shapes of req.body / req.query / req.params.

const { ApiError, asyncHandler } = require('../utils/ApiError');

const validate = (schemas) =>
  asyncHandler(async (req, _res, next) => {
    try {
      if (schemas.body) req.body = await schemas.body.parseAsync(req.body ?? {});
      if (schemas.query) req.validatedQuery = await schemas.query.parseAsync(req.query ?? {});
      if (schemas.params) req.validatedParams = await schemas.params.parseAsync(req.params ?? {});
      next();
    } catch (err) {
      if (err?.issues) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        return next(ApiError.badRequest('Please check the highlighted fields', details));
      }
      next(err);
    }
  });

module.exports = { validate };
