import { NextRequest, NextResponse } from 'next/server'
import { requestNewAccessCode } from '@/lib/dailyAccessCode'

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || 'IP pública'

    const result = await requestNewAccessCode(ip)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      targetEmail: result.targetEmail
    })
  } catch (error: any) {
    console.error('[RequestAccessCode] Error:', error)
    return NextResponse.json(
      { success: false, error: 'No se pudo generar o enviar el código. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}
