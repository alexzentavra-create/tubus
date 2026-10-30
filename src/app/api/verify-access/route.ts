import { NextRequest, NextResponse } from 'next/server'
import { isValidAccessPassword, checkAndAutoSendDailyAccessCode } from '@/lib/dailyAccessCode'
import { getLockoutStatus, recordFailedAttempt, recordSuccessfulAttempt } from '@/lib/rateLimitLockout'

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return (forwardedFor ? forwardedFor.split(',')[0].trim() : realIp) || 'ip_unknown'
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const lockKey = `access_ip_${ip}`
    const status = getLockoutStatus(lockKey)
    return NextResponse.json({ success: true, ...status })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const lockKey = `access_ip_${ip}`

    // 1. Check if IP is currently locked out
    const lockStatus = getLockoutStatus(lockKey)
    if (lockStatus.isLocked) {
      const minutesLeft = Math.ceil(lockStatus.remainingSeconds / 60)
      return NextResponse.json(
        {
          success: false,
          isLocked: true,
          remainingSeconds: lockStatus.remainingSeconds,
          lockoutMinutes: lockStatus.lockoutMinutes,
          error: `Acceso bloqueado por seguridad tras 3 intentos incorrectos. Debés esperar ${minutesLeft} minuto(s) antes de intentar nuevamente.`
        },
        { status: 429 }
      )
    }

    const { password } = await request.json().catch(() => ({}))

    // Trigger auto-send in background if new day arrived
    checkAndAutoSendDailyAccessCode().catch(() => {})

    // 2. Validate password / access code
    if (isValidAccessPassword(password)) {
      // Clear lockout record on successful entry
      recordSuccessfulAttempt(lockKey)

      const response = NextResponse.json({ success: true })
      // Set secure cookie for 30 days
      response.cookies.set('bp_access', 'granted_2026', {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
      return response
    }

    // 3. Record failed attempt and compute exponential backoff
    const attemptResult = recordFailedAttempt(lockKey)

    return NextResponse.json(
      {
        success: false,
        isLocked: attemptResult.isLocked,
        remainingSeconds: attemptResult.remainingSeconds,
        remainingAttempts: attemptResult.remainingAttempts,
        lockoutMinutes: attemptResult.lockoutMinutes,
        error: attemptResult.message
      },
      { status: attemptResult.isLocked ? 429 : 401 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Error procesando solicitud' },
      { status: 500 }
    )
  }
}
