import { BlobServiceClient, StorageSharedKeyCredential, generateBlobSASQueryParameters, BlobSASPermissions } from '@azure/storage-blob';

let blobServiceClient = null;

/**
 * Initialize the Blob Service Client
 */
function getBlobServiceClient() {
  if (blobServiceClient) {
    return blobServiceClient;
  }

  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

  if (!accountName || !accountKey) {
    throw new Error('Azure Storage credentials not configured. Set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
  }

  console.log(`[Blob Storage] Initializing connection to account: ${accountName}`);

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    sharedKeyCredential
  );

  return blobServiceClient;
}

/**
 * Upload a PDF buffer to Azure Blob Storage
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {string} fileName - Name for the blob (e.g., 'transcript-123.pdf')
 * @returns {Promise<string>} - The blob URL with SAS token
 */
export async function uploadPdfToBlob(pdfBuffer, fileName) {
  try {
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'healthbot-transcripts';
    
    console.log(`[Blob Storage] Uploading file: ${fileName} to container: ${containerName}`);
    
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(containerName);
    
    // Create container if it doesn't exist (private access, use SAS tokens for access)
    await containerClient.createIfNotExists();
    
    console.log(`[Blob Storage] Container ready: ${containerName}`);
    
    // Upload the PDF
    const blockBlobClient = containerClient.getBlockBlobClient(fileName);
    await blockBlobClient.upload(pdfBuffer, pdfBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: 'application/pdf'
      }
    });
    
    console.log(`[Blob Storage] ✓ File uploaded successfully: ${fileName}`);
    
    // Generate SAS URL with 7 days expiry
    const sasUrl = await generateSasUrl(containerName, fileName);
    
    return sasUrl;
  } catch (error) {
    console.error(`[Blob Storage] ✗ Upload failed: ${error.message}`);
    throw new Error(`Failed to upload PDF to Blob Storage: ${error.message}`);
  }
}

/**
 * Generate a SAS URL for a blob with read permissions
 * @param {string} containerName - Container name
 * @param {string} blobName - Blob name
 * @returns {Promise<string>} - The blob URL with SAS token
 */
async function generateSasUrl(containerName, blobName) {
  try {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    
    // Set SAS token expiry to 7 days from now
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    
    const sasOptions = {
      containerName: containerName,
      blobName: blobName,
      permissions: BlobSASPermissions.parse('r'), // Read permission
      startsOn: new Date(),
      expiresOn: expiryDate
    };
    
    const sasToken = generateBlobSASQueryParameters(
      sasOptions,
      sharedKeyCredential
    ).toString();
    
    const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;
    
    console.log(`[Blob Storage] ✓ SAS URL generated (expires: ${expiryDate.toISOString()})`);
    
    return sasUrl;
  } catch (error) {
    console.error(`[Blob Storage] ✗ SAS generation failed: ${error.message}`);
    throw error;
  }
}

