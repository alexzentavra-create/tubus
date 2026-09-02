import { NextRequest, NextResponse } from 'next/server'

// Rate limiter for payment preference creation
const mpIpLimits = new Map<string, { count: number; resetAt: number }>()

function checkMpRateLimit(ip: string, limit = 20, windowMs = 60000): boolean {
  const now = Date.now()
  const record = mpIpLimits.get(ip)
  if (!record || now > record.resetAt) {
    mpIpLimits.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= limit) return false
  record.count++
  return true
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  if (!checkMpRateLimit(ip)) {
    return NextResponse.json({ error: 'Demasiadas solicitudes. Por favor, espere un minuto.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { title, amount, adId, userEmail, returnUrl } = body

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'MERCADOPAGO_ACCESS_TOKEN not configured on server' },
        { status: 500 }
      )
    }

    const parsedAmount = Math.max(1, Math.round(Number(amount) || 500))
    const origin = returnUrl || request.headers.get('origin') || 'https://bienparada.com.ar'

    const preferencePayload = {
      items: [
        {
          id: adId || `ad-${Date.now()}`,
          title: title || 'Campaña Publicitaria BienParada',
          description: `Pauta publicitaria en BienParada para ${title || 'Comercio Local'}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: parsedAmount,
        },
      ],
      payer: {
        email: userEmail || 'anunciante@bienparada.com.ar',
      },
      back_urls: {
        success: `${origin}?mp_status=approved&ad_id=${adId || ''}`,
        failure: `${origin}?mp_status=failure&ad_id=${adId || ''}`,
        pending: `${origin}?mp_status=pending&ad_id=${adId || ''}`,
      },
      auto_return: 'approved',
      statement_descriptor: 'BIENPARADA',
      external_reference: adId || `ad-ref-${Date.now()}`,
      metadata: {
        ad_id: adId,
        user_email: userEmail,
        amount: parsedAmount,
      },
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preferencePayload),
    })

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json().catch(() => ({}))
      console.error('Mercado Pago API error:', errorData)
      return NextResponse.json(
        { error: 'Error al generar preferencia en Mercado Pago', details: errorData },
        { status: mpResponse.status }
      )
    }

    const data = await mpResponse.json()

    return NextResponse.json({
      success: true,
      preferenceId: data.id,
      initPoint: data.init_point,
      sandboxInitPoint: data.sandbox_init_point,
    })
  } catch (error: any) {
    console.error('Error creating MP preference:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error creating preference' },
      { status: 500 }
    )
  }
}
