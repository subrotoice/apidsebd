const { fetchLatestSharePrices } = require('./scraper');

// This is a Netlify Scheduled Function
// It doesn't need Express. It just runs the scraper.
export const handler = async (event, context) => {
  console.log("Starting scheduled refresh...");
  try {
    const stocks = await fetchLatestSharePrices();
    console.log(`Successfully refreshed ${stocks.length} stocks.`);
    
    // Note: In a real serverless app, you would save this to a 
    // database (like MongoDB or Redis) because memory is wiped 
    // between function calls.
    
    return {
      statusCode: 200,
    };
  } catch (error) {
    console.error("Refresh failed:", error.message);
    return {
      statusCode: 500,
    };
  }
};
