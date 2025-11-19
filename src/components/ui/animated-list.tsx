"use client";

import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ease: [0.22, 1, 0.36, 1] as any,
    },
  },
};

interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ x: 4, scale: 1.01 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={{ duration: 0.2 } as any}
      className={className}
    >
      {children}
    </motion.div>
  );
}

