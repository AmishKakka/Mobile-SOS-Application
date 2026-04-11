const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    //Get the token from the request header (Format: "Bearer <token>")
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    //Extract the actual token string
    const token = authHeader.split(' ')[1];

    try {
        //Verify the token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

        //Attach the decoded user payload (which contains the user ID) to the request object
        req.user = decoded.user;
        
        //Move to the next function (the controller)
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};