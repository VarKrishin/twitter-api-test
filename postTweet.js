const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');

// Read access token from authData.json
function getAccessToken() {
  try {
    const data = fs.readFileSync('authData.json', 'utf-8');
    const authData = JSON.parse(data);
    return authData.accessToken;
  } catch (error) {
    console.error('Error reading access token from authData.json:', error);
    return null;
  }
}

const accessToken = getAccessToken();
console.log(accessToken);

if (!accessToken) {
  console.error('Access token not found. Please authenticate first.');
  process.exit(1); // Exit if no access token is found
}

// Instantiate Twitter client with the access token
const client = new TwitterApi(accessToken);

(async () => {
  try {
    // Post a tweet
    const tweetText = 'My tweet text from api';

    // If you have media IDs, add them here. This example assumes you already uploaded media.
    const mediaIds = ['media_id_1', 'media_id_2']; // Replace with actual media IDs

    // Post the tweet with text and media
    const response = await client.v2.tweet({
      text: tweetText
    });

    console.log('Tweet posted successfully:', response);
  } catch (error) {
    console.error('Error posting tweet:', error);
  }
})();
