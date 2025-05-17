import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";

export const TabsSection = () => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isExplorePage = pathname === '/explore';
    const view = searchParams.get('view');

    if (!isExplorePage) return null;

    return (
        <div className="flex overflow-hidden rounded-full">
            <Link
                href="/explore?view=spaces"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${!view || view === 'spaces'
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Spaces
            </Link>
            <Link
                href="/explore?view=popups"
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${view === 'popups'
                    ? 'bg-black text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Pop-ups
            </Link>
        </div>
    );
}