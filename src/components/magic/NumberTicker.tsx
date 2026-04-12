import { useEffect, useMemo, useState } from "react"
import { useMotionValue, useSpring } from "framer-motion"

type NumberTickerProps = {
  value: number
  className?: string
  format?: (value: number) => string
}

export const NumberTicker = ({ value, className, format }: NumberTickerProps) => {
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, {
    damping: 24,
    stiffness: 140
  })
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayValue(latest)
    })
    return () => unsubscribe()
  }, [springValue])

  const formattedValue = useMemo(() => {
    const currentValue = Number.isFinite(displayValue) ? displayValue : 0
    if (format) {
      return format(currentValue)
    }
    return Math.round(currentValue).toString()
  }, [displayValue, format])

  return <span className={className}>{formattedValue}</span>
}
