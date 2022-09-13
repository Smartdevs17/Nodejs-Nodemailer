require("dotenv").config();
const express = require("express");
// const uuid = require("uuid");
const { 
    v1: uuidv1,
    v4: uuidv4,
  } = require('uuid');
const bcrypt = require("bcrypt");
const app = express();
const connection = require("./db/config-db");

const User = require("./models/User");
const PasswordReset = require("./models/PasswordReset");

app.use(express.json());

//Config Nodemailer
const nodemailer = require("nodemailer");

//Simple approach for sending email
const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS  
    }
});

//Using google oauth
// const transport = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       type: "OAuth2",
//       user: process.env.AUTH_EMAIL,
//       clientId: process.env.AUTH_CLIENT_ID,
//       clientSecret: process.env.AUTH_CLIENT_SECRET,
//       refreshToken: process.env.AUTH_REFRESH_TOKEN
//     }
// });

transport.verify((err,success) => {
    if(err){
        console.log(err)
    }else{
        console.log("Messaging system");
        console.log(success)
    }
});

app.post("/users",(req,res) => {
    const {fullName,email} = req.body;
    if(fullName && email){
        const newuser = new User(req.body)
        newuser.save().then((result) => {
            res.status(200).json({
                success: true,
                message: "user saved to db",
                data: result
            });
        })
        .catch((err) => {
            console.log(err)
            res.status(422).json({
                success: false,
                message: "an error occurred while saving user",
                errror: err
            })
        })
    }else{
        res.status(400).json({
            success: false,
            message: "bad request"
        })
    }
})

app.post("/sendmail",(req,res) => {
    const {to, subject, message} = req.body;

    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: to,
        subject: subject,
        text: message
    }

    transport
    .sendMail(mailOptions)
    .then(() => {
        //successfully message
        res.status(200).json({
            status: "SUCCESS",
            message: "Message sent successfully"
        })
    })
    .catch((error) => {
        console.log(error);
        res.status(500).json({status: "FAILED",message: "An error occured!"});
    })

});

app.post("/requestPasswordReset",(req,res) => {
   const {email,redirectUrl}  = req.body;
   if(email){
    User.findOne({email}).then((data) => {
        if (data){
            //check if user is verfied 
            if(!data.verified){
              res.json({
                success: false,
                message: "Email has not yet been verified"    
            })  
            }else{
                //reset the user password
                sendResetEmail(data,redirectUrl,res)
            }
        }else{
            res.json({
                success: false,
                message: "No account with the supplied email exists",
            })
        }
       })
       .catch((err) => {
        console.log(err)
        res.json({success: false,
        message: err})
       })
   }else{
        res.status(400).json({
            success: false,
            message: "bad request"
        })
   }

});

//send password reset email
const sendResetEmail = ({_id,email },redirectUrl,res) => {
    const resetString = uuidv4() + _id;
    // console.log(resetString)

    PasswordReset.deleteMany({userId: _id})
        .then((result) => {

            const mailOptions = {
                from: process.env.AUTH_EMAIL,
                to: email,
                subject: "Password Reset",
                html: `<p>We heard that you lost the password.</p> <p>Don't worry, use the link below to reset it.</p> <p>This link <b>expires in 60minutes</b></p> <p>Press <a href=${redirectUrl  +"/"+ _id + "/" + resetString}>here</a> to proceed. </p>` 
            }

            const salt = 10;
            bcrypt.hash(resetString,salt).then((hashString => {
                const newPasswordRest = new PasswordReset({
                    userId: _id,
                    resetString: hashString,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 3600000 
                });

                newPasswordRest.save()
                    .then(() => {
                        transport
                        .sendMail(mailOptions)
                        .then(() => {
                            res.status(200).json({
                                success: true,
                                status: "PENDING",
                                message: "Password reset email sent",
                                link: newPasswordRest
                            })
                        })
                        .catch(err => {
                            console.log(err)
                            res.status(422).json({
                                success: false,
                                message: "an error occurred while hashing password reset data"
                            })
                        })
                    })
                    .catch((err) => {
                        console.log(err)
                        res.status(422).json({
                            success: false,
                            message: "an error occurred while hashing password reset data"
                        })       
                    })
            })
            )
            .catch((err) => {
                console.log(err)
                res.status(422).json({
                    success: false,
                    message: "an error occurred while hashing password reset data"
                })
            })
        })
        .catch((err) => {
            console.log(err);
            res.json({
                success: false,
                message: "failed to delete password record"
            });
        });
};

app.post("/resetPassword",(req,res) => {
    const {userId,resetString,newPassword} = req.body
    if(userId && resetString){
        PasswordReset.find({userId})
            .then((result) => {
                // console.log(result);
                if(result.length > 0 ){

                    const {expiresAt} = result[0];
                    const hashedResetString = result[0].resetString;
                    if(expiresAt < Date.now()){
                        PasswordReset.deleteMany({userId})
                        .then(() => {
                            res.status(404).json({
                                success: false,
                                message: "reset password link has expired"
                            })
                        })
                        .catch((err) => {
                            res.status(422).json({
                                success: false,
                                message: err
                            })
                        })           
                    }else{
                        bcrypt.compare(resetString,hashedResetString)
                        .then((result) => {
                            if(result){
                                const salt = 10;
                                bcrypt.hash(newPassword,salt).then((hashedPassword) => {
                                    User.findOneAndUpdate({_id: userId},{password: hashedPassword})
                                        .then(() => {
                                            PasswordReset.deleteOne({userId}).then(() => {
                                                res.status(200).json({
                                                    success: true,
                                                    message: "Password reset was successful",
                                                })
                                            }).catch((err) => {
                                                res.status(422).json({
                                                    success: false,
                                                    message: "an error occurred while deleting reset link"
                                                })     
                                            })
                             
                                        }).catch((err) => {
                                            res.status(422).json({
                                                success: false,
                                                message: "an error occurred while updating user password"
                                            })
                                        } )
                                }).catch((err) => {
                                    res.status(422).json({
                                        success: false,
                                        message: "an error occurred while saving new password"
                                    })
                                })
                                // User.findOneAndUpdate({_id: userId},{password: newPassword})
                                // .then((user) => {
                                //     console.log(user)
                                //     console.log("updated password")
                                //     PasswordReset.deleteOne({userId}).then(() => {
                                //         res.status(200).json({
                                //             success: true,
                                //             message: "Password reset was successful",
                                //         })
                                //     }).catch((err) => {
                                //         res.status(422).json({
                                //             success: false,
                                //             message: "an error occurred while deleting reset link"
                                //         })     
                                //     })
                     
                                // }).catch((err) => {
                                //     res.status(422).json({
                                //         success: false,
                                //         message: "an error occurred while updating user password"
                                //     })
                                // } )
                            }else{
                                res.status(400).json({
                                    success: false,
                                    message: "invalid user reset link"
                                })     
                            }
                        })
                        .catch((err) => {
                            res.status(400).json({
                                success: false,
                                message: "bad request",
                                error: err
                            })     
                        })
                    }
                }else{
                    res.status(400).json({
                        success: false,
                        message: "bad request"
                    })                
                }
            })
            .catch((err) => {
                res.status(400).json({
                    success: false,
                    message: err
                })
            })
    }else{
        res.status(400).json({
            success: false,
            message: "bad request"
        });
    }
});

const port = process.env.PORT || 3000;
app.listen(port,() => {
    console.log(`Sever started running successfully on ${port} `);
});