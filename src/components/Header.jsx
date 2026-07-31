import { Search } from 'lucide-react';

const Header = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-20 px-6 md:px-8 flex items-center justify-between sticky top-0 z-30">
      
      {/* Search Bar - hidden on very small screens */}
      <div className="hidden sm:flex items-center bg-gray-50 rounded-full px-4 py-2.5 w-64 border border-gray-100 focus-within:border-accent/30 focus-within:ring-2 focus-within:ring-accent/10 transition-all">
        <Search size={18} className="text-gray-400 mr-2" />
        <input 
          type="text" 
          placeholder="Іздеу..." 
          className="bg-transparent border-none outline-none text-sm w-full text-gray-700 placeholder-gray-400"
        />
      </div>

      <div className="flex-1 sm:hidden">
        {/* Mobile Spacer */}
      </div>

      {/* Right side: Author Name */}
      <div className="flex items-center gap-6">
        <span className="text-sm font-semibold text-accent hidden sm:block bg-accent/10 px-4 py-2 rounded-full border border-accent/20 shadow-sm backdrop-blur-sm transition-all hover:bg-accent/20 hover:scale-105">
          Ерпаизова Куланда Едиловна
        </span>
      </div>
    </header>
  );
};

export default Header;
