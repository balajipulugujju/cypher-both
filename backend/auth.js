const jwt = require('jsonwebtoken');
const {getItemsByParams} = require('./db');


const generateToken = (email,time) => {
    return jwt.sign({ email }, process.env.JWT_SECRET, {
        expiresIn: time
    });
}
const verifyAuth = async (req, res, next) => {

    const { token, user } = req.headers;
    // console.log(token);
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const response = await getItemsByParams("email",decoded.email, user+"s");
            req.user = response.data
            // console.log("user from token : ", response.data)
        }   
        catch (error) {
            console.log(error);
            res.status(401).json({
                message: "NOT_AUTHORIZED"
            });
            return;
        }
    }
    next();
}

module.exports = {
    verifyAuth, 
    generateToken,
} 