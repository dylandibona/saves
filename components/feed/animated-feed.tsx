'use client'

import { motion, type Variants } from 'framer-motion'

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

export function AnimatedFeed({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="divide-y divide-white/[0.06]"
    >
      {children}
    </motion.div>
  )
}

export function AnimatedFeedItem({ children }: { children: React.ReactNode }) {
  return (
    <motion.div variants={item} transition={{ duration: 0.32, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}
