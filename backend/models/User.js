const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // 🎯 Existing Fields
    sql_id: { type: Number, default: 0 }, 
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, trim: true },
    name: { type: String }, 
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    mobile_number: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    user_type: { type: Number, enum: [1, 2, 3], default: 3 }, 
    role: { type: String }, 
    is_verified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otp_expires: { type: Date, default: null },

    // 🎯 NEW FIELDS ADDED: Required for Flutter & React Profile Sync
    date_of_birth: { type: String, trim: true, default: "" }, 
    gender: { type: String, enum: ["1", "2", "3"], default: "1" }, // 1:Male, 2:Female, 3:Other
    profile_picture: { type: String, default: "" },
    banner_image: { type: String, default: "" }

}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- PRE-SAVE HOOK ---
userSchema.pre('save', async function(next) {
    // Ensure sql_id is NEVER null or empty for the Flutter C: Drive project
    if (!this.sql_id || this.sql_id === 0) {
        this.sql_id = Math.floor(100000 + Math.random() * 900000);
    }

    if (this.isModified('user_type') || !this.role) {
        if (this.user_type === 1) this.role = 'admin';
        else if (this.user_type === 2) this.role = 'temple-admin';
        else this.role = 'user';
    }

    if (this.isModified('first_name') || this.isModified('last_name')) {
        this.name = `${this.first_name} ${this.last_name || ''}`.trim();
    }

    if (this.isModified('password')) {
        const isAlreadyHashed = this.password.startsWith('$2b$') || this.password.startsWith('$2a$');
        if (!isAlreadyHashed) {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }
    
    next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');