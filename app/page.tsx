"use client";

import { useRouter } from "next/navigation";
import { useEventDetails } from "./context/EventContext";
import NavBar from "./components/NavBar";

const options = [
  {
    title: "Pop Up",
    description: "Temporary event spaces for innovative concepts",
    type: "Pop Up",
  },
  {
    title: "Birthday",
    description: "Celebrate your special day in style",
    type: "Birthday",
  },
  {
    title: "Corporate",
    description: "Professional spaces for business gatherings",
    type: "Corporate",
  },
  {
    title: "Wedding",
    description: "Create magical memories for your special day",
    type: "Wedding",
  },
];

export default function Home() {
  const router = useRouter();
  const { setEventDetails } = useEventDetails();

  const handleOptionClick = (type: string) => {
    setEventDetails(prev => ({
      ...prev,
      type: type as any
    }));
    router.push(`/booking/step1`);
  };

  return (
    <main className="min-h-screen bg-[#FFF9F5]">
      <NavBar />

      {/* Main Content */}
      <div className="max-w-5xl mx-auto p-8 pt-16">
        <h1 className="text-4xl md:text-5xl font-bold text-amber-950 mb-4 text-center">
          Find the perfect venue for your next occasion
        </h1>
        <p className="text-lg text-amber-800 mb-12 text-center max-w-3xl mx-auto">
          OffMenu helps you discover and book unique venues tailored to your specific needs
        </p>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {options.map((option) => (
            <div
              key={option.type}
              onClick={() => handleOptionClick(option.type)}
              className="p-8 bg-white rounded-xl shadow-sm border border-amber-100 hover:shadow-md transition-shadow cursor-pointer flex flex-col items-center text-center h-64"
            >
              <h2 className="text-2xl font-bold text-amber-950 mb-3">{option.title}</h2>
              <p className="text-amber-700 mb-6">{option.description}</p>
              <div className="mt-auto">
                <span className="inline-block px-5 py-2 bg-amber-100 text-amber-800 rounded-full">
                  Get Started
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
