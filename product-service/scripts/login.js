#!/usr/bin/env node
const AWS = require('aws-sdk');
AWS.config.region = 'eu-west-1';
const cognitoIDP = new AWS.CognitoIdentityServiceProvider();

const loginUser = async (clientId) => {
  try {
    const signedInUser = await cognitoIDP
      .initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: `YOUR USERNAME`,
          PASSWORD: `YOUR PASSWORD`,
        },
      })
      .promise();
    
    if (signedInUser.ChallengeName == 'NEW_PASSWORD_REQUIRED') {
      const challengeParams = {
        ClientId: clientId, // same as before
        ChallengeName: signedInUser.ChallengeName,
        Session: signedInUser.Session, // provided by initiateAuth
        ChallengeResponses: {
          USERNAME: `YOUR USERNAME`,
          "USER_ID_FOR_SRP": "YOUR USERNAME",
          NEW_PASSWORD: 'YOUR PASSWORD',
          "userAttributes.family_name": "YOUR USER SURNAME",
          "userAttributes.given_name": "YOUR USER FIRST NAME",
        }
      };
      const authChallengeResponse = await cognitoIDP.respondToAuthChallenge(challengeParams).promise();
      console.log(authChallengeResponse.AuthenticationResult.IdToken);
      return;
    }
    
    console.log(`ID Token: ${signedInUser.AuthenticationResult.IdToken}\n`);
  } catch (err) {
    console.error('User creation failed.');
    throw err;
  }
};

loginUser('YOUR CLIENT ID');
