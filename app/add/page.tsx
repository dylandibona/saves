import { Nav } from '@/components/nav'
import { AddForm } from './add-form'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add' }

export default function AddPage() {
  return (
    <>
      <Nav />
      <main className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif-display text-3xl text-white/90 leading-tight">
            What are you saving?
          </h1>
          <p className="mt-2 text-sm text-white/40">
            A place, a recipe, something to watch, a note to yourself.
          </p>
        </div>
        <AddForm />
      </main>
    </>
  )
}
