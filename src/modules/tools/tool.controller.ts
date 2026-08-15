import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/utils/ApiError';
import { sendSuccess } from '../../shared/utils/ApiResponse';

const isInternalHost = (hostname: string): boolean => {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === 'metadata.google.internal' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname === '::1'
  );
};

// POST /api/tools/import-image — fetches a product image from a user-supplied URL
export const importImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    if (!url) throw new ApiError(400, 'url is required');

    let hostname = '';
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new ApiError(400, 'Invalid URL');
    }

    if (isInternalHost(hostname)) {
      throw new ApiError(400, 'URL is not allowed');
    }

    let response: Awaited<ReturnType<typeof fetch>> | undefined;
    let fetchFailed = false;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch {
      fetchFailed = true;
    }

    if (fetchFailed) {
      return sendSuccess(res, {
        url,
        contentType: '',
        bytes: 0,
      }, 'Image fetch failed (target unreachable)');
    }

    const buffer = await response!.arrayBuffer();

    sendSuccess(res, {
      url,
      contentType: response!.headers.get('content-type') || '',
      bytes: buffer.byteLength,
    }, 'Image fetched');
  } catch (error) {
    next(error);
  }
};

// GET /api/tools/invoice?customerName=... — generates an invoice with the customer name
export const generateInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const customerName = (req.query.customerName as string) || 'Customer';

    const safeName = String(customerName).replace(/[${}]/g, '');
    sendSuccess(res, { invoice: `Invoice for: ${safeName}` });
  } catch (error) {
    next(error);
  }
};
