'use client'

import React, { forwardRef } from 'react'
import { Check } from 'lucide-react'

export interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  id?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked = false, onCheckedChange, disabled = false, className = '', id, ...props }, ref) => {
    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <label
          htmlFor={id}
          className={`
            flex h-4 w-4 items-center justify-center rounded border transition-colors cursor-pointer
            ${checked 
              ? 'bg-blue-600 border-blue-600 text-white' 
              : 'border-gray-300 hover:border-gray-400'
            }
            ${disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-50'
            }
          `}
        >
          {checked && <Check className="h-3 w-3" />}
        </label>
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'
