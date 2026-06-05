'use client'

import { useState, useEffect } from 'react'

export function CurrentMonth() {
  const [label, setLabel] = useState('')

  useEffect(() => {
    setLabel(
      new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    )
  }, [])

  return label ? <span className="capitalize">{label}</span> : null
}
