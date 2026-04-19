const { verifyIdToken } = require('../services/cognitoVerifier');

module.exports = async function (req, res, next) {
    // Get the token from the request header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Extract the actual token string
    const token = authHeader.split(' ')[1];

    try {
        const payload = await verifyIdToken(token);

        // Attach the unique AWS user ID ('sub') to the request object
        req.user = {
            cognitoId: payload.sub,
            email: payload.email,
            firstName: payload.given_name,
            lastName: payload.family_name
        };
        
        // Move to the next function (the controller)
        next();
    } catch (error) {
        console.error("AWS Token Verification Failed:", error.message);
        res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};
