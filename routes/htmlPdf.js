import express from 'express';
import { renderReportPdf, getDefaultReportData } from '../utils/puppeteerPdf.js';
import { uploadPdfToBlob } from '../utils/blobStorage.js';
import { savePdfLocally, isLocalStorageEnabled } from '../utils/localStorage.js';

const router = express.Router();

/**
 * POST /api/html-pdf
 * Generate a PDF using Puppeteer from an HTML template (English/Arabic)
 *
 * Request body example:
 * {
 *   "lang": "en" | "ar",
 *   "data": { age: 60, gender: "Male", smoker: "Non-smoker", caregiver: "Son: 30", symptomsYes: [...], symptomsNo: [...] }
 * }
 */
router.post('/', async (req, res) => {
  try {
    const fullData = req?.body || getDefaultReportData();
    const data = Array.isArray(fullData?.report) ? fullData.report : [];
    const lang = (fullData?.lang || 'en').toLowerCase() === 'ar-ae' ? 'ar' : 'en';
    // console.log("---lang--------------------",lang)

    // console.log('[HTML PDF Route] Generating PDF for language:', data);
    const pdfBuffer = await renderReportPdf(lang, data);

    const timestamp = Date.now();
    const fileName = `health-report-${lang}-${timestamp}.pdf`;

    let fileUrl;
    let filePath;
    if (isLocalStorageEnabled()) {
      const result = await savePdfLocally(pdfBuffer, fileName);
      fileUrl = result.url;
      filePath = result.absolutePath;
    } else {
      fileUrl = await uploadPdfToBlob(pdfBuffer, fileName);
    }

    return res.json({
      url: fileUrl,
      fileName,
      size: pdfBuffer.length,
      lang,
      generatedAt: new Date().toISOString(),
      ...(filePath && { filePath }),
      storageType: isLocalStorageEnabled() ? 'local' : 'azure',
    });
  } catch (err) {
    console.error('[HTML PDF Route] Error:', err);
    return res.status(500).json({ error: 'Failed to generate PDF', message: err.message });
  }
});

// Health endpoint for this route
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', endpoint: '/api/htmlpdf', timestamp: new Date().toISOString() });
});

export default router;

