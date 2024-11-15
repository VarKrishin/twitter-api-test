require('dotenv').config();
const fs = require('fs');
const Fastify = require('fastify');
const fastifySession = require('@fastify/session');
const fastifyCookie = require('@fastify/cookie');
const { TwitterApi } = require('twitter-api-v2');
const path = require('path');

const app = Fastify({ logger: true });

// Retrieve session secret from .env or set a default long secret
const sessionSecret = process.env.SESSION_SECRET || 'a_really_long_secret_key_for_session_management_that_is_32_chars_long';

// Register cookie and session plugins for session management
app.register(fastifyCookie);
app.register(fastifySession, {
  secret: sessionSecret,
  cookie: { secure: false },
});

// Instantiate Twitter client with client credentials
const client = new TwitterApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
});

app.get('/', async (request, reply) => {
  // Generate the OAuth2 authentication link
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(process.env.CALLBACK_URL, {
    scope: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'],
  });
  

  // Log the generated state and codeVerifier
  console.log('Generated state:', state);
  console.log('Generated codeVerifier:', codeVerifier);

  // Store `state` and `codeVerifier` in session
  request.session.state = state;
  request.session.codeVerifier = codeVerifier;

  // Redirect user to Twitter's authentication page
  reply.redirect(url);
});

app.get('/callback', async (request, reply) => {
  const { state, code } = request.query;

  // Log the state and code received in the callback
  console.log('Received state from callback:', state);
  console.log('Received code from callback:', code);

  // Validate state and code
  if (!state || !code) {
    reply.status(400).send('Access denied or expired session!');
    return;
  }

  // Retrieve state and codeVerifier from session
  const sessionState = request.session.state;
  const codeVerifier = request.session.codeVerifier;

  // Log the sessionState and codeVerifier for debugging
  console.log('Session state:', sessionState);
  console.log('Session codeVerifier:', codeVerifier);

  if (state !== sessionState) {
    reply.status(400).send('Stored tokens did not match!');
    return;
  }

  try {
    // Obtain the access token
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.CALLBACK_URL,
    });

    // Log access token details
    console.log('Access token:', accessToken);
    console.log('Refresh token:', refreshToken);
    console.log('Expires in:', expiresIn);

    // Example request to get the authenticated user's info
    const { data: userObject } = await loggedClient.v2.me();

    // Log user information
    console.log('Authenticated user info:', userObject);

    // Prepare data to save
    const authData = {
      message: 'Authentication successful',
      user: {
        id: userObject.id,
        name: userObject.name,
        username: userObject.username,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: expiresIn,
    };

    // Define file path
    const filePath = path.join(__dirname, 'authData.json');

    // Write data to JSON file
    fs.writeFileSync(filePath, JSON.stringify(authData, null, 2), 'utf-8');
    console.log('Authentication data saved to authData.json');

    // Send response
    reply.send(authData);
  } catch (error) {
    console.error('Error during login:', error);
    reply.status(403).send('Invalid verifier or access tokens!');
  }
});

// Start the Fastify server
const start = async () => {
  try {
    await app.listen({ port: 3000 });
    console.log('Server is running on http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
