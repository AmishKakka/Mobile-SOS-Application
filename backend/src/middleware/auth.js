const { CognitoJwtVerifier } = require("aws-jwt-verify");

// Initialize the AWS verifier
const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID || 'your_pool_id',
    tokenUse: "id", // AWS Cognito ID tokens
    clientId: process.env.COGNITO_CLIENT_ID || 'your_client_id',
});

module.exports = async function (req, res, next) {
    // Get the token from the request header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Extract the actual token string
    const token = authHeader.split(' ')[1];

    try {
        // AWS mathematically verifies the token signature in milliseconds
        const payload = await verifier.verify(token);

        // Attach the unique AWS user ID ('sub') to the request object
        req.user = { cognitoId: payload.sub };
        
        // Move to the next function (the controller)
        next();
    } catch (error) {
        console.error("AWS Token Verification Failed:", error.message);
        res.status(401).json({ message: 'Token is not valid or has expired' });
    }
};