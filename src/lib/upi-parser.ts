export interface UPIData {
  upiId: string
  payeeName?: string
  amount?: string
  transactionNote?: string
  merchantCode?: string
  transactionRef?: string
  url?: string
}

export class UPIParser {
  private static readonly UPI_URL_PATTERN = /upi:\/\/pay\?([^#\s]+)/i
  private static readonly DIRECT_UPI_PATTERN = /([a-zA-Z0-9.\-_]{3,}@[a-zA-Z0-9.\-_]{3,})/g
  private static readonly PHONE_UPI_PATTERN = /(\d{10}@[a-zA-Z0-9.\-_]+)/g

  static parseUPI(input: string): UPIData | null {
    if (!input || typeof input !== 'string') return null
    const cleanInput = input.trim()
    const upiUrlMatch = cleanInput.match(this.UPI_URL_PATTERN)
    if (upiUrlMatch) return this.parseUPIUrl(upiUrlMatch[0])
    const directUpiMatch = cleanInput.match(this.DIRECT_UPI_PATTERN)
    if (directUpiMatch) return { upiId: directUpiMatch[0], url: cleanInput }
    const phoneUpiMatch = cleanInput.match(this.PHONE_UPI_PATTERN)
    if (phoneUpiMatch) return { upiId: phoneUpiMatch[0], url: cleanInput }
    return null
  }

  private static parseUPIUrl(upiUrl: string): UPIData | null {
    try {
      const url = new URL(upiUrl)
      const params = new URLSearchParams(url.search)
      const pa = params.get('pa')
      if (!pa) return null
      return {
        upiId: decodeURIComponent(pa),
        payeeName: params.get('pn') ? decodeURIComponent(params.get('pn')!) : undefined,
        amount: params.get('am') || undefined,
        transactionNote: params.get('tn') ? decodeURIComponent(params.get('tn')!) : undefined,
        merchantCode: params.get('mc') || undefined,
        transactionRef: params.get('tr') || undefined,
        url: upiUrl,
      }
    } catch {
      return this.fallbackParseUPIUrl(upiUrl)
    }
  }

  private static fallbackParseUPIUrl(upiUrl: string): UPIData | null {
    const params: Record<string, string> = {}
    const paramString = upiUrl.split('?')[1]
    if (!paramString) return null
    paramString.split('&').forEach((param) => {
      const [key, value] = param.split('=')
      if (key && value) params[key] = decodeURIComponent(value)
    })
    if (!params.pa) return null
    return {
      upiId: params.pa,
      payeeName: params.pn || undefined,
      amount: params.am || undefined,
      transactionNote: params.tn || undefined,
      url: upiUrl,
    }
  }

  static isValidUPIId(upiId: string): boolean {
    if (!upiId || typeof upiId !== 'string') return false
    return /^[a-zA-Z0-9.\-_]{3,}@[a-zA-Z0-9.\-_]{3,}$/.test(upiId)
  }

  static extractAllUPIIds(text: string): string[] {
    const upiIds: string[] = []
    const upiData = this.parseUPI(text)
    if (upiData) upiIds.push(upiData.upiId)
    const directMatches = text.match(this.DIRECT_UPI_PATTERN) || []
    directMatches.forEach((m) => {
      if (this.isValidUPIId(m) && !upiIds.includes(m)) upiIds.push(m)
    })
    const phoneMatches = text.match(this.PHONE_UPI_PATTERN) || []
    phoneMatches.forEach((m) => {
      if (this.isValidUPIId(m) && !upiIds.includes(m)) upiIds.push(m)
    })
    return upiIds
  }
}
