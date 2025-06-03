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

    const isSpacesActive = !view || view === 'spaces';
    const isPopupsActive = view === 'popups';

    return (
        <div className="relative flex rounded-full border border-[#06048D] overflow-hidden max-w-fit mx-auto">
            {/* Animated background indicator */}
            <div 
                className={`absolute top-0 bottom-0 bg-[#06048D] transition-all duration-300 ease-in-out rounded-full ${
                    isSpacesActive 
                        ? 'left-0 w-1/2' 
                        : 'left-1/2 w-1/2'
                }`}
            />
            
            <Link
                href={isExplorePage ? "/explore?view=spaces" : "/manage/dashboard?view=spaces"}
                className={`relative z-10 py-1.5 px-2 sm:px-3 md:px-6 md:py-1.5 text-xs md:text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap transform hover:scale-105 ${
                    isSpacesActive
                        ? 'text-white'
                        : 'text-black hover:text-[#06048D]'
                }`}
            >
                <span className="block sm:hidden">Spaces</span>
                <span className="hidden sm:block">Spaces</span>
            </Link>
            <Link
                href={isExplorePage ? "/explore?view=popups" : "/manage/dashboard?view=popups"}
                className={`relative z-10 py-1.5 px-2 sm:px-3 md:px-6 md:py-1.5 text-xs md:text-sm font-medium transition-all duration-300 ease-in-out whitespace-nowrap transform hover:scale-105 ${
                    isPopupsActive
                        ? 'text-white'
                        : 'text-black hover:text-[#06048D]'
                }`}
            >
                <span className="block sm:hidden">Pop-ups</span>
                <span className="hidden sm:block">Pop-ups</span>
            </Link>
        </div>
    );
}