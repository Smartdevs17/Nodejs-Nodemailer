const mongoose = require("mongoose");

const passwordResetSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    resetString: {
        type: String,
        required: true
    },
    createdAt: Date,
    expiresAt: Date
});


const PasswordReset = mongoose.model('PasswordReset',passwordResetSchema);
module.exports = PasswordReset;