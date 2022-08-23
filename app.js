require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());

//Config Nodemailer
const nodemailer = require("nodemailer");
const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.AUTH_EMAIL,
      pass: process.env.AUTH_PASS  
    }
});

transport.verify((err,success) => {
    if(err){
        console.log(err)
    }else{
        console.log("Messaging system");
        console.log(success)
    }
});

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
            message: "Message send successfully"
        })
    })
    .catch((error) => {
        console.log(error);
        res.status(500).json({status: "FAILED",message: "An error occured!"});
    })

})

const port = process.env.PORT || 3000;
app.listen(port,() => {
    console.log(`Sever started running successfully on ${port} `);
})