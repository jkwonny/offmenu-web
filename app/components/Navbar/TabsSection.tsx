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
        <div className="flex rounded-full border border-[#06048D] overflow-hidden max-w-fit mx-auto">
            <Link
                href={isExplorePage ? "/explore?view=spaces" : "/manage/dashboard?view=spaces"}
                className={`py-1.5 px-2 sm:px-3 md:px-6 md:py-1.5 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${!view || view === 'spaces'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                <span className="block sm:hidden">Spaces</span>
                <span className="hidden sm:block">Spaces</span>
            </Link>
            <Link
                href={isExplorePage ? "/explore?view=popups" : "/manage/dashboard?view=popups"}
                className={`py-1.5 px-2 sm:px-3 md:px-6 md:py-1.5 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${view === 'popups'
                    ? 'bg-[#06048D] text-white'
                    : 'bg-white text-black'
                    }`}
            >
                <span className="block sm:hidden">Pop-ups</span>
                <span className="hidden sm:block">Pop-ups</span>
            </Link>
        </div>
    );
}