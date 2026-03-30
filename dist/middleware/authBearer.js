"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireBearerToken = requireBearerToken;
const env_1 = require("../config/env");
const issuer = `https://${env_1.env.auth0.domain}/`;
const jwksUrl = `${issuer}.well-known/jwks.json`;
let jwks = null;
async function requireBearerToken(req, res, next) {
    try {
        const authorization = req.header("authorization");
        if (!authorization) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const [scheme, token] = authorization.split(" ");
        if (scheme !== "Bearer" || !token) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const jose = await import("jose");
        if (!jwks) {
            jwks = jose.createRemoteJWKSet(new URL(jwksUrl));
        }
        const { payload } = await jose.jwtVerify(token, jwks, {
            issuer,
            audience: env_1.env.auth0.audience,
        });
        req.auth = payload;
        next();
    }
    catch (error) {
        console.error("JWT validation failed:", error);
        res.status(401).json({ error: "Unauthorized" });
    }
}
