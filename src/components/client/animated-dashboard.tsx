"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ease: [0.22, 1, 0.36, 1] as any,
    },
  },
};

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  colorClass?: string;
  delay?: number;
}

export function AnimatedKPICard({ title, value, icon, colorClass = "border-l-primary", delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={{ delay } as any}
      whileHover={{ y: -4, scale: 1.02 }}
      className="cursor-default"
    >
      <Card className={`group relative overflow-hidden ${colorClass} border-l-4 hover:shadow-lg transition-all duration-300`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="relative flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <motion.div
            whileHover={{ rotate: 360, scale: 1.2 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ duration: 0.6 } as any}
          >
            {icon}
          </motion.div>
        </CardHeader>
        <CardContent className="relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transition={{ delay: delay + 0.2, duration: 0.5 } as any}
            className="text-2xl font-bold text-foreground"
          >
            {value}
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
}

export function AnimatedSection({ children, delay = 0 }: AnimatedSectionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={itemVariants}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={{ delay } as any}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGrid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </motion.div>
  );
}

interface AnimatedButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function AnimatedButton({ children, href, onClick, variant = "default", size = "default" }: AnimatedButtonProps) {
  const buttonContent = (
    <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.05 }}>
      <Button variant={variant} size={size} onClick={onClick}>
        {children}
      </Button>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{buttonContent}</Link>;
  }

  return buttonContent;
}

