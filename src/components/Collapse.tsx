import { motion, AnimatePresence } from "motion/react"

type CollapseProps = {
	children: React.ReactNode;
	open: boolean;
	className?: string;
	keyName?: string;
}

export const Collapse = ({ children, open, className, keyName }: CollapseProps) => {
	return (
		<>
			{open && (
				<motion.div
					key={keyName}
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					exit={{ opacity: 0, height: 0 }}
					transition={{ duration: 0.3 }}
					className={className}
				>
					{children}
				</motion.div>
			)}
		</>
	)
}

/**
 * This component is used to collapse a single child element.
 */
export const CollapseIsolated = (props: CollapseProps) => {
	return (
		<AnimatePresence>
			<Collapse {...props} />
		</AnimatePresence>
	)
}
