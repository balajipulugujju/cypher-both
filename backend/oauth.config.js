const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const dotenv = require('dotenv') 
const { generateToken, verifyAuth}=require("./auth.js")

dotenv.config()

const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" // Redirect URI
  );
  
  oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
  
  // const sendEmailVerification = async (email, user) => {
  //   try {
  
  //     const transporter = nodemailer.createTransport({
  //       service: "gmail",
  //       auth: {
  //         type: "OAuth2",
  //         user: process.env.EMAIL,
  //         clientId: process.env.CLIENT_ID,
  //         clientSecret: process.env.CLIENT_SECRET,
  //         refreshToken: process.env.REFRESH_TOKEN,
  //       },
  //     });
  
  //     const token = generateToken(email,60*2);
  
  //     const mailConfigurations = {
  //       from: process.env.EMAIL,
  //       to: email,
  //       subject: "Email Verification",
  //       text: "Hi! There, You have recently visited our website and entered your email. Please follow the given link to verify your email http://geniebackend-env.eba-mpuj7u22.us-east-1.elasticbeanstalk.com/api/"+user+"/verify/"+token+" Thanks"
  //     };
  
  //     // Send the email
  //     const info = await transporter.sendMail(mailConfigurations);
  //     console.log("Email Sent Successfully");
  //   } catch (error) {
  //     console.error("Error sending email:", error.message);
  //   }
  // };

  const sendMail = async(email,type,user) => {
    try {
  
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.EMAIL,
          clientId: process.env.CLIENT_ID,
          clientSecret: process.env.CLIENT_SECRET,
          refreshToken: process.env.REFRESH_TOKEN,
        },
      });
  
      const token = generateToken(email,60*2);
      let subject;
      let text;

      if(type=="verify"){
        subject="Email Verification";
        text= "Hi! There, You have recently visited our website and entered your email. Please follow the given link to verify your email http://Cypher-env.eba-nedbtzfz.ap-south-1.elasticbeanstalk.com/api/"+user+"/verify/"+token+" Thanks"
      }
      else{
        subject="Reset Password";
        text="Hi! There, You have recently visited our website and entered your email. Please follow the given link to verify your email http://Cypher-env.eba-nedbtzfz.ap-south-1.elasticbeanstalk.com/api/"+user+"/resetpassword/"+token+" Thanks"
      }
      const mailConfigurations = {
        from: process.env.EMAIL,
        to: email,
        subject:subject,
        text:text
      };
  
      // Send the email 
      const info = await transporter.sendMail(mailConfigurations);
      console.log("Email Sent Successfully");
    } catch (error) {
      console.error("Error sending email:", error.message);
    }
  }
  
  module.exports = {
    sendMail
}
