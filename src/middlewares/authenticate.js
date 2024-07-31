
const jwt = require('jsonwebtoken');
const createError = require('http-errors');

const authenticate = async (req, res, next) => {
    try {
        const { authorization } = req.headers;

        if (!authorization) {
            return next(createError(401, "Unauthorized"));
        }

        const arrayToken = authorization.split(" ");
        const token = arrayToken[1];

        if (arrayToken[0] !== "Bearer" || !token) {
            return next(createError(401, "Unauthorized"));
        }

        let payload;

        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return next(createError(401, "TokenExpiredError"));
            } else if (err.name === 'JsonWebTokenError') {
                return next(createError(401, "Invalid token")); 
            } else {
                return next(createError(500, "Internal server error"));
            }
        }

        if (typeof payload !== "object" || !payload?.data) {
            return next(createError(400, "Payload not in correct format"));
        }

        const user = payload.data;

        if (!user) {
            return next(createError(404, "User not found"));
        }

        req.user = user;
        next();

    } catch (err) {
        next(createError(500, "Internal server error"));
    }
};

module.exports = authenticate;