import express from 'express';
import axios from 'axios';
import { getDirectLineSecret } from '../utils/keyVault.js';

const router = express.Router();

/**
 * POST /api/token
 * Generate a Direct Line token for the Health Bot
 * 
 * Response:
 * {
 *   "token": "string",
 *   "conversationId": "string",
 *   "expires_in": number
 * }
 */
router.post('/', async (req, res) => {
  try {
    console.log('[Token Route] Received token generation request');
    
    // Step 1: Get Direct Line Secret from Key Vault
    console.log('[Token Route] Step 1: Retrieving Direct Line Secret from Key Vault...');
    const directLineSecret = await getDirectLineSecret();
    
    if (!directLineSecret) {
      throw new Error('Direct Line Secret is empty or undefined');
    }
    
    console.log('[Token Route] ✓ Direct Line Secret retrieved');
    
    // Step 2: Call Direct Line API to generate token
    console.log('[Token Route] Step 2: Calling Direct Line API...');
    const directLineUrl = 'https://directline.botframework.com/v3/directline/tokens/generate';
    
    const response = await axios.post(
      directLineUrl,
      {}, // Empty body
      {
        headers: {
          'Authorization': `Bearer ${directLineSecret}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('[Token Route] ✓ Direct Line token generated successfully');
    
    // Step 3: Return the token to the client
    const tokenData = {
      token: response.data.token,
      conversationId: response.data.conversationId,
      expires_in: response.data.expires_in
    };
    
    console.log('[Token Route] ✓ Token response sent to client');
    console.log(`[Token Route] Conversation ID: ${tokenData.conversationId}`);
    
    res.json(tokenData);
    
  } catch (error) {
    console.error('[Token Route] ✗ Error generating token:', error.message);
    
    // Handle specific error cases
    if (error.response) {
      // Direct Line API returned an error
      console.error('[Token Route] Direct Line API Error:', error.response.status, error.response.data);
      return res.status(error.response.status).json({
        error: 'Failed to generate Direct Line token',
        message: error.response.data.message || 'Direct Line API error',
        details: error.response.data
      });
    }
    
    if (error.message.includes('Key Vault')) {
      // Key Vault error
      return res.status(500).json({
        error: 'Key Vault configuration error',
        message: error.message
      });
    }
    
    // Generic error
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/token/health
 * Health check for token endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoint: '/api/token',
    timestamp: new Date().toISOString()
  });
});

export default router;

