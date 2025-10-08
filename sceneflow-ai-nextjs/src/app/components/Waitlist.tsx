'use client'

import { trackCta } from '@/lib/analytics'
import { useState } from 'react'

export function Waitlist() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    // trackCta({
    //   event: 'submit',
    //   label: 'waitlist-join',
    //   location: 'waitlist-section',
    //   value: email,
    // })
    // Simulate API call
    setTimeout(() => {
      ;(async () => {
        try {
          const response = await fetch('/api/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          })
          if (response.ok) {
            setIsSubmitted(true)
          } else {
            const data = await response.json()
            setError(data.error || 'Something went wrong')
          }
        } catch (error) {
          setError('Something went wrong')
        } finally {
          setIsLoading(false)
        }
      })()
    }, 1000) // Simulate network delay
  }

  return (
    <section id="waitlist" className="py-24 bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl font-bold mb-4">Join the Waitlist</h2>
        <p className="text-lg text-gray-400 mb-8">
          Be the first to know when we launch and get exclusive access to early bird pricing.
        </p>
        {isSubmitted ? (
          <p className="text-green-400">Thanks for joining!</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-grow px-4 py-3 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-sf-primary"
              required
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-sf-primary hover:bg-sf-accent text-sf-background px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? 'Joining...' : 'Join Waitlist'}
            </button>
          </form>
        )}
        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>
    </section>
  )
}
