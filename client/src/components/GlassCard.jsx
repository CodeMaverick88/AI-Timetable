import { motion } from "framer-motion";

export default function GlassCard({
  children,
  className = "",
}) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      whileHover={{
        y: -3,
        transition: {
          duration: 0.2,
        },
      }}
    >
      {children}
    </motion.div>
  );
}