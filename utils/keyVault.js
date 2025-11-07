import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

let secretClient = null;

/**
 * Initialize the Key Vault Secret Client
 * Uses Managed Identity in Azure, falls back to environment variables locally
 */
function getSecretClient() {
  if (secretClient) {
    return secretClient;
  }

  const keyVaultName = process.env.AZURE_KEY_VAULT_NAME;
  
  if (!keyVaultName) {
    throw new Error('AZURE_KEY_VAULT_NAME environment variable is not set');
  }

  const keyVaultUrl = `https://${keyVaultName}.vault.azure.net`;
  
  console.log(`[Key Vault] Initializing connection to: ${keyVaultUrl}`);
  
  // DefaultAzureCredential automatically uses:
  // 1. Managed Identity when deployed to Azure
  // 2. Azure CLI credentials when running locally
  // 3. Environment variables (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET)
  const credential = new DefaultAzureCredential();
  
  secretClient = new SecretClient(keyVaultUrl, credential);
  
  return secretClient;
}

/**
 * Get a secret from Azure Key Vault
 * @param {string} secretName - Name of the secret to retrieve
 * @returns {Promise<string>} - The secret value
 */
export async function getSecret(secretName) {
  try {
    console.log(`[Key Vault] Retrieving secret: ${secretName}`);

    const client = getSecretClient();
    const secret = await client.getSecret(secretName);

    console.log(`[Key Vault] ✓ Successfully retrieved secret: ${secretName}`);

    return secret.value;
  } catch (error) {
    console.error(`[Key Vault] ✗ Failed to retrieve secret: ${secretName}`);
    console.error(`[Key Vault] Error: ${error.message}`);
    throw new Error(`Failed to retrieve secret from Key Vault: ${error.message}`);
  }
}

/**
 * Get the Direct Line Secret from environment variable or Key Vault
 * Priority:
 * 1. DIRECTLINE_SECRET environment variable (for local development without Azure login)
 * 2. Azure Key Vault (for production or when Azure CLI is authenticated)
 * @returns {Promise<string>} - The Direct Line Secret
 */
export async function getDirectLineSecret() {
  // First, check if Direct Line secret is provided directly in environment variable
  const directSecret = process.env.DIRECTLINE_SECRET;

  if (directSecret) {
    console.log('[Key Vault] Using Direct Line secret from DIRECTLINE_SECRET environment variable');
    return directSecret;
  }

  // If not in env var, try to get from Key Vault
  console.log('[Key Vault] DIRECTLINE_SECRET not found in environment, attempting Key Vault retrieval...');
  const secretName = process.env.DIRECTLINE_SECRET_NAME || 'DirectLineSecret';
  return await getSecret(secretName);
}

