import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()
    const expectedPassword = process.env.SITE_ACCESS_PASSWORD || 'bienparada2026'

    if (password === expectedPassword) {
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

    return NextResponse.json(
      { success: false, error: 'Código de acceso incorrecto' },
      { status: 401 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Error procesando solicitud' },
      { status: 500 }
    )
  }
}
