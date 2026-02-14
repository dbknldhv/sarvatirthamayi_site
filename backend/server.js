/**
 * STM MERN Backend - Core Server Configuration
 * Handles: MongoDB connection, Razorpay setup, Static File Serving, and API Routing
 */

// --- 1. INITIALIZE CORE MODULES ---
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

// --- 2. LOAD ENVIRONMENT VARIABLES ---
const envResult = dotenv.config({ path: path.join(__dirname, ".env") });

if (envResult.error) {
    console.error("❌ Failed to load .env file. Check if it exists in:", __dirname);
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");

// --- 3. DIRECTORY SETUP ---
const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'public/tickets')
];

directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Directory Verified/Created: ${dir}`);
    }
});

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// --- 4. DEBUG: VERIFY SYSTEM CONFIG ---
console.log("Environment Check:", {
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID ? "✅ FOUND" : "❌ MISSING",
    MONGO_URI: process.env.MONGO_URI ? "✅ FOUND" : "❌ MISSING",
    PORT: process.env.PORT || 5000,
    MODE: isProduction ? 'Production' : 'Development'
});

// --- 5. MIDDLEWARE ---
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: isProduction ? undefined : false,
}));

app.use(compression());

// --- FIX: ROBUST CORS WHITELIST ---
const allowedOrigins = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,        // https://sarvatirthamayi.com
    process.env.ADMIN_FRONTEND_URL   // https://admin.sarvatirthamayi.com
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // This will show up in your terminal if a local request is blocked
            console.warn(`🛑 CORS Blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// --- 6. STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/tickets', express.static(path.join(__dirname, 'public/tickets')));

// --- 7. ROUTE IMPORTS ---
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require('./routes/auth.routes');
const userRoutes = require("./routes/userRoutes");

// Health Check
app.get("/", (req, res) => {
    res.status(200).send("STM MERN Backend Running 🚀");
});

// API Endpoints
// Note: If authRoutes handles /login, URL is /api/admin/auth/login
app.use('/api/admin/auth', authRoutes);
app.use("/api/admin", adminRoutes); 
app.use("/api/user", userRoutes);

// --- 8. GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    const statusCode = err.status || 500;
    
    // Log the error for the developer
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(isProduction ? {} : { stack: err.stack }) 
    });
});

// --- 9. DATABASE CONNECTION ---
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log(`✅ MongoDB Connected Successfully`);
    })
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        if (isProduction) process.exit(1); 
    });

// --- 10. SERVER START ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`
    ************************************************
    🚀 Server Live: http://localhost:${PORT}
    🛠️  Mode:        ${isProduction ? 'Production' : 'Development'}
    ************************************************
    `);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        process.exit(1);
    }
});