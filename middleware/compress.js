/**
 * middleware/compress.js — Response compression middleware.
 * Owns: gzip/brotli/deflate compression for HTTP responses (HTML, CSS, JS, JSON).
 * Does NOT own: static file serving, cache headers (handled by express.static + server.js).
 *
 * Uses Node built-in zlib — no npm dependency.
 * Skips: already-compressed formats (images, woff2), small responses < 1KB.
 */
'use strict';

const zlib = require('zlib');

const COMPRESSIBLE = /text\/|application\/(json|javascript|xml)|image\/svg/;
const MIN_SIZE = 1024; // Don't compress < 1KB

function compress(req, res, next) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Pick best encoding: brotli > gzip > deflate
  let encoding = null;
  if (acceptEncoding.includes('br')) encoding = 'br';
  else if (acceptEncoding.includes('gzip')) encoding = 'gzip';
  else if (acceptEncoding.includes('deflate')) encoding = 'deflate';

  if (!encoding) return next();

  const originalWrite = res.write.bind(res);
  const originalEnd = res.end.bind(res);
  let compressor = null;
  let headersSent = false;

  function getContentType() {
    return res.getHeader('Content-Type') || '';
  }

  function shouldCompress() {
    if (res.getHeader('Content-Encoding')) return false; // already encoded
    const ct = getContentType();
    return COMPRESSIBLE.test(ct);
  }

  function setupCompressor() {
    if (compressor || !shouldCompress()) return false;
    const opts = { level: zlib.constants.Z_DEFAULT_COMPRESSION };
    if (encoding === 'br') {
      compressor = zlib.createBrotliCompress({
        params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }, // fast, good ratio
      });
    } else if (encoding === 'gzip') {
      compressor = zlib.createGzip(opts);
    } else {
      compressor = zlib.createDeflate(opts);
    }
    res.setHeader('Content-Encoding', encoding);
    res.removeHeader('Content-Length'); // compressed size differs
    res.setHeader('Vary', 'Accept-Encoding');
    return true;
  }

  res.write = function(chunk, encoding_or_cb, cb) {
    if (!headersSent) {
      headersSent = true;
      setupCompressor();
    }
    if (!compressor) return originalWrite(chunk, encoding_or_cb, cb);
    return compressor.write(chunk, encoding_or_cb, cb);
  };

  res.end = function(chunk, encoding_or_cb, cb) {
    if (!headersSent) {
      headersSent = true;
      // Check content length — skip tiny responses
      const len = chunk ? Buffer.byteLength(chunk) : 0;
      if (len < MIN_SIZE || !setupCompressor()) {
        return originalEnd(chunk, encoding_or_cb, cb);
      }
    }
    if (!compressor) return originalEnd(chunk, encoding_or_cb, cb);

    // Pipe compressed output to original response
    compressor.on('data', d => originalWrite(d));
    compressor.on('end', () => originalEnd());
    if (chunk) compressor.write(chunk);
    compressor.end();
  };

  next();
}

module.exports = { compress };
