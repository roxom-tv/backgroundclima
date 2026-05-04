'use client';

import { motion } from 'framer-motion';

export default function BrandDisplay() {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="brand-display"
        >
            <div className="brand-icon">∞</div>
            <span className="brand-text">ROXOM.TV</span>
        </motion.div>
    );
}
