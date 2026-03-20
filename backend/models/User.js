const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    sql_id: { type: Number, default: null, unique :true, sparse: true }, 
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, trim: true },
    name: { type: String }, 
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    mobile_number: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    user_type: { type: Number, enum: [1, 2, 3], default: 3 }, // 1: Admin, 2: Temple Admin, 3: User
    role: { type: String }, 
    is_verified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otp_expires: { type: Date, default: null }
}, { 
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } 
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// --- PRE-SAVE HOOK ---
userSchema.pre('save', async function() {
    // 1. Assign Role string based on user_type
    if (this.isModified('user_type') || !this.role) {
        if (this.user_type === 1) this.role = 'admin';
        else if (this.user_type === 2) this.role = 'temple-admin';
        else this.role = 'user';
    }

    // 2. Generate full name automatically
    if (this.isModified('first_name') || this.isModified('last_name')) {
        this.name = `${this.first_name} ${this.last_name || ''}`.trim();
    }

    if (this.isModified('password')) {
        // Prevent double-hashing if the password is already a hash
        const isAlreadyHashed = this.password.startsWith('$2b$') || this.password.startsWith('$2a$');
        
        if (!isAlreadyHashed) {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        }
    }
    
    // 🎯 NO next() call here. 
    // Since this is an async function, Mongoose knows to wait 
    // until the function resolves before proceeding with the save.

});

module.exports = mongoose.models.User || mongoose.model('User', userSchema, 'users');