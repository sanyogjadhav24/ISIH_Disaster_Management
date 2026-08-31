"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/",label: "Dashboard"  },
  { href: "/map" , label: "Disaster Map"},
  { href: "/stats" , label: "Statistics"},
    { href: "/predict",label: "Predict" },
];


export default function Navigation() {

    const pathname = usePathname();


    return (
<nav className="w-full bg-gray-900 border-b border-gray-800">
			<div className="max-w-[1600px] mx-auto px-6">
				<div className="flex items-center justify-between h-14">
					<Link
						href="/"
						className="flex items-center gap-2 text-gray-100 hover:text-white transition-colors"
					>
						<svg
							className="w-6 h-6 text-red-500"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fillRule="evenodd"
								d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
								clipRule="evenodd"
							/>
						</svg>
						<span className="font-mono text-sm font-semibold uppercase tracking-wider">
							FireWatch
						</span>
					</Link>

					<div className="flex items-center gap-1">
						{navItems.map((item) => {
							const isActive = pathname === item.href
							return (
								<Link
									key={item.href}
									href={item.href}
									className={`px-4 py-2 rounded-md font-mono text-sm uppercase tracking-wide transition-all duration-200 ${
										isActive
											? 'bg-gray-800 text-white'
											: 'text-gray-400 hover:text-white hover:bg-gray-800/50'
									}`}
								>
									{item.label}
								</Link>
							)
						})}
					</div>
				</div>
			</div>
		</nav>

    )
}
