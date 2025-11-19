"use client";

import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { fadeInUp } from "./page-transition";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedCardProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={fadeInUp}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={{ delay } as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      whileHover={{ y: -4, transition: { duration: 0.2 } as any }}
    >
      <Card className={className}>{children}</Card>
    </motion.div>
  );
}

