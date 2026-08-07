import { describe, expect, it } from 'vitest'
import {
  extractConnectionErrorCodes,
  isSslOrCertConnectionError,
} from '@/lib/database/connectionDiagnostics'

describe('connectionDiagnostics', () => {
  it('detects bad_certificate SSL alert errors', () => {
    const error = {
      message:
        'SequelizeConnectionError: ssl/tls alert bad certificate (SSL alert number 42)',
      original: { code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE' },
    }

    expect(isSslOrCertConnectionError(error)).toBe(true)
    expect(extractConnectionErrorCodes(error).code).toBe('ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE')
    expect(extractConnectionErrorCodes(error).reason).toMatch(/bad_certificate/)
  })

  it('detects the exact production OpenSSL alert 42 message from Scene Image', () => {
    const message =
      '00F9E5BCF67F0000:error:0A000412:SSL routines:ssl3_read_bytes:ssl/tls alert bad certificate:ssl/record/rec_layer_s3.c:918:SSL alert number 42\n'
    const error = Object.assign(new Error(message), {
      name: 'SequelizeConnectionError',
      original: { code: 'ERR_SSL_SSL/TLS_ALERT_BAD_CERTIFICATE' },
    })
    expect(isSslOrCertConnectionError(error)).toBe(true)
  })

  it('does not treat generic connection errors as SSL cert failures', () => {
    const error = new Error('password authentication failed for user')
    expect(isSslOrCertConnectionError(error)).toBe(false)
  })
})
