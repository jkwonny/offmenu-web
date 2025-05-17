export const TabsSkeletonLoader = () => {
    return (
        <div className="flex rounded-lg overflow-hidden shadow-sm w-full max-w-[200px] mx-auto">
            <div className="px-3 md:px-6 py-2 bg-gray-200 animate-pulse w-full" />
            <div className="px-3 md:px-6 py-2 bg-gray-200 animate-pulse w-full" />
        </div>
    );
}