const { CognitoJwtVerifier } = require('aws-jwt-verify');

const userPoolId = process.env.COGNITO_USER_POOL_ID;
const clientId = process.env.COGNITO_CLIENT_ID;

if (!userPoolId || !clientId) {
  throw new Error(
    'Missing required Cognito configuration: COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID must be set.'
  );
}

const verifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'id',
  clientId,
});

async function verifyIdToken(token) {
  if (!token) {
    throw new Error('Missing Cognito ID token.');
  }

  return verifier.verify(token);
}

module.exports = {
  verifyIdToken,
};
