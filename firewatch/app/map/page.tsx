import FireMap from '../components/FireMap'

export const metadata = {
    title: 'Fire Map | FireWatch',
    description: 'Interactive fire detection map with NASA FIRMS data',
}

export default function MapPage() {
    return (
        <main className="min-h-[calc(100vh-56px)] bg-gray-100">
            <div className="max-w-[1800px] mx-auto px-4 py-6">
                <header className="mb-6">
                    <h1 className="font-mono text-2xl font-semibold text-gray-900">
                        Interactive Disaster Map
                    </h1>
                    <p className="font-mono text-sm text-gray-600 mt-1">
                        Real-time Disaster detections from NASA FIRMS satellite
                        data
                    </p>
                </header>
                <FireMap />
            </div>
        </main>
    )
}
