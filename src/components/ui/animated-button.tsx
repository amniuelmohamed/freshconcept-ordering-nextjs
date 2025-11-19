"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";

export const AnimatedButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, ...props }, ref) => {
    return (
      <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
        <Button ref={ref} {...props}>
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

