import { Request, Response, NextFunction } from 'express';

function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    // Strip null bytes
    let clean = val.replace(/\0/g, '');
    // Strip dangerous HTML script tags, onerror/onclick inline handlers
    clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    clean = clean.replace(/\bon\w+\s*=/gi, 'data-blocked=');
    clean = clean.replace(/javascript\s*:/gi, 'blocked-scheme:');
    // Bound string length to 20,000 chars to avoid regex DoS
    return clean.slice(0, 20000);
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      // Prototype pollution defense
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      cleanObj[key] = sanitizeValue(val[key]);
    }
    return cleanObj;
  }
  return val;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}
