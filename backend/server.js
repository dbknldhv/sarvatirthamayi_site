/**
 * STM MERN Backend - Unified Production Server
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");

// Load Environment
dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// --- 1. DIRECTORY SETUP ---
const directories = [path.join(__dirname, 'uploads'), path.join(__dirname, 'public/tickets')];
directories.forEach(dir => { 
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Directory Created: ${dir}`);
    }
});

// --- 2. MIDDLEWARE ---
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: isProduction ? undefined : false }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS Configuration
const allowedOrigins = [
    "http://localhost:5173", 
    "http://localhost:3000",
    "https://api.sarvatirthamayi.com",
    "https://sarvatirthamayi.com",
    "https://admin.sarvatirthamayi.com"
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
}));

// --- 3. STATIC FILES ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/tickets', express.static(path.join(__dirname, 'public/tickets')));

// --- 4. ROUTE IMPORTS ---
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require('./routes/auth.routes');
const userRoutes = require("./routes/userRoutes");
const homeRoutes = require("./routes/homeRoutes");

// --- 5. ROUTE MOUNTING (Unified Flat Path) ---
// This handles your /api/v1/login requests
app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);
app.use('/api', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/home', homeRoutes);

// Health Check
app.get("/", (req, res) => res.status(200).send("STM MERN Backend Running 🚀"));


// --- 6. GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] Error: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(isProduction ? {} : { stack: err.stack })
    });
});

// --- 7. DATABASE & SERVER START ---
mongoose.connect(process.env.MONGO_URI, { autoIndex: true })
    .then(() => console.log(`✅ MongoDB Connected in ${process.env.NODE_ENV || 'development'} mode`))
    .catch(err => {
        console.error("❌ MongoDB Connection Error:", err.message);
        if (isProduction) process.exit(1);
    });

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server Live: http://0.0.0.0:${PORT} | Mode: ${process.env.NODE_ENV || 'Development'}`);
});
