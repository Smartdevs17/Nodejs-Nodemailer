const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/mailerDB",{useNewUrlParser: true});
const connection = mongoose.connection;
connection.on("error",(error) => console.log(error));
connection.once("open",() => console.log("Successfully connected to db"));

module.exports = connection;
