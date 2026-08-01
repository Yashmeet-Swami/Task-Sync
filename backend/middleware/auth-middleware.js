import jwt from "jsonwebtoken";
import User from "../models/user.js";
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res
                .status(401)
                .json({ message: "Unauthorized: No token provided" });
        }

        const token = authHeader.split(" ")[1]; // Extract the token after "Bearer"

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized: Invalid token format",
            });
        }

        // Continue with token verification logic...

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        if (decoded.purpose !== "access-token") {
            return res.status(401).json({
                message: "Invalid token purpose",
            });
        }

        const user = await User.findById(decoded.userId);


        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
            })
        }
        req.user = user;
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                message: "jwt expired",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        req.log?.error({ err: error }, "Unexpected auth-middleware error");
        res.status(500).json({
            message: "Internal server error",
        })
    }
};

export default authMiddleware;
