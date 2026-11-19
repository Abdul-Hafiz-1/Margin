let workerInstance: any = null;

export async function extractTextFromImage(
  imageFile: File | Blob,
  onProgress?: (percent: number, status: string) => void
): Promise<string> {
  try {
    if (onProgress) onProgress(15, 'Preparing on-device OCR engine...');

    // Dynamic import to keep main bundle tiny
    const { createWorker } = await import('tesseract.js');

    const worker = await createWorker('eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && onProgress) {
          const pct = Math.round(15 + (m.progress || 0) * 80);
          onProgress(pct, `Scanning image (${pct}%)...`);
        }
      },
    });

    workerInstance = worker;
    if (onProgress) onProgress(45, 'Scanning text from image...');

    const ret = await worker.recognize(imageFile);
    if (onProgress) onProgress(100, 'OCR scan complete');

    const cleanText = ret.data.text.trim();
    return cleanText;
  } catch (err) {
    console.error('OCR processing error:', err);
    throw new Error('Could not extract text from this screenshot. Please paste text directly.');
  } finally {
    if (workerInstance) {
      try {
        await workerInstance.terminate();
        workerInstance = null;
      } catch {
        // ignore
      }
    }
  }
}
