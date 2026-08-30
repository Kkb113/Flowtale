// Set this from auth0 dashboard, auth_pipeline > rules
// This rule adds the authenticated user's email address to the access token.
// INFO This is deprecated we now use auth0 actions

function addEmailToAccessToken(user, context, callback) {
  // This rule adds the authenticated user's email address to the access token.

  var namespace = 'https://identity.sharefable.com/user';
  context.accessToken[namespace] = {
    familyName: user.family_name || '',
    givenName: user.given_name || '',
    picture: user.picture,
    email: user.email
  };

  return callback(null, user, context);
}
