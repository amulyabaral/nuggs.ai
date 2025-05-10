import crypto from 'crypto'; // Needed for AWS Signature V4

// IMPORTANT: Store these in your environment variables (e.g., .env.local)
const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY;
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY;
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG; // Your associate tag
const AMAZON_PARTNER_TYPE = "Associates"; // Usually "Associates"
const AMAZON_HOST = "webservices.amazon.com"; // Or the host for your region
const AMAZON_REGION = "us-east-1"; // Or your region
const AMAZON_SERVICE = "ProductAdvertisingAPI";

// --- AWS Signature V4 Helper Functions (Simplified Example) ---
// In a real application, use the AWS SDK or a robust library like 'aws4'.
// This is a conceptual outline and may not be fully functional for signing.
const createCanonicalRequest = (method, path, query, headers, payload) => {
    const headerKeys = Object.keys(headers).sort().map(k => k.toLowerCase());
    const signedHeaders = headerKeys.join(';');
    const canonicalHeaders = headerKeys.map(k => `${k}:${headers[k].trim()}\n`).join('');
    const hashedPayload = crypto.createHash('sha256').update(payload).digest('hex');
    return `${method}\n${path}\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;
};

const createStringToSign = (timestamp, region, service, canonicalRequest) => {
    const scope = `${timestamp.substring(0, 8)}/${region}/${service}/aws4_request`;
    const hashedCanonicalRequest = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    return `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${hashedCanonicalRequest}`;
};

const getSignatureKey = (key, dateStamp, regionName, serviceName) => {
    const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    return kSigning;
};
// --- End AWS Signature V4 Helper Functions ---


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
        console.error("Amazon API credentials are not configured on the server.");
        return res.status(500).json({ error: 'Amazon API credentials not configured.' });
    }

    const {
        keywords,
        searchIndex = "All", // Default SearchIndex
        itemCount = 5,      // Default number of items to return
        resources = ["Images.Primary.Medium", "ItemInfo.Title", "Offers.Listings.Price", "DetailPageURL"]
    } = req.body;

    if (!keywords) {
        return res.status(400).json({ error: 'Keywords are required for Amazon search.' });
    }

    const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems`;
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payload = {
        Keywords: keywords,
        PartnerTag: AMAZON_PARTNER_TAG,
        PartnerType: AMAZON_PARTNER_TYPE,
        SearchIndex: searchIndex,
        ItemCount: itemCount,
        Resources: resources
    };
    const payloadString = JSON.stringify(payload);

    // --- Construct and Sign the Request (Conceptual) ---
    // This part requires a proper AWS Signature V4 implementation.
    // The following is a simplified representation.
    const host = `webservices.amazon.com`; // e.g., webservices.amazon.com for US
    const region = `us-east-1`; // e.g., us-east-1 for US
    const path = '/paapi5/searchitems';

    const headers = {
        'host': host,
        'x-amz-target': target,
        'x-amz-date': amzDate,
        'content-encoding': 'amz-1.0',
        'content-type': 'application/json; charset=utf-8',
        // Authorization header will be added after signing
    };

    // Simplified signing - replace with robust solution
    // const canonicalRequest = createCanonicalRequest('POST', path, '', headers, payloadString);
    // const stringToSign = createStringToSign(amzDate, region, AMAZON_SERVICE, canonicalRequest);
    // const signingKey = getSignatureKey(AMAZON_SECRET_KEY, dateStamp, region, AMAZON_SERVICE);
    // const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    // headers['Authorization'] = `AWS4-HMAC-SHA256 Credential=${AMAZON_ACCESS_KEY}/${dateStamp}/${region}/${AMAZON_SERVICE}/aws4_request, SignedHeaders=${Object.keys(headers).sort().map(k=>k.toLowerCase()).join(';')}, Signature=${signature}`;
    // --- End Simplified Signing ---

    try {
        // In a real scenario, you would use the signed headers to make the fetch request.
        // For this example, we'll simulate a response.
        // console.log("Attempting to call Amazon PAAPI with payload:", payloadString);
        // console.log("Headers (before actual signing):", headers);

        // const amazonResponse = await fetch(`https://${host}${path}`, {
        //     method: 'POST',
        //     headers: headers, // These would be the fully signed headers
        //     body: payloadString,
        // });
        // const responseData = await amazonResponse.json();
        // if (!amazonResponse.ok) {
        //     console.error('Amazon PAAPI Error:', responseData);
        //     throw new Error(responseData.Errors?.[0]?.Message || `Amazon API request failed: ${amazonResponse.statusText}`);
        // }
        // return res.status(200).json(responseData.SearchResult || { Items: [] });

        // **MOCKED RESPONSE FOR DEVELOPMENT (since signing is complex for this example)**
        // Replace this with the actual fetch call above once signing is implemented.
        console.warn("Using MOCKED Amazon API response for /api/amazon-search");
        if (keywords.toLowerCase().includes("error")) {
             return res.status(500).json({ error: 'Simulated Amazon API error.' });
        }
        const mockItems = Array.from({ length: itemCount }).map((_, i) => ({
            ASIN: `MOCKASIN${i}`,
            DetailPageURL: `https://www.amazon.com/dp/MOCKASIN${i}?tag=${AMAZON_PARTNER_TAG}`,
            ItemInfo: {
                Title: { DisplayValue: `Mock Product ${keywords} ${i + 1}` }
            },
            Images: {
                Primary: {
                    Medium: { URL: `https://via.placeholder.com/150?text=Mock+${i+1}`, Height: 150, Width: 150 }
                }
            },
            Offers: {
                Listings: [{
                    Price: { DisplayAmount: `$${(Math.random() * 20 + 5).toFixed(2)}`, Amount: (Math.random() * 20 + 5) * 100, Currency: "USD" }
                }]
            }
        }));
        return res.status(200).json({ Items: mockItems, TotalResultCount: mockItems.length, SearchURL: `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}&tag=${AMAZON_PARTNER_TAG}` });
        // **END MOCKED RESPONSE**

    } catch (error) {
        console.error('Error calling Amazon PAAPI via proxy:', error);
        return res.status(500).json({ error: 'Failed to call Amazon PAAPI.', details: error.message });
    }
} 