import { motion } from "framer-motion";

export default function GlassCard({ children, className = "", hover = true }) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      data-surface="glass"
      whileTap={{ scale: 0.98 }}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 20px 48px rgba(99, 102, 241, 0.2)",
              transition: {
                duration: 0.3,
              },
            }
          : {}
      }
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}