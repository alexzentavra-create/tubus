import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topic = searchParams.get('topic') || searchParams.get('type')
    const id = searchParams.get('id') || searchParams.get('data.id')

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ received: true, note: 'No access token configured' })
    }

    if (topic === 'payment' && id) {
      // Query Mercado Pago for payment verification
      const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json()
        const status = paymentData.status // 'approved', 'pending', etc.
        const adId = paymentData.metadata?.ad_id || paymentData.external_reference

        if (status === 'approved' && adId) {
          // Log payment and trigger internal sync if needed
          console.log(`[Mercado Pago Webhook] Payment ${id} APPROVED for Ad ${adId}`)
        }
      }
    }

    return NextResponse.json({ received: true, status: 'processed' })
  } catch (err: any) {
    console.error('Error handling MP webhook:', err)
    return NextResponse.json({ received: true, error: err.message }, { status: 200 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Mercado Pago Webhook endpoint active' })
}
