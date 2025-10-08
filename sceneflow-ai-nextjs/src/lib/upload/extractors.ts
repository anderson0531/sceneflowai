// Robust client-side extractors with dynamic, client-only deps

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const [pdfjs, pdfjsWorker] = await Promise.all([
      import('pdfjs-dist') as any,
      // Use CDN worker to avoid bundling issues
      Promise.resolve('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'),
    ]) as any

    // Configure worker
    if (pdfjs?.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker
    }

    const data = await file.arrayBuffer()
    const pdf = await (pdfjs.getDocument as any)({ data }).promise
    let out = ''
    const numPages: number = pdf.numPages
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      const strings: string[] = content.items?.map((it: any) => it.str) ?? []
      out += strings.join(' ') + '\n\n'
    }
    return out.trim()
  } catch (err) {
    console.error('PDF extract error:', err)
    return ''
  }
}

export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const [{ default: JSZip }, { XMLParser }] = await Promise.all([
      import('jszip'),
      import('fast-xml-parser') as any,
    ])
    const buf = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(buf)
    // Main document XML
    const docXmlFile = zip.file('word/document.xml')
    if (!docXmlFile) return ''
    const xml = await docXmlFile.async('text')
    const parser = new XMLParser({ ignoreAttributes: false })
    const json: any = parser.parse(xml)
    // Walk paragraphs and runs
    const body = json?.['w:document']?.['w:body']
    const paragraphs: any[] = Array.isArray(body?.['w:p']) ? body['w:p'] : body?.['w:p'] ? [body['w:p']] : []
    const texts: string[] = []
    for (const p of paragraphs) {
      const runs = Array.isArray(p?.['w:r']) ? p['w:r'] : p?.['w:r'] ? [p['w:r']] : []
      const parts: string[] = []
      for (const r of runs) {
        const t = r?.['w:t']
        if (typeof t === 'string') parts.push(t)
        else if (typeof t === 'object' && typeof t['#text'] === 'string') parts.push(t['#text'])
      }
      if (parts.length) texts.push(parts.join(''))
    }
    return texts.join('\n')
  } catch (err) {
    console.error('DOCX extract error:', err)
    return ''
  }
}

