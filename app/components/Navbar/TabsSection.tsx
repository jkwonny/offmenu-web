import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchParams } from "next/navigation";

export const TabsSection = () => {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const isExplorePage = pathname === '/explore';
    const isManagePage = pathname === '/manage/dashboard';
    const view = searchParams.get('view');

    if (!isExplorePage && !isManagePage) return null;

    return (
        <div className="flex rounded-full border border-[#06048D] overflow-hidden">
            <Link
                href={isExplorePage ? "/explore?view=spaces" : "/manage/dashboard?view=spaces"}
                className={`px-6 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${!view || view === 'spaces'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Spaces
            </Link>
            <Link
                href={isExplorePage ? "/explore?view=popups" : "/manage/dashboard?view=popups"}
                className={`px-6 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${view === 'popups'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                Pop-ups
            </Link>
        </div>
    );
}