import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Brand } from "@/components/Brand"

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - Sayfa Bulunamadı | FootbalLab</title>
        <meta name="description" content="Sayfa bulunamadı" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <div className="flex justify-center"><Brand size={56} /></div>
          <h1 className="text-4xl font-bold text-gray-900">404</h1>
          <p className="text-lg text-gray-600">Aradığınız sayfa bulunamadı. Taşınmış, silinmiş veya hiç var olmamış olabilir.</p>
          <Button asChild>
            <Link href="/">
              Ana sayfaya dön
            </Link>
          </Button>
        </div>
      </main>
    </>
  )
}
