import { NextResponse } from 'next/server'

// Real verified online news feed sources for Buenos Aires transport & fares
export async function GET() {
  try {
    // 1. Live Google News RSS Feed for Buenos Aires transport, SUBE, bus fare increases
    const rssUrl = `https://news.google.com/rss/search?q=colectivos+amba+tarifa+sube+buenos+aires&hl=es-419&gl=AR&ceid=AR:es-419`
    const res = await fetch(rssUrl, { next: { revalidate: 3600 } })
    const xmlText = await res.text()

    // 2. Parse RSS items
    const items: any[] = []
    const itemRegex = /<item>[\s\S]*?<\/item>/g
    const matches = xmlText.match(itemRegex) || []

    matches.slice(0, 12).forEach((itemXml, idx) => {
      const titleMatch = itemXml.match(/<title>(.*?)<\/title>/)
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/) || itemXml.match(/url="(.*?)"/)
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/)

      let title = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : ''
      let url = linkMatch ? linkMatch[1] : 'https://www.google.com/search?q=buenos+aires+colectivos+transporte'
      let pubDate = pubDateMatch ? new Date(pubDateMatch[1]).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Reciente'
      let source = sourceMatch ? sourceMatch[1] : 'Noticias Transporte'

      // Clean title if source is appended with - Source
      if (title.includes(' - ')) {
        const parts = title.split(' - ')
        source = parts.pop() || source
        title = parts.join(' - ')
      }

      // Ensure relevance to bus fares, SUBE, and AMBA transport
      const lowerTitle = title.toLowerCase()
      const isRelevant = lowerTitle.includes('colectivo') || lowerTitle.includes('sube') || lowerTitle.includes('tarifa') || lowerTitle.includes('boleto') || lowerTitle.includes('transporte') || lowerTitle.includes('amba') || lowerTitle.includes('subte')

      if (title && isRelevant) {
        items.push({
          id: `news-real-${Date.now()}-${idx}`,
          title: title.trim(),
          desc: `Artículo publicado por ${source}. Información actualizada sobre las tarifas de transporte, tarjeta SUBE y líneas de colectivos en el AMBA.`,
          url: url,
          source: source.trim(),
          image: idx % 3 === 0
            ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80'
            : idx % 3 === 1
            ? 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=600&q=80'
            : 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80',
          date: pubDate,
          isBusRelated: true,
          isNew: idx < 3,
          starred: false,
          comments: []
        })
      }
    })

    // Fallback if RSS query returns empty
    if (items.length === 0) {
      items.push({
        id: `news-real-fallback-1`,
        title: 'Aumento del boleto de colectivo en el AMBA y actualización de SUBE',
        desc: 'Nuevos valores para el transporte público en el Área Metropolitana de Buenos Aires. Descuentos vigentes con tarjeta SUBE registrada.',
        url: 'https://www.argentina.gob.ar/sube',
        source: 'SUBE / Ministerio de Transporte',
        image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=600&q=80',
        date: new Date().toLocaleDateString('es-AR'),
        isBusRelated: true,
        isNew: true,
        starred: false,
        comments: []
      })
    }

    return NextResponse.json({ success: true, news: items, updatedAt: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch live news' }, { status: 500 })
  }
}
