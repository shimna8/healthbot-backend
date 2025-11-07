import express from 'express';
import { generatePdfFromTranscript } from '../utils/pdfGenerator.js';
import { uploadPdfToBlob } from '../utils/blobStorage.js';
import { savePdfLocally, isLocalStorageEnabled } from '../utils/localStorage.js';

const router = express.Router();

/**
 * POST /api/pdf
 * Convert health report to PDF and upload to Azure Blob Storage
 *
 * Request Body:
 * {
 *   "report": [
 *     { "question": "Do you have symptoms?", "answer": true },
 *     { "question": "How long?", "answer": "2 weeks" }
 *   ],
 *   "conversationId": "optional-conversation-id"
 * }
 *
 * Response:
 * {
 *   "url": "https://storageaccount.blob.core.windows.net/container/file.pdf?sas-token",
 *   "fileName": "report-123456.pdf",
 *   "size": 12345
 * }
 */
router.post('/', async (req, res) => {
  try {
    console.log('[PDF Route] Received PDF generation request');

    // Step 1: Validate request body
    const { report, conversationId } = req.body;

    if (!report || !Array.isArray(report)) {
      console.error('[PDF Route] ✗ Invalid request: report is missing or not an array');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request body must contain a "report" array'
      });
    }

    if (report.length === 0) {
      console.error('[PDF Route] ✗ Invalid request: report is empty');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Report array cannot be empty'
      });
    }

    console.log(`[PDF Route] ✓ Request validated (${report.length} questions)`);

    // Step 2: Generate PDF from report
    console.log('[PDF Route] Step 2: Generating PDF...');
    const pdfBuffer = await generatePdfFromTranscript(report);

    console.log(`[PDF Route] ✓ PDF generated (${pdfBuffer.length} bytes)`);
    
    // Step 3: Generate unique filename
    const timestamp = Date.now();
    const convId = conversationId || 'unknown';
    const fileName = `health-report-${convId}-${timestamp}.pdf`;

    // Step 4: Save PDF (local or Azure Blob Storage)
    let fileUrl;
    let filePath;

    if (isLocalStorageEnabled()) {
      console.log(`[PDF Route] Step 3: Saving locally as: ${fileName}`);
      const result = await savePdfLocally(pdfBuffer, fileName);
      fileUrl = result.url;
      filePath = result.absolutePath;
      console.log('[PDF Route] ✓ PDF saved locally');
    } else {
      console.log(`[PDF Route] Step 3: Uploading to Azure Blob Storage as: ${fileName}`);
      fileUrl = await uploadPdfToBlob(pdfBuffer, fileName);
      console.log('[PDF Route] ✓ PDF uploaded to Azure Blob Storage');
    }

    // Step 5: Return response
    const response = {
      url: fileUrl,
      fileName: fileName,
      size: pdfBuffer.length,
      questionCount: report.length,
      generatedAt: new Date().toISOString(),
      ...(filePath && { filePath: filePath }),
      storageType: isLocalStorageEnabled() ? 'local' : 'azure'
    };

    console.log('[PDF Route] ✓ Response sent to client');

    res.json(response);
    
  } catch (error) {
    console.error('[PDF Route] ✗ Error generating PDF:', error.message);
    console.error(error.stack);
    
    // Handle specific error cases
    if (error.message.includes('Blob Storage')) {
      return res.status(500).json({
        error: 'Storage error',
        message: 'Failed to upload PDF to Azure Blob Storage',
        details: error.message
      });
    }
    
    if (error.message.includes('PDF')) {
      return res.status(500).json({
        error: 'PDF generation error',
        message: 'Failed to generate PDF from transcript',
        details: error.message
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
 * GET /api/pdf/health
 * Health check for PDF endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    endpoint: '/api/pdf',
    timestamp: new Date().toISOString()
  });
});

export default router;

