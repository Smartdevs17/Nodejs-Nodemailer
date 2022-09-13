const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const _ = require("lodash");

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    verified: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: true
    }
});

userSchema.methods.toJSON = function (){
    const user = this;
    const userObject = user.toObject();
    return _.pick(userObject,["fullName","email","verified"]);
}
userSchema.pre("save",function(next){
    const user = this;
    if(user.isModified("password")){

         bcrypt.genSalt(10,(err,salt) => {
            bcrypt.hash(user.password,salt,(err,hashedPassword) => {
                user.password = hashedPassword;
                next();
            })
        })
    }else{
        next()
    }
})

const User = mongoose.model("User", userSchema);
module.exports = User