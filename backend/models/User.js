const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    sql_id: { type: Number, unique: true, sparse: true }, 
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, trim: true },
    name: { type: String }, 
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    mobile_number: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    
    // 1=Super Admin, 2=Temple Admin, 3=Devotee/User
    user_type: { type: Number, enum: [1, 2, 3], default: 3 },
    role: { type: String }, 
    
    // Security & Verification
    is_verified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otp_expires: { type: Date, default: null },

    // --- MEMBERSHIP FIELDS (For Discount Logic) ---
    is_membership_active: { type: Boolean, default: false },
    membership_type: { type: String, enum: ['none', 'basic', 'premium'], default: 'none' },
    membership_expiry: { type: Date, default: null },

    // Associated Temple (For Temple Admins - Type 2)
    temple_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Temple', default: null }

}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

/**
 * Method to compare passwords
 * Used in authController.login
 */
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- PRE-SAVE HOOK ---
userSchema.pre('save', async function(next) {
    // 1. Assign Role string automatically based on user_type
    if (this.isModified('user_type') || !this.role) {
        if (this.user_type === 1) this.role = 'admin';
        else if (this.user_type === 2) this.role = 'temple-admin';
        else this.role = 'user';
    }

    // 2. Update full name if names change
    if (this.isModified('first_name') || this.isModified('last_name')) {
        this.name = `${this.first_name} ${this.last_name || ''}`.trim();
    }

    // 3. Hash password ONLY if it is new or modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        // Higher salt rounds (12) for better production security
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');