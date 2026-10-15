import { NextRequest, NextResponse } from 'next/server'
import { getAccessCodesInfo, sendDailyAccessCodeEmail } from '@/lib/dailyAccessCode'

export async function GET() {
  try {
    const info = getAccessCodesInfo()
    return NextResponse.json({
      success: true,
      data: info
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'Correo electrónico es requerido' }, { status: 400 })
    }

    const result = await sendDailyAccessCodeEmail(email)

    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: getAccessCodesInfo()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
