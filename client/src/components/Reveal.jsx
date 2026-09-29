import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef } from "react";

export default function Reveal({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      data-reveal="true"
      style={{
        willChange: reduce ? "auto" : "transform, opacity",
      }}
      initial={
        reduce
          ? false
          : {
              opacity: 0,
              y: 24,
            }
      }
      animate={
        isInView
          ? reduce
            ? undefined
            : {
                opacity: 1,
                y: 0,
              }
          : { opacity: 0, y: 24 }
      }
      transition={{
        duration: 0.6,
        delay: isInView ? delay : 0,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}