import { NextRequest, NextResponse } from 'next/server'
import { getAccessCodesInfo, sendDailyAccessCodeEmail, checkAndAutoSendDailyAccessCode, DEFAULT_ACCESS_RECIPIENT_EMAIL } from '@/lib/dailyAccessCode'

export async function GET() {
  try {
    // Run auto-dispatch check if new day
    await checkAndAutoSendDailyAccessCode()

    const info = getAccessCodesInfo()
    return NextResponse.json({
      success: true,
      data: {
        ...info,
        defaultRecipientEmail: DEFAULT_ACCESS_RECIPIENT_EMAIL
      }
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email || DEFAULT_ACCESS_RECIPIENT_EMAIL

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
