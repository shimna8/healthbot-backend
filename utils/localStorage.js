import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save PDF to local storage
 * @param {Buffer} pdfBuffer - The PDF file as a buffer
 * @param {string} fileName - Name for the file (e.g., 'transcript-123.pdf')
 * @returns {Promise<string>} - The local file URL
 */
export async function savePdfLocally(pdfBuffer, fileName) {
  try {
    // Create 'pdfs' directory in project root if it doesn't exist
    const pdfsDir = path.join(__dirname, '..', 'pdfs');
    
    if (!fs.existsSync(pdfsDir)) {
      console.log(`[Local Storage] Creating directory: ${pdfsDir}`);
      fs.mkdirSync(pdfsDir, { recursive: true });
    }
    
    const filePath = path.join(pdfsDir, fileName);
    
    console.log(`[Local Storage] Saving file: ${fileName}`);
    
    // Write PDF to file
    fs.writeFileSync(filePath, pdfBuffer);
    
    console.log(`[Local Storage] ✓ File saved successfully: ${filePath}`);
    
    // Return the local file path and URL
    const fileUrl = `/pdfs/${fileName}`;
    
    return {
      url: fileUrl,
      filePath: filePath,
      absolutePath: path.resolve(filePath)
    };
  } catch (error) {
    console.error(`[Local Storage] ✗ Save failed: ${error.message}`);
    throw new Error(`Failed to save PDF locally: ${error.message}`);
  }
}

/**
 * Check if local storage is enabled
 * @returns {boolean}
 */
export function isLocalStorageEnabled() {
  return process.env.USE_LOCAL_STORAGE === 'true' || 
         !process.env.AZURE_STORAGE_ACCOUNT_NAME || 
         !process.env.AZURE_STORAGE_ACCOUNT_KEY;
}

