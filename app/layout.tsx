import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'W杯2026 予想バトル',
  description: '2026 FIFAワールドカップ 予想ポイントバトル',
  openGraph: {
    title: 'W杯2026 予想バトル',
    description: 'みんなで予想してポイントを競おう！',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
