interface App {
	fileKey: string
}

interface Feature {
	id: number
	title: string
	images: {
		nodeId: string
		embedUrl: string
	}[]
	notes: {
		nodeId: string
		embedUrl: string
		content: string
	}[]
	highEstimate: number
	lowEstimate: number
}